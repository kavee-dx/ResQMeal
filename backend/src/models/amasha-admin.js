const mongoose = require("mongoose");
const { Schema } = mongoose;

const adminSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["SUPER_ADMIN"], default: "SUPER_ADMIN" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", adminSchema);