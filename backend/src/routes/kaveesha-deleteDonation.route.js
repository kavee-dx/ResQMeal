/**
 * kaveesha-deleteDonation.route.js
 * Location: backend/src/routes/donor/kaveesha-deleteDonation.route.js
 *
 * DELETE /api/donor/donations/:id
 * Removes a donation the donor owns. Blocked once the donation is
 * "active" or later in its lifecycle (i.e. once someone may have already
 * started acting on it) — only pending donations can be hard-deleted.
 * Anything further along should be cancelled instead of deleted; see the
 * note at the bottom of this file if you want a cancel option too.
 */

const express = require('express');
const router = express.Router();

const Donation = require('../models/kaveesha-Donation.model');
const { requireAuth } = require('../middleware/kaveesha-authMiddleware');

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const donation = await Donation.findOne({ _id: req.params.id, donor: req.user._id });

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    if (donation.status !== 'pending') {
      return res.status(409).json({
        success: false,
        message: `This donation is already ${donation.status} and can no longer be deleted. Cancel it instead.`,
      });
    }

    await donation.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Donation deleted successfully',
      data: { _id: req.params.id },
    });
  } catch (err) {
    console.error('[deleteDonation] Failed to delete donation:', err);
    return res.status(500).json({ success: false, message: 'Something went wrong while deleting the donation' });
  }
});

/**
 * OPTIONAL: if you'd rather let donors "cancel" an active/expiring
 * donation instead of only deleting pending ones, uncomment this and
 * call it from the frontend as a soft-delete (keeps the record, just
 * flips its status instead of removing it):
 *
 * router.patch('/:id/cancel', requireAuth, async (req, res) => {
 *   const donation = await Donation.findOne({ _id: req.params.id, donor: req.user._id });
 *   if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });
 *   if (donation.status === 'completed') {
 *     return res.status(409).json({ success: false, message: 'Completed donations cannot be cancelled' });
 *   }
 *   donation.status = 'cancelled';
 *   await donation.save();
 *   return res.status(200).json({ success: true, message: 'Donation cancelled', data: donation });
 * });
 */

module.exports = router;