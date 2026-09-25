const Donation = require("../models/kaveesha-Donation"); 
const EmergencyRequest = require("../models/dushani-foodRequestModel");

/**
 * GET /api/ngo/trends/donations?days=7
 * Returns donation counts grouped by day for the last N days.
 */
exports.getDonationsTrend = async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 7;
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const results = await Donation.aggregate([
      { $match: { donatedAt: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$donatedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(fillMissingDays(results, days));
  } catch (err) {
    console.error("getDonationsTrend error:", err);
    res.status(500).json({ message: "Failed to compute donations trend" });
  }
};

/**
 * GET /api/ngo/trends/fulfilled?days=7
 * Returns fulfilled-request counts grouped by the day they were fulfilled.
 */
exports.getFulfilledTrend = async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 7;
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const results = await EmergencyRequest.aggregate([
      { $match: { status: "fulfilled", fulfilledAt: { $gte: since, $ne: null } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$fulfilledAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(fillMissingDays(results, days));
  } catch (err) {
    console.error("getFulfilledTrend error:", err);
    res.status(500).json({ message: "Failed to compute fulfilled trend" });
  }
};

/**
 * GET /api/ngo/trends/summary
 * Returns fulfillment rate and average time-to-fulfillment across all requests.
 */
exports.getTrendSummary = async (req, res) => {
  try {
    const [rateResult] = await EmergencyRequest.aggregate([
      { $match: { status: { $in: ["fulfilled", "expired"] } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          fulfilled: { $sum: { $cond: [{ $eq: ["$status", "fulfilled"] }, 1, 0] } },
        },
      },
    ]);

    const [timeResult] = await EmergencyRequest.aggregate([
      { $match: { status: "fulfilled", fulfilledAt: { $ne: null } } },
      {
        $project: {
          hoursToFulfill: {
            $divide: [{ $subtract: ["$fulfilledAt", "$requestedAt"] }, 1000 * 60 * 60],
          },
        },
      },
      { $group: { _id: null, avgHours: { $avg: "$hoursToFulfill" } } },
    ]);

    const fulfillmentRate = rateResult && rateResult.total > 0
      ? Math.round((rateResult.fulfilled / rateResult.total) * 100)
      : 0;

    const avgTimeToFulfillmentHours = timeResult
      ? Math.round(timeResult.avgHours * 10) / 10
      : null;

    res.json({ fulfillmentRate, avgTimeToFulfillmentHours });
  } catch (err) {
    console.error("getTrendSummary error:", err);
    res.status(500).json({ message: "Failed to compute trend summary" });
  }
};

/**
 * Fills in zero-count days that MongoDB's $group skipped (days with no
 * activity produce no document), so the frontend always gets a continuous
 * N-day series instead of gaps.
 */
function fillMissingDays(results, days) {
  const map = new Map(results.map((r) => [r._id, r.count]));
  const output = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    output.push({ date: key, count: map.get(key) || 0 });
  }
  return output;
}