const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const mongoose = require('mongoose');
const Stripe = require('stripe');
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
const HF_PREDICT_API_URL =
  process.env.HF_PREDICT_API_URL || 'https://prince200603-animal-injury-detector.hf.space/predict';
const stripe =
  process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.trim()
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

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

const extractTopResponsePairs = (payload) => {
  if (!payload) return [];

  let source = payload;
  if (Array.isArray(source)) {
    source = source.find((item) => item && typeof item === 'object') || {};
  }
  if (!source || typeof source !== 'object') return [];

  return Object.entries(source)
    .slice(0, 3)
    .map(([key, value]) => {
      let formattedValue = value;
      if (value && typeof value === 'object') {
        formattedValue = JSON.stringify(value);
      }
      return {
        key: String(key),
        value: String(formattedValue),
      };
    });
};

const getTopPredictionsFromDetector = async (imagePath) => {
  if (!imagePath) return [];
  try {
    const imageBuffer = await fs.readFile(imagePath);
    const form = new FormData();
    const fileBlob = new Blob([imageBuffer], { type: 'image/jpeg' });
    form.append('file', fileBlob, path.basename(imagePath));

    const response = await fetch(HF_PREDICT_API_URL, {
      method: 'POST',
      body: form,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HF predict endpoint error:', errorText);
      return [];
    }

    const data = await response.json();
    return extractTopResponsePairs(data);
  } catch (err) {
    console.error('HF predict call failed:', err.message);
    return [];
  }
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
    const topResponsePairs = await getTopPredictionsFromDetector(imagePath);
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
    const predictionHtml = topResponsePairs.length
      ? `
      
      <ol>
        ${topResponsePairs.map((item) => `<li>${item.key}: ${item.value}</li>`).join('')}
      </ol>
    `
      : `<p><strong>Top 3 key-value pairs from injury detector API response:</strong> No response data available.</p>`;
    const html = `
      <h2>New Animal Needs Help</h2>
      <p><strong>Type:</strong> ${petType}</p>
      <p><strong>Description:</strong> ${description}</p>
      <p><strong>Location:</strong> ${address || `${lat}, ${lng}`}</p>
      <p><strong>Contact Phone:</strong> ${userPhone}</p>
      <p><strong>ML disease estimate:</strong> ${insights.diseasePrediction}</p>
      <p><strong>Suggested equipment:</strong> ${insights.equipmentSuggestion}</p>
      ${predictionHtml}
      <p>You can accept this rescue from your rescuer dashboard.</p>
    `;
    const attachments = req.file
      ? [
          {
            filename: req.file.originalname || req.file.filename,
            path: imagePath,
          },
        ]
      : [];

    if (emails.length) {
      await sendEmail(emails.join(','), subject, html, { attachments });
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

// Create Stripe checkout session for optional rescuer tip (Rs 500)
router.post('/:id/tip-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ message: 'Stripe is not configured on server.' });
    }

    const request = await RescueRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (request.status !== 'rescued') {
      return res.status(400).json({ message: 'Tip can be paid only after rescue completion.' });
    }

    const { successUrl, cancelUrl } = req.body || {};
    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ message: 'successUrl and cancelUrl are required.' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: 'Rescuer Appreciation Tip',
              description: `Optional Rs 500 tip for rescuing ${request.petType}`,
            },
            unit_amount: 50000,
          },
          quantity: 1,
        },
      ],
      metadata: {
        requestId: String(request._id),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    request.tipPaymentStatus = 'pending';
    request.tipCheckoutSessionId = session.id;
    await request.save();

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not create payment session.' });
  }
});

// Verify payment completion status using Stripe session id
router.get('/:id/tip-status', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ message: 'Stripe is not configured on server.' });
    }
    const request = await RescueRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (!request.tipCheckoutSessionId) {
      return res.json({ status: request.tipPaymentStatus || 'not_initiated' });
    }

    const session = await stripe.checkout.sessions.retrieve(request.tipCheckoutSessionId);
    if (session.payment_status === 'paid') {
      request.tipPaymentStatus = 'paid';
      await request.save();
    }

    res.json({ status: request.tipPaymentStatus, paymentStatus: session.payment_status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not verify payment status.' });
  }
});

module.exports = router;


