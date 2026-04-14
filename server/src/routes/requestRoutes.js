const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const mongoose = require('mongoose');
const RescueRequest = require('../models/RescueRequest');
const Rescuer = require('../models/Rescuer');
const { sendEmail } = require('../utils/mailer');

const router = express.Router();

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({ storage });

const HF_IMAGE_MODEL = process.env.HF_IMAGE_MODEL || 'Salesforce/blip-image-captioning-base';

const getImageCaptionFromHF = async (imagePath) => {
  const token = process.env.HF_API_TOKEN;
  if (!token || !imagePath) return '';

  try {
    const imageBuffer = await fs.readFile(imagePath);
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HF_IMAGE_MODEL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
        },
        body: imageBuffer,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HF inference error:', errorText);
      return '';
    }

    const data = await response.json();
    if (Array.isArray(data) && data[0]?.generated_text) {
      return String(data[0].generated_text).trim();
    }
    if (Array.isArray(data) && data[0]?.label) {
      return String(data[0].label).trim();
    }
    if (data?.generated_text) {
      return String(data.generated_text).trim();
    }
    return '';
  } catch (err) {
    console.error('HF caption fetch failed:', err.message);
    return '';
  }
};

const inferMedicalInsights = ({ petType = '', description = '', caption = '' }) => {
  const text = `${petType} ${description} ${caption}`.toLowerCase();
  const items = ['Gloves', 'Pet first-aid kit', 'Drinking water'];
  let disease = 'General trauma/stress (needs physical check by veterinarian)';

  if (text.includes('dog')) items.push('Muzzle', 'Leash');
  if (text.includes('cat')) items.push('Cat carrier', 'Towel');
  if (text.includes('bird')) items.push('Ventilated box');
  if (text.includes('snake')) items.push('Snake hook', 'Protective boots');
  if (text.includes('bleed') || text.includes('injur') || text.includes('wound')) {
    disease = 'Open wound / bleeding injury';
    items.push('Sterile gauze', 'Bandage roll', 'Antiseptic solution');
  }
  if (text.includes('skin') || text.includes('mange') || text.includes('hair loss') || text.includes('rash')) {
    disease = 'Possible skin infection (mange / dermatitis)';
    items.push('Disposable apron', 'Antifungal shampoo', 'Isolation crate');
  }
  if (text.includes('limp') || text.includes('fracture') || text.includes('broken')) {
    disease = 'Possible bone or limb injury';
    items.push('Splint support', 'Soft stretcher');
  }
  if (text.includes('foam') || text.includes('saliva') || text.includes('rabies')) {
    disease = 'Possible rabies symptoms (high-risk case)';
    items.push('Face shield', 'Bite-resistant gloves', 'Capture net');
  }
  if (text.includes('aggressive') || text.includes('attack')) items.push('Catch pole');
  if (text.includes('night') || text.includes('dark')) items.push('Flashlight');

  return {
    diseasePrediction: disease,
    equipmentSuggestion: [...new Set(items)].join(', '),
  };
};

// Create a new rescue request (user flow)
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { petType, description, lat, lng, address, userPhone, userEmail } = req.body;
    const normalizedPhone = String(userPhone || '').replace(/[^\d+]/g, '');

    if (!/^\+?\d{10,15}$/.test(normalizedPhone)) {
      return res.status(400).json({ message: 'Please enter a valid phone number.' });
    }

    const imagePath = req.file ? path.join(__dirname, '../../uploads', req.file.filename) : '';
    const mlCaption = await getImageCaptionFromHF(imagePath);
    const insights = inferMedicalInsights({ petType, description, caption: mlCaption });

    const request = await RescueRequest.create({
      petType,
      description,
      userPhone: normalizedPhone,
      userEmail,
      mlCaption,
      diseasePrediction: insights.diseasePrediction,
      equipmentSuggestion: insights.equipmentSuggestion,
      location: {
        lat: Number(lat),
        lng: Number(lng),
        address,
      },
      imageUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
    });

    // Notify all active rescuers by email
    const rescuers = await Rescuer.find({ isActive: true });
    const emails = rescuers.map((r) => r.email).filter(Boolean);

    const subject = `New Animal Rescue Request - ${petType}`;
    const html = `
      <h2>New Animal Needs Help</h2>
      <p><strong>Type:</strong> ${petType}</p>
      <p><strong>Description:</strong> ${description}</p>
      <p><strong>Location:</strong> ${address || `${lat}, ${lng}`}</p>
      <p><strong>Contact Phone:</strong> ${userPhone}</p>
      <p><strong>ML disease estimate:</strong> ${insights.diseasePrediction}</p>
      <p><strong>Suggested equipment:</strong> ${insights.equipmentSuggestion}</p>
      <p>You can accept this rescue from your rescuer dashboard.</p>
    `;

    if (emails.length) {
      await sendEmail(emails.join(','), subject, html);
    }

    res.status(201).json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all rescue requests (for rescuer dashboard)
router.get('/', async (req, res) => {
  try {
    const requests = await RescueRequest.find().populate('acceptedBy').sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Rescuer accepts a request
router.post('/:id/accept', async (req, res) => {
  try {
    const rescuerId = String(req.body.rescuerId || '').trim();
    const request = await RescueRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (!rescuerId) {
      return res.status(400).json({ message: 'Rescuer ID is required' });
    }
    request.status = 'accepted';
    request.rescuerCode = rescuerId;
    if (mongoose.isValidObjectId(rescuerId)) {
      request.acceptedBy = rescuerId;
    }
    await request.save();

    // Notify user if email is present
    if (request.userEmail) {
      await sendEmail(
        request.userEmail,
        'Your animal rescue request has been accepted',
        `<p>A rescuer has accepted your request and is on the way.</p>`
      );
    }

    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark as rescued
router.post('/:id/rescued', async (req, res) => {
  try {
    const request = await RescueRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    request.status = 'rescued';
    await request.save();

    if (request.userEmail) {
      await sendEmail(
        request.userEmail,
        'Animal Rescue Successful',
        `<p>Your reported animal has been marked as rescued. Thank you for caring!</p>`
      );
    }

    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


