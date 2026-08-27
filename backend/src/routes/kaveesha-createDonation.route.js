const express = require('express');
const router = express.Router();

const Donation = require('../models/kaveesha-Donation.model');
const { validateDonationPayload } = require('../middleware/kaveesha-validateDonation');
const { requireAuth } = require('../middleware/kaveesha-authMiddleware');

function generateDonationCode() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `RM-${year}-${random}`;
}

router.post('/', requireAuth, validateDonationPayload, async (req, res) => {
  try {
    const {
      foodType,
      foodCategory,
      quantity,
      numberOfPortions,
      preparationTime,
      expiryTime,
      storageCondition,
      allergenInfo,
      packagingCondition,
      photoUrl,
      pickupAddress,
      pickupDistrict,
      pickupWindowStart,
      pickupWindowEnd,
    } = req.body;

    const donation = await Donation.create({
      donor: req.user._id,
      foodType,
      foodCategory,
      quantity,
      numberOfPortions,
      preparationTime,
      expiryTime,
      storageCondition,
      allergenInfo,
      packagingCondition,
      photoUrl,
      pickupAddress,
      pickupDistrict,
      pickupWindowStart,
      pickupWindowEnd,
      status: 'pending',
      donationCode: generateDonationCode(),
    });

    return res.status(201).json({
      success: true,
      message: 'Donation created successfully',
      data: donation,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: err.errors,
      });
    }
    console.error('[createDonation] Failed to create donation:', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while creating the donation',
    });
  }
});

module.exports = router;