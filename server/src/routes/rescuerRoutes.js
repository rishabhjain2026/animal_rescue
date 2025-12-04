const express = require('express');
const Rescuer = require('../models/Rescuer');

const router = express.Router();

// Register a rescuer
router.post('/register', async (req, res) => {
  try {
    const { name, phone, ngoName, email } = req.body;
    const existing = await Rescuer.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Rescuer with this email already exists' });
    }
    const rescuer = await Rescuer.create({ name, phone, ngoName, email });
    res.status(201).json(rescuer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all active rescuers (for internal use if needed)
router.get('/', async (req, res) => {
  try {
    const rescuers = await Rescuer.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(rescuers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


