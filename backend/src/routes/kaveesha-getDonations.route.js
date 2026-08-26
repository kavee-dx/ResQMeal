const express = require('express');
const router = express.Router();

const Donation = require('../models/kaveesha-Donation.model');
const { requireAuth } = require('../middleware/kaveesha-authMiddleware');

// GET /api/donor/donations?status=active
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { donor: req.user._id };
    if (status && status !== 'all') {
      filter.status = status;
    }

    const donations = await Donation.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: donations.length,
      data: donations,
    });
  } catch (err) {
    console.error('[getDonations] Failed to fetch donations:', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching donations',
    });
  }
});

// GET /api/donor/donations/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const donation = await Donation.findOne({
      _id: req.params.id,
      donor: req.user._id,
    });

    if (!donation) {
      return res.status(404).json({
        success: false,
        message: 'Donation not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: donation,
    });
  } catch (err) {
    console.error('[getDonations] Failed to fetch donation detail:', err);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong while fetching the donation',
    });
  }
});

module.exports = router;