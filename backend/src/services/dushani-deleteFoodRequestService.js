const FoodRequest = require('../models/dushani-foodRequestModel');

// Sprint task — request deletion: a recipient owns their request only while it
// is still waiting. Once a donor claims it the donation is committed, so
// deleting would strand the donor.
const DONOR_COMMITTED_STATUSES = ['MATCHED', 'DISPATCHED', 'FULFILLED'];

async function deleteFoodRequest(recipientId, requestId) {
  if (!recipientId || !requestId) {
    const error = new Error('recipientId and requestId are required');
    error.statusCode = 400;
    throw error;
  }

  const request = await FoodRequest.findOne({ _id: requestId, recipient: recipientId });

  if (!request) {
    const error = new Error('Food request not found');
    error.statusCode = 404;
    throw error;
  }

  if (DONOR_COMMITTED_STATUSES.includes(request.status)) {
    const error = new Error(
      'A donor has already accepted this request, so it can no longer be deleted',
    );
    error.statusCode = 409;
    throw error;
  }

  await request.deleteOne();

  return { id: request._id.toString(), status: request.status };
}

module.exports = { deleteFoodRequest, DONOR_COMMITTED_STATUSES };
