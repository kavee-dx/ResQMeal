const User = require("../models/dushani-User");
const DonorProfile = require("../models/dushani-DonorProfile");
const RecipientProfile = require("../models/dushani-RecipientProfile");
const NGOProfile = require("../models/dushani-NGOProfile");
const VolunteerProfile = require("../models/dushani-VolunteerProfile");
const { sendApprovalEmail, sendRejectionEmail } = require("../utils/amasha-admin-approvalEmail");

const PROFILE_MODELS = {
  DONOR: DonorProfile,
  RECIPIENT: RecipientProfile,
  NGO: NGOProfile,
  VOLUNTEER: VolunteerProfile,
};

const VALID_STATUSES = ["PENDING", "APPROVED", "REJECTED"];

// status: "PENDING" | "APPROVED" | "REJECTED" | "ALL" | undefined (defaults to PENDING)
async function listUsers({ role, status } = {}) {
  const filter = {};

  if (role) filter.role = role;

  if (status && status !== "ALL") {
    if (VALID_STATUSES.includes(status)) filter.approvalStatus = status;
  } else if (!status) {
    filter.approvalStatus = "PENDING";
  }
  // status === "ALL" -> no approvalStatus filter at all

  const sortOrder = filter.approvalStatus === "PENDING" ? { createdAt: 1 } : { createdAt: -1 };
  const users = await User.find(filter).sort(sortOrder);

  return Promise.all(
    users.map(async (user) => {
      const ProfileModel = PROFILE_MODELS[user.role];
      const profile = ProfileModel ? await ProfileModel.findOne({ userId: user._id }) : null;
      return { user, profile };
    })
  );
}

async function getUserForReview(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("USER_NOT_FOUND");

  const ProfileModel = PROFILE_MODELS[user.role];
  const profile = ProfileModel ? await ProfileModel.findOne({ userId: user._id }) : null;

  return { user, profile };
}

async function approveUser(userId, adminId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  if (user.approvalStatus === "APPROVED") throw new Error("ALREADY_APPROVED");

  user.approvalStatus = "APPROVED";
  user.approvedAt = new Date();
  user.approvedBy = adminId;
  user.rejectionReason = undefined;
  await user.save();

  await sendApprovalEmail(user.email, user.fullName);
  return user;
}

async function rejectUser(userId, adminId, reason) {
  const user = await User.findById(userId);
  if (!user) throw new Error("USER_NOT_FOUND");

  user.approvalStatus = "REJECTED";
  user.rejectionReason = reason;
  user.approvedBy = adminId;
  await user.save();

  await sendRejectionEmail(user.email, user.fullName, reason);
  return user;
}

module.exports = { listUsers, getUserForReview, approveUser, rejectUser };