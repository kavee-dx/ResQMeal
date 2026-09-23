const { getRequestProgress } = require('../services/dushani-requestProgressService');

// requireAuth attaches the decoded JWT payload to req.user as { id, role }.
function getRecipientId(req) {
  return req.user?.id ?? null;
}

async function getRequestProgressHandler(req, res) {
  try {
    const progress = await getRequestProgress(getRecipientId(req), req.params.id);
    return res.json(progress);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res
      .status(statusCode)
      .json({ message: error.message || 'Failed to fetch request progress' });
  }
}

module.exports = { getRequestProgressHandler };
