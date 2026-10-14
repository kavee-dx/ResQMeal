// Temporary diagnostic: what chat notifications exist in the DB?
require("dotenv").config();
const mongoose = require("mongoose");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  const counts = await db
    .collection("notifications")
    .aggregate([
      { $group: { _id: { type: "$type", category: "$category" }, n: { $sum: 1 } } },
    ])
    .toArray();
  console.log("COUNTS:", JSON.stringify(counts, null, 1));

  const latest = await db
    .collection("notifications")
    .find({ type: "CHAT_NEW_MESSAGE" })
    .sort({ createdAt: -1 })
    .limit(3)
    .toArray();
  console.log(
    "LATEST CHAT:",
    JSON.stringify(
      latest.map((d) => ({
        userId: String(d.userId),
        title: d.title,
        body: d.body,
        target: d.target,
        senderId: d.data && d.data.senderId,
        contextType: d.data && d.data.contextType,
        createdAt: d.createdAt,
      })),
      null,
      1,
    ),
  );

  const names = await db.listCollections({}, { nameOnly: true }).toArray();
  console.log(
    "COLLECTIONS:",
    names.map((n) => n.name).join(", "),
  );
  const msgCol = names.map((n) => n.name).find((n) => /chat/i.test(n));
  if (msgCol) {
    const total = await db.collection(msgCol).countDocuments();
    const withPeer = await db
      .collection(msgCol)
      .countDocuments({ peerId: { $ne: null } });
    console.log(`MESSAGES (${msgCol}) total:`, total, "| with peerId:", withPeer);
  }

  await mongoose.disconnect();
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
