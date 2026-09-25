// Retrieval and status-update endpoints for the volunteer's Assignment.
// Owner: Dilshara

const Assignment = require("../models/dilshara-Assignment");
const { findAndAssignVolunteer } = require("../services/dilshara-assignmentAllocation.service");

const ACTIVE_STATUSES = ["ASSIGNED", "ACCEPTED", "PICKING_UP", "IN_TRANSIT"];

// Only these forward transitions are allowed — prevents skipping steps
// or moving backward.
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

// RESQ-198
exports.getCurrentAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findOne({
      volunteerId: req.user.id,
      status: { $in: ACTIVE_STATUSES },
    }).populate("donationId");

    if (!assignment) {
      return res.status(200).json({ success: true, assignment: null });
    }

    return res.status(200).json({ success: true, assignment });
  } catch (err) {
    console.error("getCurrentAssignment error:", err);
    return res.status(500).json({ success: false, message: "Could not load assignment." });
  }
};

// RESQ-202
exports.updateAssignmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status: nextStatus } = req.body;

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found." });
    }

    if (String(assignment.volunteerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: "This assignment isn't yours." });
    }

    const allowedNext = VALID_TRANSITIONS[assignment.status] || [];
    if (!allowedNext.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot move from ${assignment.status} to ${nextStatus}.`,
      });
    }

    assignment.status = nextStatus;
    const timestampField = STATUS_TIMESTAMP_FIELD[nextStatus];
    if (timestampField) assignment[timestampField] = new Date();

    await assignment.save();

    return res.status(200).json({ success: true, assignment });
  } catch (err) {
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
// TEMPORARY — lets you demo the Assignment flow before the donor
// request + AI matching flow exists. Remove once that's wired up.
exports.createTestAssignment = async (req, res) => {
  try {
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