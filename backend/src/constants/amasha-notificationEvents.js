// The full set of system notification events.
//
// Every notification the app can send is defined here once: its type, who
// receives it, how urgent it is, the wording, and how repeats are prevented.
// Controllers and jobs never write notification text themselves; they call
// notify(TYPE, userIds, data) from services/amasha-notificationService.js.

const CATEGORIES = {
  EXPIRY: "EXPIRY",
  REQUEST: "REQUEST",
  ASSIGNMENT: "ASSIGNMENT",
  DELIVERY: "DELIVERY",
  CAMPAIGN: "CAMPAIGN",
};

const PRIORITIES = ["low", "normal", "high"];

// Matches the donor-side "Expiring Soon" warning, which is calculated from
// availabilityEnd (it is a UI condition, not a donation status).
const EXPIRY_ALERT_WINDOW_HOURS = 24;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const fmt = (value) =>
  value
    ? new Date(value).toLocaleString("en-GB", {
        timeZone: "Asia/Colombo",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "soon";

const fmtDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        timeZone: "Asia/Colombo",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

const food = (d) => d.foodType || "food";

// ---------------------------------------------------------------------------
// Event definitions
//
// roles    who may receive it (documentation + used for broadcasts)
// target   what the notification opens in the app: { type, idKey }
// dedupe   returns a key; the same key is never created twice for one user.
//          Return null for events that may legitimately repeat.
// build    returns { title, body } from the data passed to notify()
// trigger  where in the backend this event is raised
// ---------------------------------------------------------------------------
const NOTIFICATION_EVENTS = {
  // ----- Expiry alerts -----------------------------------------------------
  DONATION_EXPIRING_SOON: {
    category: CATEGORIES.EXPIRY,
    roles: ["DONOR"],
    priority: "high",
    target: { type: "donation", idKey: "donationId" },
    dedupe: (d) => `donation:${d.donationId}:expiring`,
    build: (d) => ({
      title: "Donation expiring soon",
      body: `Your ${food(d)} donation is only available until ${fmt(
        d.availabilityEnd
      )}.`,
    }),
    trigger: `Scheduled job: active/pending donations with availabilityEnd within ${EXPIRY_ALERT_WINDOW_HOURS}h`,
  },

  DONATION_EXPIRED: {
    category: CATEGORIES.EXPIRY,
    roles: ["DONOR"],
    priority: "normal",
    target: { type: "donation", idKey: "donationId" },
    dedupe: (d) => `donation:${d.donationId}:expired`,
    build: (d) => ({
      title: "Donation expired",
      body: `Your ${food(d)} donation passed its availability time and was closed.`,
    }),
    trigger: "donationExpiryService, when a donation moves to 'expired'",
  },

  // ----- Recipient request status updates ---------------------------------
  // FoodRequest status mapping:
  //   PENDING -> MATCHED     REQUEST_ACCEPTED
  //   MATCHED -> DISPATCHED  DELIVERY_STARTED   (see Delivery below)
  //   DISPATCHED -> FULFILLED DELIVERY_COMPLETED (see Delivery below)
  //   PENDING -> EXPIRED     REQUEST_EXPIRED
  //   any -> CANCELLED       REQUEST_CANCELLED  (sent to the donor)
  REQUEST_ACCEPTED: {
    category: CATEGORIES.REQUEST,
    roles: ["RECIPIENT"],
    priority: "high",
    target: { type: "request", idKey: "requestId" },
    dedupe: (d) => `request:${d.requestId}:accepted`,
    build: (d) => ({
      title: "A donor accepted your request",
      body: `Good news: a donor will provide the ${food(d)} you asked for.`,
    }),
    trigger: "acceptFoodRequest (request becomes MATCHED)",
  },

  REQUEST_EXPIRED: {
    category: CATEGORIES.REQUEST,
    roles: ["RECIPIENT"],
    priority: "normal",
    target: { type: "request", idKey: "requestId" },
    dedupe: (d) => `request:${d.requestId}:expired`,
    build: (d) => ({
      title: "Request expired",
      body: `Your request for ${food(d)} expired before a donor accepted it. You can post it again.`,
    }),
    trigger: "Wherever a request is moved to EXPIRED",
  },

  REQUEST_CANCELLED: {
    category: CATEGORIES.REQUEST,
    roles: ["DONOR"],
    priority: "high",
    target: { type: "request", idKey: "requestId" },
    dedupe: (d) => `request:${d.requestId}:cancelled`,
    build: (d) => ({
      title: "Recipient cancelled the request",
      body: `The request for ${food(d)} you accepted was cancelled. Your donation is available again.`,
    }),
    trigger: "cancelFoodRequest, only when acceptedBy is set",
  },

  DONATION_ASK_RECEIVED: {
    category: CATEGORIES.REQUEST,
    roles: ["DONOR"],
    priority: "normal",
    target: { type: "donation", idKey: "donationId" },
    dedupe: (d) => `ask:${d.donationId}:${d.recipientId}`,
    build: (d) => ({
      title: "A recipient asked for your donation",
      body: `Someone would like your ${food(d)} donation. Open it to see their request.`,
    }),
    trigger: "askForDonation (first ask only; edits to the note don't re-notify)",
  },

  // ----- Assignment updates -----------------------------------------------
  // Assignment statuses were not in the files I received; confirm these map
  // to your assignment flow before wiring them.
  ASSIGNMENT_OFFERED: {
    category: CATEGORIES.ASSIGNMENT,
    roles: ["VOLUNTEER"],
    priority: "high",
    target: { type: "assignment", idKey: "assignmentId" },
    dedupe: (d) => `assignment:${d.assignmentId}:offered:${d.volunteerId}`,
    build: (d) => ({
      title: "New delivery assignment",
      body: `Pick up ${food(d)}${d.pickupAddress ? ` from ${d.pickupAddress}` : ""}.`,
    }),
    trigger: "Assignment created for a volunteer",
  },

  ASSIGNMENT_ACCEPTED: {
    category: CATEGORIES.ASSIGNMENT,
    roles: ["DONOR", "RECIPIENT"],
    priority: "normal",
    target: { type: "assignment", idKey: "assignmentId" },
    dedupe: (d) => `assignment:${d.assignmentId}:accepted`,
    build: (d) => ({
      title: "A volunteer accepted the delivery",
      body: `A volunteer will deliver the ${food(d)}.`,
    }),
    trigger: "Volunteer accepts an assignment",
  },

  ASSIGNMENT_DECLINED: {
    category: CATEGORIES.ASSIGNMENT,
    roles: ["DONOR"],
    priority: "normal",
    target: { type: "assignment", idKey: "assignmentId" },
    dedupe: (d) => `assignment:${d.assignmentId}:declined:${d.volunteerId}`,
    build: (d) => ({
      title: "A volunteer declined the delivery",
      body: `The delivery of ${food(d)} still needs a volunteer.`,
    }),
    trigger: "Volunteer declines an assignment",
  },

  ASSIGNMENT_CANCELLED: {
    category: CATEGORIES.ASSIGNMENT,
    roles: ["DONOR", "RECIPIENT", "VOLUNTEER"],
    priority: "high",
    target: { type: "assignment", idKey: "assignmentId" },
    dedupe: (d) => `assignment:${d.assignmentId}:cancelled`,
    build: (d) => ({
      title: "Delivery assignment cancelled",
      body: `The assignment for ${food(d)} was cancelled.`,
    }),
    trigger: "Assignment cancelled by any party",
  },

  // ----- Delivery confirmation --------------------------------------------
  DELIVERY_STARTED: {
    category: CATEGORIES.DELIVERY,
    roles: ["RECIPIENT"],
    priority: "high",
    target: { type: "request", idKey: "requestId" },
    dedupe: (d) => `request:${d.requestId}:dispatched`,
    build: (d) => ({
      title: "Your food is on the way",
      body: `The ${food(d)} you requested has left the donor.`,
    }),
    trigger: "updateFoodRequestStatus (DISPATCHED)",
  },

  DELIVERY_COMPLETED: {
    category: CATEGORIES.DELIVERY,
    roles: ["DONOR", "RECIPIENT", "VOLUNTEER"],
    priority: "high",
    target: { type: "request", idKey: "requestId" },
    dedupe: (d) => `request:${d.requestId}:fulfilled`,
    build: (d) => ({
      title: "Delivery confirmed",
      body: `The ${food(d)} was delivered. Thank you for helping reduce food waste.`,
    }),
    trigger: "updateFoodRequestStatus (FULFILLED)",
  },

  // ----- New campaign post published --------------------------------------
  CAMPAIGN_PUBLISHED: {
    category: CATEGORIES.CAMPAIGN,
    roles: ["DONOR", "RECIPIENT", "VOLUNTEER"], // broadcast audience
    broadcast: true,
    priority: "low",
    target: { type: "campaign", idKey: "campaignId" },
    dedupe: (d) => `campaign:${d.campaignId}:published`,
    build: (d) => ({
      title: `New campaign: ${d.title}`,
      body: [d.location, d.startDate ? `starts ${fmtDate(d.startDate)}` : null]
        .filter(Boolean)
        .join(", "),
    }),
    trigger: "createCampaign, after the campaign is saved",
  },
};

// Plain map of TYPE -> "TYPE", handy for imports: NOTIFICATION_TYPES.REQUEST_ACCEPTED
const NOTIFICATION_TYPES = Object.freeze(
  Object.keys(NOTIFICATION_EVENTS).reduce((acc, key) => {
    acc[key] = key;
    return acc;
  }, {})
);

module.exports = {
  CATEGORIES,
  PRIORITIES,
  EXPIRY_ALERT_WINDOW_HOURS,
  NOTIFICATION_EVENTS,
  NOTIFICATION_TYPES,
};