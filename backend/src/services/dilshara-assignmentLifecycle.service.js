// Assignment status changes and everything that must follow from them.
// The volunteer's own change always succeeds or fails on its own; request sync
// and notifications afterwards are best-effort and only logged if they fail.
//
// Status mapping (step 11) — assignment stage -> linked FoodRequest -> event:
//   ACCEPTED    -> (request stays MATCHED) -> ASSIGNMENT_ACCEPTED  [donor, recipient]
//   IN_TRANSIT  -> DISPATCHED              -> DELIVERY_STARTED    [recipient]
//   DELIVERED   -> FULFILLED               -> DELIVERY_COMPLETED  [donor, recipient, volunteer]
//   ASSIGNED -> CANCELLED (declined)       -> ASSIGNMENT_DECLINED [donor]
//   ACCEPTED / PICKING_UP -> CANCELLED     -> ASSIGNMENT_CANCELLED [donor, recipient]
//   recipient cancels the request          -> assignment CANCELLED (SYSTEM)
//                                          -> ASSIGNMENT_CANCELLED [volunteer]
//                                          -> REQUEST_CANCELLED    [donor]
// A failed request sync or notification never changes the assignment back; a
// sync failure rides back to the caller as requestSync and is logged.


const mongoose = require("mongoose");
const Assignment = require("../models/dilshara-Assignment");
const Donation = require("../models/kaveesha-Donation");
const FoodRequest = require("../models/dushani-foodRequestModel");
const { ACTIVE_ASSIGNMENT_STATUSES } = require("../config/dilshara-matching.config");
const { updateFoodRequestStatus } = require("./dushani-updateRequestStatusService");
const { notify } = require("./amasha-notificationService");
const { findAndAssignVolunteer } = require("./dilshara-assignmentAllocation.service");

// Only these forward moves are allowed.
const VALID_TRANSITIONS = {
  ASSIGNED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PICKING_UP", "CANCELLED"],
  PICKING_UP: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

const STATUS_TIMESTAMP_FIELD = {
  ACCEPTED: "acceptedAt",
  PICKING_UP: "pickedUpAt",
  IN_TRANSIT: "inTransitAt",
  DELIVERED: "deliveredAt",
  CANCELLED: "cancelledAt",
};

class AssignmentError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "AssignmentError";
    this.statusCode = statusCode;
  }
}

// Moves the request along after the volunteer's own change succeeded, and
// returns what happened (SYNCED / SKIPPED / FAILED) instead of throwing: the
// assignment change is already saved either way.
// Ownership is enforced on the assignment here; documentation note for the
// request-service owner (Dushani): mayAdvance() in that service currently
// returns true for ANY volunteer, so the request-status endpoint itself still
// lets any volunteer advance any request until it checks who holds the
// assignment.
async function syncRequestStatus(assignment, status) {
  if (!assignment.requestId) return { status: "SKIPPED" }; // legacy assignment, nothing to sync
  try {
    await updateFoodRequestStatus({
      actorId: assignment.volunteerId,
      role: "VOLUNTEER",
      requestId: assignment.requestId,
      status,
    });
    return { status: "SYNCED" };
  } catch (error) {
    console.error(
      `Request sync failed (assignment ${assignment._id}, request ${assignment.requestId}, target ${status}): ${error.message}`
    );
    return { status: "FAILED", requestId: String(assignment.requestId), message: error.message };
  }
}

async function loadParties(assignment) {
  const [donation, request] = await Promise.all([
    Donation.findById(assignment.donationId).select("donor foodType pickupAddress").lean(),
    assignment.requestId
      ? FoodRequest.findById(assignment.requestId).select("recipient foodType").lean()
      : null,
  ]);

  return {
    donorId: donation?.donor,
    recipientId: request?.recipient,
    data: {
      assignmentId: assignment._id,
      volunteerId: assignment.volunteerId,
      donationId: assignment.donationId,
      requestId: assignment.requestId || undefined,
      foodType: donation?.foodType,
      pickupAddress: donation?.pickupAddress,
    },
  };
}

// Never throws: the status change is already saved. Returns the request-sync
// outcome when the move had one (IN_TRANSIT / DELIVERED), else undefined.
async function runSideEffects(assignment, previousStatus) {
  let requestSync;
  try {
    const { donorId, recipientId, data } = await loadParties(assignment);
    let rematch = false;

    switch (assignment.status) {
      case "ACCEPTED":
        await notify("ASSIGNMENT_ACCEPTED", [donorId, recipientId], data);
        break;

      case "IN_TRANSIT":
        requestSync = await syncRequestStatus(assignment, "DISPATCHED");
        if (assignment.requestId) await notify("DELIVERY_STARTED", [recipientId], data);
        break;

      case "DELIVERED":
        requestSync = await syncRequestStatus(assignment, "FULFILLED");
        if (assignment.requestId) {
          await notify("DELIVERY_COMPLETED", [donorId, recipientId, assignment.volunteerId], data);
        }
        break;

      case "CANCELLED":
        if (previousStatus === "ASSIGNED") {
          // The volunteer declined the offer.
          await notify("ASSIGNMENT_DECLINED", [donorId], data);
        } else {
          await notify("ASSIGNMENT_CANCELLED", [donorId, recipientId], data);
        }

        // Only re-match while the food is certainly still with the donor. A
        // cancel from PICKING_UP may leave the volunteer already holding the
        // food, so dispatching a replacement risks a wasted trip: no automatic
        // re-match there. Instead the donor and recipient were just told the
        // assignment was cancelled and coordinate the handover themselves; the
        // delivery stays cancelled rather than silently re-assigned.
        rematch = previousStatus === "ASSIGNED" || previousStatus === "ACCEPTED";
        if (!rematch) {
          console.warn(
            `Assignment ${assignment._id} cancelled at ${previousStatus}: ` +
              `not re-matching donation ${assignment.donationId} automatically.`
          );
        }
        break;

      default:
        break;
    }

    // The volunteer is now excluded for this donation, so this cannot loop:
    // every decline removes one candidate. Returns null when nobody is left,
    // or when the request is no longer waiting (e.g. the recipient cancelled).
    if (rematch) {
      await findAndAssignVolunteer(String(assignment.donationId));
    }
  } catch (error) {
    console.error("Assignment side effects failed:", error);
  }
  return requestSync;
}

async function changeAssignmentStatus({ assignmentId, actorId, nextStatus }) {
  if (!mongoose.isValidObjectId(assignmentId)) {
    throw new AssignmentError("Assignment not found.", 404);
  }

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new AssignmentError("Assignment not found.", 404);

  // Ownership is checked before anything is changed.
  if (String(assignment.volunteerId) !== String(actorId)) {
    throw new AssignmentError("This assignment isn't yours.", 403);
  }

  if (!nextStatus) {
    throw new AssignmentError("A status is required.", 400);
  }

  const previousStatus = assignment.status;
  const allowed = VALID_TRANSITIONS[previousStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new AssignmentError(`Cannot move from ${previousStatus} to ${nextStatus}.`, 400);
  }

  const set = {
    status: nextStatus,
    isActive: ACTIVE_ASSIGNMENT_STATUSES.includes(nextStatus),
  };
  const timestampField = STATUS_TIMESTAMP_FIELD[nextStatus];
  if (timestampField) set[timestampField] = new Date();
  if (nextStatus === "CANCELLED") set.cancelledBy = "VOLUNTEER";

  // Atomic: only succeeds if the status is still what we read.
  const updated = await Assignment.findOneAndUpdate(
    { _id: assignment._id, status: previousStatus },
    { $set: set },
    { returnDocument: "after" }
  );
  if (!updated) {
    throw new AssignmentError("This assignment was just updated. Refresh and try again.", 409);
  }

  const requestSync = await runSideEffects(updated, previousStatus);
  // The assignment change is the outcome; requestSync reports how the linked
  // FoodRequest update went (SYNCED / SKIPPED / FAILED, or undefined when the
  // move has no request side) so a failure can be seen and recovered.
  return { assignment: updated, requestSync };
}

// For the recipient-cancels-request case: ends any live delivery for that
// request, frees the volunteer, and tells them. No re-match (the request is
// cancelled). Called by the request-cancel service once the cancellation is
// saved. A delivery that already collected the food (IN_TRANSIT) is ended too
// — leaving it active would keep the volunteer blocked with no way to close
// it — and its notification carries the stage, so the volunteer knows the
// food is with them and the handover is coordinated manually. cancelledBy
// "SYSTEM" never counts against the volunteer in a future match.
async function cancelActiveAssignmentsForRequest(requestId) {
  if (!mongoose.isValidObjectId(requestId)) return [];

  const active = await Assignment.find({
    requestId,
    status: { $in: ACTIVE_ASSIGNMENT_STATUSES },
  });

  const cancelled = [];
  for (const assignment of active) {
    const previousStatus = assignment.status;
    const updated = await Assignment.findOneAndUpdate(
      { _id: assignment._id, status: previousStatus },
      { $set: { status: "CANCELLED", isActive: false, cancelledBy: "SYSTEM", cancelledAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!updated) continue;
    cancelled.push(updated);

    try {
      const { data } = await loadParties(updated);
      await notify("ASSIGNMENT_CANCELLED", [updated.volunteerId], { ...data, previousStatus });
    } catch (error) {
      console.error("Could not notify the volunteer about the cancellation:", error);
    }
  }
  return cancelled;
}

module.exports = {
  VALID_TRANSITIONS,
  AssignmentError,
  changeAssignmentStatus,
  cancelActiveAssignmentsForRequest,
};