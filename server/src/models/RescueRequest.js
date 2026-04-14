const mongoose = require('mongoose');

const rescueRequestSchema = new mongoose.Schema(
  {
    petType: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String },
    },
    userPhone: { type: String, required: true },
    userEmail: { type: String },
    mlCaption: { type: String },
    diseasePrediction: { type: String },
    equipmentSuggestion: { type: String },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rescued'],
      default: 'pending',
    },
    rescuerCode: { type: String },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Rescuer' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RescueRequest', rescueRequestSchema);


