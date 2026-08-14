const User = require("../models/dushani-User");
const DonorProfile = require("../models/dushani-DonorProfile");
const RecipientProfile = require("../models/dushani-RecipientProfile");
const NGOProfile = require("../models/dushani-NGOProfile");
const VolunteerProfile = require("../models/dushani-VolunteerProfile");

const ROLE_MODEL = {
  DONOR: DonorProfile,
  RECIPIENT: RecipientProfile,
  NGO: NGOProfile,
  VOLUNTEER: VolunteerProfile,
};

async function getMergedProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("USER_NOT_FOUND");

  const RoleModel = ROLE_MODEL[user.role];
  const roleProfile = RoleModel
    ? await RoleModel.findOne({ userId: user._id })
    : null;

  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    profilePicture: user.profilePicture,
    address: user.address,
    district: user.district,
    city: user.city,
    ...(roleProfile ? roleProfile.toObject() : {}),
  };
}

async function updateMergedProfile(userId, updates) {
  const user = await User.findById(userId);
  if (!user) throw new Error("USER_NOT_FOUND");

  const USER_FIELDS = [
    "fullName", "email", "phoneNumber",
    "profilePicture", "address", "district", "city",
  ];

  const userUpdates = {};
  const roleUpdates = {};

  for (const [key, value] of Object.entries(updates)) {
    if (USER_FIELDS.includes(key)) userUpdates[key] = value;
    else roleUpdates[key] = value;
  }

  if (Object.keys(userUpdates).length) {
    await User.findByIdAndUpdate(userId, userUpdates);
  }

  const RoleModel = ROLE_MODEL[user.role];
  if (RoleModel && Object.keys(roleUpdates).length) {
    await RoleModel.findOneAndUpdate({ userId: user._id }, roleUpdates);
  }

  return getMergedProfile(userId);
}

module.exports = { getMergedProfile, updateMergedProfile };