const mongoose = require("mongoose");

// In-app chat history. One collection serves both chat kinds.
// Each message belongs to a 1-on-1 conversation identified by:
//   (contextType, contextId, pairKey(myId, peerId))
// pairKey sorts the two ObjectIds so both sides always compute the same key.
//
//   - "donation"  — a private rescue chat between the donor and ONE recipient
//                   who asked for that donation.
//   - "campaign"  — a private chat between the NGO owner and ONE interested user.
const chatMessageSchema = new mongoose.Schema(
  {
    contextType: {
      type: String,
      enum: ["donation", "campaign"],
      required: true,
    },
    contextId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The other participant in this 1-on-1 conversation.
    // Required for new messages; may be null on legacy shared-room messages.
    peerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// Fast lookup of the full message history for one conversation pair.
chatMessageSchema.index(
  { contextType: 1, contextId: 1, sender: 1, peerId: 1, createdAt: 1 }
);

// Fast lookup for the conversation-list aggregation.
chatMessageSchema.index({ sender: 1, peerId: 1, createdAt: -1 });

// Returns a stable key for the unordered pair {a, b} so both sides
// always compute the same room name regardless of who is sender.
chatMessageSchema.statics.pairKey = function (a, b) {
  return [String(a), String(b)].sort().join("|");
};

// Socket.IO room name for a specific 1-on-1 conversation.
// Falls back to the shared room key when peerId is absent (legacy support).
chatMessageSchema.statics.roomFor = function (contextType, contextId, userId, peerId) {
  if (!peerId) return `chat:${contextType}:${contextId}`;
  const pair = this.pairKey(userId, peerId);
  return `chat:${contextType}:${contextId}:${pair}`;
};

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
