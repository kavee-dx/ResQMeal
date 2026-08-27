const express = require('express');
const router = express.Router();

const Donation = require('../models/kaveesha-Donation.model');
const { validateDonationUpdatePayload } = require('../middleware/kaveesha-validateDonationUpdate');
const { requireAuth } = require('../middleware/kaveesha-authMiddleware');

const EDITABLE_FIELDS = [
  'foodType', 'foodCategory', 'quantity', 'numberOfPortions',
  'preparationTime', 'expiryTime', 'storageCondition', 'allergenInfo',
  'packagingCondition', 'photoUrl', 'pickupAddress', 'pickupDistrict',
  'pickupWindowStart', 'pickupWindowEnd',
];

router.patch('/:id', requireAuth, validateDonationUpdatePayload, async (req, res) => {
  try {
    const donation = await Donation.findOne({ _id: req.params.id, donor: req.user._id });

    if (!donation) {
      return res.status(404).json({ success: false, message: 'Donation not found' });
    }

    if (['completed', 'cancelled'].includes(donation.status)) {
      return res.status(409).json({
        success: false,
        message: `This donation is already ${donation.status} and can no longer be edited`,
      });
    }

    EDITABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) donation[field] = req.body[field];
    });

    await donation.save();

    return res.status(200).json({ success: true, message: 'Donation updated successfully', data: donation });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: err.errors });
    }
    console.error('[updateDonation] Failed to update donation:', err);
    return res.status(500).json({ success: false, message: 'Something went wrong while updating the donation' });
  }
});

module.exports = router;