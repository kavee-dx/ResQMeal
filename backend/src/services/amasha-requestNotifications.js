// Thin helpers so the request controller needs only one line per status change.
// Adjust the field names (recipient, acceptedBy, volunteer) to your FoodRequest schema.
const { notify } = require("./amasha-notificationService");

const base = (request) => ({
  requestId: request._id,
  foodType: request.foodType,
});

// PENDING -> MATCHED
const notifyRequestAccepted = (request) =>
  notify("REQUEST_ACCEPTED", [request.recipient], base(request));

// any -> CANCELLED (donor is told only if they had accepted)
const notifyRequestCancelled = (request) =>
  request.acceptedBy
    ? notify("REQUEST_CANCELLED", [request.acceptedBy], base(request))
    : Promise.resolve({ created: 0 });

// PENDING -> EXPIRED
const notifyRequestExpired = (request) =>
  notify("REQUEST_EXPIRED", [request.recipient], base(request));

// Call after a status update is saved; handles DISPATCHED and FULFILLED.
const notifyRequestStatusChange = (request) => {
  switch (request.status) {
    case "DISPATCHED":
      return notify("DELIVERY_STARTED", [request.recipient], base(request));
    case "FULFILLED":
      return notify(
        "DELIVERY_COMPLETED",
        [request.recipient, request.acceptedBy, request.volunteer],
        base(request)
      );
    default:
      return Promise.resolve({ created: 0 });
  }
};

module.exports = {
  notifyRequestAccepted,
  notifyRequestCancelled,
  notifyRequestExpired,
  notifyRequestStatusChange,
};