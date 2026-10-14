// Assignment endpoints for volunteers, plus a development-only matching preview.
// Owner: Dilshara

const mongoose = require("mongoose");
const Assignment = require("../models/dilshara-Assignment");
const Donation = require("../models/kaveesha-Donation");
const FoodRequest = require("../models/dushani-foodRequestModel");
const User = require("../models/dushani-User");
const RecipientProfile = require("../models/dushani-RecipientProfile");
const {
  resolveDonationPickupPoint,
  resolveRecipientDropoffPoint,
} = require("../utils/dilshara-locationResolver.util");
const {
  ACTIVE_ASSIGNMENT_STATUSES,
  isMatchingPreviewEnabled,
} = require("../config/dilshara-matching.config");
const {
  changeAssignmentStatus,
  AssignmentError,
} = require("../services/dilshara-assignmentLifecycle.service");
const {
  rankVolunteersForDelivery,
  assignSuggestedVolunteerForDelivery,
} = require("../services/dilshara-assignmentAllocation.service");

// Step 12 + 13 — what the volunteer app and the map need alongside the
// assignment itself: the route stage navigation should follow, the pickup and
// drop-off points with their coordinates and honesty flags, and the recipient's
// contact details once the volunteer has actually committed to the delivery.
// An ASSIGNED row is still an unanswered offer, so it must not carry the
// number: the request model keeps contactNumber private until someone commits
// to delivering, and the commitment on the volunteer's side is accepting the
// assignment. The gate lives here, on the server — the app only renders what
// comes back.
async function recipientName(recipientId, recipient) {
  if (recipient && recipient.fullName) return recipient.fullName;
  // Organisations keep their name on the recipient profile (same convention
  // the request board uses).
  const profile = await RecipientProfile.findOne({ userId: recipientId })
    .select("organizationName")
    .lean();
  return (profile && profile.organizationName) || null;
}

// The leg of the delivery the volunteer is currently on. Before pickup is
// complete the target is the donor; IN_TRANSIT means the food is on board and
// the only remaining leg is to the recipient, so the pickup route must not be
// shown any more. COMPLETE/CANCELLED carry no active route at all.
const ROUTE_STAGE_BY_STATUS = {
  ASSIGNED: "TO_PICKUP",
  ACCEPTED: "TO_PICKUP",
  PICKING_UP: "TO_PICKUP",
  IN_TRANSIT: "TO_DROPOFF",
  DELIVERED: "COMPLETE",
  CANCELLED: "CANCELLED",
};

// A route waypoint the map can draw. Coordinates only ever come from the
// location resolver — a district centre is an area, never a doorstep, so it is
// flagged exact:false. When nothing resolvable exists the point keeps its raw
// label with null coordinates, and the app shows "location unavailable"
// instead of a made-up pin.
function toRoutePoint(resolved, fallbackLabel) {
  const label = (resolved && resolved.label) || fallbackLabel || null;
  if (!resolved && !label) return null;

  return {
    label,
    district: (resolved && resolved.district) || null,
    exact: Boolean(resolved && resolved.exact === true),
    latitude: resolved && Number.isFinite(resolved.latitude) ? resolved.latitude : null,
    longitude: resolved && Number.isFinite(resolved.longitude) ? resolved.longitude : null,
  };
}

async function buildDeliveryView(assignment) {
  const status = assignment.status;
  const stage = ROUTE_STAGE_BY_STATUS[status] || null;

  const donation = assignment.donationId;
  const pickup = toRoutePoint(
    resolveDonationPickupPoint(donation),
    donation && (donation.pickupAddress || donation.pickupDistrict || null)
  );

  // Legacy assignments genuinely have no request attached.
  if (!assignment.requestId) {
    return { status, stage, pickup, dropoff: null, recipientContact: null };
  }

  const request = await FoodRequest.findById(assignment.requestId)
    .select("location recipient contactNumber")
    .lean();
  if (!request) {
    return { status, stage, pickup, dropoff: null, recipientContact: null };
  }

  const recipient = await User.findById(request.recipient)
    .select("fullName district city address")
    .lean();

  const dropoff = toRoutePoint(
    resolveRecipientDropoffPoint(request, recipient),
    request.location || null
  );

  let recipientContact = null;
  if (status !== "ASSIGNED" && request.contactNumber) {
    recipientContact = {
      name: await recipientName(request.recipient, recipient),
      phone: request.contactNumber,
    };
  }

  return { status, stage, pickup, dropoff, recipientContact };
}

// RESQ-198
exports.getCurrentAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findOne({
      volunteerId: req.user.id,
      status: { $in: ACTIVE_ASSIGNMENT_STATUSES },
    }).populate("donationId");

    if (!assignment) {
      return res.status(200).json({ success: true, assignment: null, delivery: null });
    }

    return res.status(200).json({
      success: true,
      assignment,
      delivery: await buildDeliveryView(assignment),
    });
  } catch (err) {
    console.error("getCurrentAssignment error:", err);
    return res.status(500).json({ success: false, message: "Could not load assignment." });
  }
};

// RESQ-202 — all rules live in the lifecycle service.
exports.updateAssignmentStatus = async (req, res) => {
  try {
    const { assignment, requestSync } = await changeAssignmentStatus({
      assignmentId: req.params.id,
      actorId: req.user.id,
      nextStatus: req.body.status,
    });

    return res.status(200).json({
      success: true,
      assignment,
      // Present when the move touched the linked FoodRequest (IN_TRANSIT,
      // DELIVERED): SYNCED / SKIPPED / FAILED. FAILED means the assignment
      // change stands and the request update needs recovery — reason in the
      // server log.
      ...(requestSync ? { requestSync } : {}),
    });
  } catch (err) {
    if (err instanceof AssignmentError) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
    console.error("updateAssignmentStatus error:", err);
    return res.status(500).json({ success: false, message: "Could not update status." });
  }
};

// RESQ-203
exports.getAssignmentProgressForDonation = async (req, res) => {
  try {
    const { donationId } = req.params;

    const assignment = await Assignment.findOne({ donationId }).sort({ createdAt: -1 });

    if (!assignment) {
      return res.status(200).json({ success: true, progress: null });
    }

    return res.status(200).json({
      success: true,
      progress: {
        status: assignment.status,
        assignedAt: assignment.assignedAt,
        acceptedAt: assignment.acceptedAt,
        pickedUpAt: assignment.pickedUpAt,
        inTransitAt: assignment.inTransitAt,
        deliveredAt: assignment.deliveredAt,
      },
    });
  } catch (err) {
    console.error("getAssignmentProgressForDonation error:", err);
    return res.status(500).json({ success: false, message: "Could not load progress." });
  }
};

// Dashboard totals
exports.getAssignmentSummary = async (req, res) => {
  try {
    const delivered = await Assignment.find({
      volunteerId: req.user.id,
      status: "DELIVERED",
    }).select("acceptedAt deliveredAt");

    const totalMs = delivered.reduce((sum, a) => {
      if (!a.acceptedAt || !a.deliveredAt) return sum;
      return sum + (a.deliveredAt.getTime() - a.acceptedAt.getTime());
    }, 0);

    return res.status(200).json({
      success: true,
      summary: {
        completedCount: delivered.length,
        hoursContributed: Math.round((totalMs / 3600000) * 10) / 10,
      },
    });
  } catch (err) {
    console.error("getAssignmentSummary error:", err);
    return res.status(500).json({ success: false, message: "Could not load summary." });
  }
};

// DEVELOPMENT ONLY — shows who the engine would pick and why, WITHOUT creating
// an assignment or sending any notification. Disabled in production; only the
// donor who owns the donation may call it; returns ids, scores and reasons only.
exports.previewMatching = async (req, res) => {
  try {
    if (!isMatchingPreviewEnabled()) {
      return res.status(404).json({ success: false, message: "Not found." });
    }

    const { donationId } = req.params;
    if (!mongoose.isValidObjectId(donationId)) {
      return res.status(400).json({ success: false, code: "INVALID_DONATION_ID", message: "Invalid donation id." });
    }

    const donation = await Donation.findById(donationId).select("donor").lean();
    if (!donation) {
      return res.status(404).json({ success: false, code: "DONATION_NOT_FOUND", message: "Donation not found." });
    }
    if (String(donation.donor) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "This donation isn't yours." });
    }

    const result = await rankVolunteersForDelivery(donationId);
    if (!result.ok) {
      return res.status(422).json({ success: false, code: result.code, message: result.message });
    }

    const { context } = result;
    return res.status(200).json({
      success: true,
      delivery: {
        donationId: context.donationId,
        requestId: context.requestId,
        urgent: context.urgent,
        urgentReasons: context.urgentReasons,
        window: {
          start: context.window.start.toISOString(),
          end: context.window.end.toISOString(),
          source: context.window.source,
        },
        pickup: { district: context.pickup.district, precision: context.pickup.precision },
        dropoff: { district: context.dropoff.district, precision: context.dropoff.precision },
      },
      eligibleCount: result.ranked.length,
      rejectedCount: result.rejected.length,
      ranked: result.ranked.map((entry) => ({
        rank: entry.rank,
        volunteerId: entry.userId,
        score: entry.score,
        breakdown: entry.breakdown,
        reasons: entry.reasons,
        routeDistanceKm: entry.routeDistanceKm,
        locationPrecision: entry.locationPrecision,
      })),
      rejected: result.rejected.map((entry) => ({
        volunteerId: entry.userId,
        reasons: entry.reasons,
      })),
    });
  } catch (err) {
    console.error("previewMatching error:", err);
    return res.status(500).json({ success: false, message: "Could not preview matching." });
  }
};

// Donor-facing volunteer suggestions for a donation already linked to an
// accepted request. Unlike the development preview, this endpoint is part of
// the normal donor flow and only returns display-safe volunteer data.
exports.getVolunteerSuggestions = async (req, res) => {
  try {
    const { donationId } = req.params;
    if (!mongoose.isValidObjectId(donationId)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_DONATION_ID",
        message: "Invalid donation id.",
      });
    }

    const donation = await Donation.findById(donationId).select("donor").lean();
    if (!donation) {
      return res.status(404).json({
        success: false,
        code: "DONATION_NOT_FOUND",
        message: "Donation not found.",
      });
    }
    if (String(donation.donor) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "This donation isn't yours." });
    }

    const result = await rankVolunteersForDelivery(donationId);
    if (!result.ok) {
      return res.status(422).json({
        success: false,
        code: result.code,
        message: result.message,
      });
    }

    return res.status(200).json({
      success: true,
      donation: {
        donationId: result.context.donationId,
        requestId: result.context.requestId,
        foodType: result.context.foodType,
        urgent: result.context.urgent,
        pickupDistrict: result.context.pickup.district || null,
        dropoffDistrict: result.context.dropoff.district || null,
      },
      eligibleCount: result.ranked.length,
      volunteers: result.ranked.map((entry) => ({
        rank: entry.rank,
        volunteerId: entry.userId,
        displayName: entry.volunteer.displayName,
        vehicleType: entry.volunteer.vehicleType,
        preferredDeliveryArea: entry.volunteer.preferredDeliveryArea,
        score: entry.score,
        breakdown: entry.breakdown,
        reasons: entry.reasons,
        routeDistanceKm: entry.routeDistanceKm,
        locationPrecision: entry.locationPrecision,
      })),
    });
  } catch (error) {
    console.error("getVolunteerSuggestions error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not load volunteer suggestions.",
    });
  }
};

// Creates an assignment only for a volunteer selected from the donor-facing
// suggestions. Eligibility is recalculated by the allocation service.
exports.assignSuggestedVolunteer = async (req, res) => {
  try {
    const { donationId } = req.params;
    const { volunteerId } = req.body;

    if (!mongoose.isValidObjectId(donationId) || !mongoose.isValidObjectId(volunteerId)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_ID",
        message: "A valid donation and volunteer are required.",
      });
    }

    const donation = await Donation.findById(donationId).select("donor").lean();
    if (!donation) {
      return res.status(404).json({
        success: false,
        code: "DONATION_NOT_FOUND",
        message: "Donation not found.",
      });
    }
    if (String(donation.donor) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "This donation isn't yours." });
    }

    const outcome = await assignSuggestedVolunteerForDelivery(donationId, volunteerId);
    if (outcome.status === "ASSIGNED") {
      return res.status(201).json({ success: true, assignment: outcome.assignment });
    }
    if (outcome.status === "ALREADY_ASSIGNED") {
      return res.status(409).json({
        success: false,
        code: outcome.status,
        message: "A volunteer is already assigned to this delivery.",
        assignmentId: outcome.assignmentId || null,
      });
    }
    if (outcome.status === "VOLUNTEER_BUSY") {
      return res.status(409).json({
        success: false,
        code: outcome.status,
        message: "That volunteer has just received another delivery. Refresh suggestions and choose again.",
      });
    }
    if (outcome.status === "VOLUNTEER_NOT_ELIGIBLE") {
      return res.status(422).json({
        success: false,
        code: outcome.status,
        message: "That volunteer is no longer eligible. Refresh suggestions and choose again.",
      });
    }
    return res.status(422).json({
      success: false,
      code: outcome.code || outcome.status,
      message: outcome.message || "This delivery cannot be assigned right now.",
    });
  } catch (error) {
    console.error("assignSuggestedVolunteer error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not assign the selected volunteer.",
    });
  }
};

// TEMPORARY TEST ENDPOINT — delete once real matching creates assignments.
exports.createTestAssignment = async (req, res) => {
  try {
    if (!isMatchingPreviewEnabled()) {
      return res.status(404).json({ success: false, message: "Not found." });
    }

    const { donationId } = req.body;
    if (!donationId) {
      return res.status(400).json({ success: false, message: "donationId is required." });
    }

    const assignment = await Assignment.create({
      donationId,
      volunteerId: req.user.id,
      status: "ASSIGNED",
    });

    return res.status(201).json({ success: true, assignment });
  } catch (err) {
    console.error("createTestAssignment error:", err);
    return res.status(500).json({ success: false, message: "Could not create test assignment." });
  }
};