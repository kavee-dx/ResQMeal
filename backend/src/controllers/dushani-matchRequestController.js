const {
  getRequestMatches,
  getRecipientSuggestions,
} = require('../services/dushani-matchRequestService');

// requireAuth attaches the decoded JWT payload to req.user as { id, role }.
// Matching only ever runs over the caller's own requests, so a recipient cannot
// probe someone else's request to see what donors have posted.
async function getRequestMatchesHandler(req, res) {
  try {
    const result = await getRequestMatches({
      recipientId: req.user?.id ?? null,
      requestId: req.params.id,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ message: error.message || 'Failed to match this request' });
  }
}

async function getRecipientSuggestionsHandler(req, res) {
  try {
    const limit = Number(req.query?.limit);
    const result = await getRecipientSuggestions({
      recipientId: req.user?.id ?? null,
      limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 10) : 3,
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ message: error.message || 'Failed to load suggestions' });
  }
}

module.exports = { getRequestMatchesHandler, getRecipientSuggestionsHandler };
