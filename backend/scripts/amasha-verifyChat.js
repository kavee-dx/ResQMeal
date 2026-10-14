/* Verification script for the amasha in-app chat feature.
 * Runs against the test instance on port 5050, mints dev JWTs with the real
 * JWT_SECRET, exercises the REST endpoints + Socket.IO, then cleans up every
 * test document it created. */
require("dotenv").config();
const path = require("path");

const BACKEND = "http://localhost:5050";
process.env.PORT = "5050";

const mongoose = require("mongoose");
const { io } = require("socket.io-client");
const { signToken } = require("../src/utils/kaveesha-jwt");
const User = require("../src/models/dushani-User");
const Donation = require("../src/models/kaveesha-Donation");
const DonationRequest = require("../src/models/dushani-donationRequestModel");
const Campaign = require("../src/models/amasha-Campaign");
const ChatMessage = require("../src/models/amasha-ChatMessage");

let passed = 0;
let failed = 0;

function check(name, cond, extra) {
  if (cond) {
    passed++;
    console.log(`PASS  ${name}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}`, extra ?? "");
  }
}

async function api(token, method, url, body) {
  const res = await fetch(`${BACKEND}${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data };
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const donorUser = await User.findOne({ role: "DONOR" }).lean();
  const recipientUser = await User.findOne({ role: "RECIPIENT" }).lean();
  const otherUser = await User.findOne({
    role: { $in: ["VOLUNTEER", "DONOR"] },
    _id: { $ne: donorUser?._id },
  }).lean();
  const donation = await Donation.findOne({ donor: donorUser?._id }).lean();
  const campaign = await Campaign.findOne({ status: "active" }).lean();

  if (!donorUser || !recipientUser || !otherUser || !donation || !campaign) {
    console.error("Missing fixtures:", {
      donorUser: !!donorUser,
      recipientUser: !!recipientUser,
      otherUser: !!otherUser,
      donation: !!donation,
      campaign: !!campaign,
    });
    process.exit(1);
  }

  const donorToken = signToken(donorUser);
  const recipientToken = signToken(recipientUser);
  const otherToken = signToken(otherUser);

  console.log("\n--- Campaign chat (open room) ---");

  // Recipient posts in campaign chat
  let r = await api(recipientToken, "POST", `/api/chat/campaign/${campaign._id}/messages`, {
    text: "Hi, our community centre would love to help with this campaign!",
  });
  check("recipient can post in campaign chat", r.status === 201 && r.data?.message?.text?.includes("community centre"), r);

  const campaignMsgId = r.data?.message?.id;

  // Donor reads history
  r = await api(donorToken, "GET", `/api/chat/campaign/${campaign._id}/messages`);
  check("donor can read campaign chat history", r.status === 200 && r.data?.messages?.some((m) => m.id === campaignMsgId), r.status);
  check("history carries sender display name", r.data?.messages?.some((m) => m.sender?.name), r.data?.messages?.[0]?.sender);

  // Empty message rejected
  r = await api(donorToken, "POST", `/api/chat/campaign/${campaign._id}/messages`, { text: "   " });
  check("empty message rejected with 400", r.status === 400, r.status);

  // No token -> 401
  r = await api(null, "GET", `/api/chat/campaign/${campaign._id}/messages`);
  check("unauthenticated history read is 401", r.status === 401, r.status);

  console.log("\n--- Donation rescue chat (restricted room) ---");

  // Recipient WITHOUT an ask is denied
  r = await api(recipientToken, "POST", `/api/chat/donation/${donation._id}/messages`, {
    text: "Can I have this?",
  });
  check("recipient without an ask is denied (403)", r.status === 403, r.status);

  // Donor can post
  r = await api(donorToken, "POST", `/api/chat/donation/${donation._id}/messages`, {
    text: "Rescue chat is open — when can you pick up?",
  });
  check("donor can post in rescue chat", r.status === 201, r.status);

  // Stranger denied
  r = await api(otherToken, "GET", `/api/chat/donation/${donation._id}/messages`);
  check("unrelated user cannot read rescue chat (403)", r.status === 403, r.status);

  // Grant the recipient an ask so they join the room
  await DonationRequest.findOneAndUpdate(
    { donation: donation._id, recipient: recipientUser._id },
    { $set: { note: "verification ask" } },
    { upsert: true, setDefaultsOnInsert: true },
  );

  r = await api(recipientToken, "GET", `/api/chat/donation/${donation._id}/messages`);
  check("recipient with an ask can read rescue chat", r.status === 200 && r.data?.messages?.length >= 1, r.status);

  r = await api(recipientToken, "POST", `/api/chat/donation/${donation._id}/messages`, {
    text: "I can pick it up this evening around 6 pm.",
  });
  check("recipient with an ask can post in rescue chat", r.status === 201, r.status);

  // Unknown context type rejected
  r = await api(donorToken, "GET", `/api/chat/whatever/${donation._id}/messages`);
  check("unknown chat type rejected with 400", r.status === 400, r.status);

  // Bad id -> 404
  r = await api(donorToken, "GET", "/api/chat/donation/000000000000000000000000/messages");
  check("nonexistent donation chat is 404", r.status === 404, r.status);

  console.log("\n--- Socket.IO realtime ---");

  const donorSocket = io(BACKEND, {
    auth: { token: donorToken },
    transports: ["websocket"],
  });
  const recipientSocket = io(BACKEND, {
    auth: { token: recipientToken },
    transports: ["websocket"],
  });

  await new Promise((resolve, reject) => {
    donorSocket.on("connect", resolve);
    donorSocket.on("connect_error", reject);
  });
  await new Promise((resolve, reject) => {
    recipientSocket.on("connect", resolve);
    recipientSocket.on("connect_error", reject);
  });
  check("both sockets connected with JWT auth", true);

  const donorJoin = await new Promise((resolve) =>
    donorSocket.emit("amasha:chat:join", { contextType: "donation", contextId: `${donation._id}` }, resolve),
  );
  const recipientJoin = await new Promise((resolve) =>
    recipientSocket.emit("amasha:chat:join", { contextType: "donation", contextId: `${donation._id}` }, resolve),
  );
  check("donor socket joins rescue room", donorJoin?.success === true, donorJoin);
  check("recipient socket joins rescue room", recipientJoin?.success === true, recipientJoin);

  const deniedJoin = await new Promise((resolve) =>
    (function () {
      const s = io(BACKEND, { auth: { token: otherToken }, transports: ["websocket"] });
      s.on("connect", () =>
        s.emit("amasha:chat:join", { contextType: "donation", contextId: `${donation._id}` }, (ack) => {
          s.close();
          resolve(ack);
        }),
      );
    })(),
  );
  check("unrelated socket join is refused", deniedJoin?.success === false, deniedJoin);

  const received = new Promise((resolve) =>
    donorSocket.once("amasha:chat:message", resolve),
  );

  const sent = await api(recipientToken, "POST", `/api/chat/donation/${donation._id}/messages`, {
    text: "Realtime check — donor should see this instantly.",
  });
  const pushed = await Promise.race([
    received,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
  ]).catch((e) => null);

  check(
    "donor socket receives recipient's REST message in realtime",
    pushed?.id === sent.data?.message?.id && pushed?.text === "Realtime check — donor should see this instantly.",
    pushed,
  );

  // Message persisted (history survives)
  r = await api(donorToken, "GET", `/api/chat/donation/${donation._id}/messages`);
  const persisted = r.data?.messages?.some(
    (m) => m.text === "Realtime check — donor should see this instantly.",
  );
  check("message persisted in history", persisted === true);

  donorSocket.close();
  recipientSocket.close();

  console.log("\n--- Cleanup ---");
  const askCleanup = await DonationRequest.deleteOne({
    donation: donation._id,
    recipient: recipientUser._id,
    note: "verification ask",
  });
  const msgCleanup = await ChatMessage.deleteMany({
    $or: [
      { contextType: "campaign", contextId: campaign._id, sender: recipientUser._id },
      { contextType: "donation", contextId: donation._id },
    ],
  });
  console.log(`deleted test ask(s): ${askCleanup.deletedCount}, test message(s): ${msgCleanup.deletedCount}`);

  await mongoose.disconnect();

  console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((error) => {
  console.error("Verification crashed:", error);
  process.exit(1);
});
