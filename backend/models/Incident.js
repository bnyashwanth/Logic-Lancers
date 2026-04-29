const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    enum: ['MEDICAL', 'FOOD', 'RESCUE', 'SUPPLIES', 'EQUIPMENT', 'POWER', 'PERSONNEL', 'OTHER'],
    required: [true, 'Type is required'],
  },
  urgency: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
  },
  status: {
    type: String,
    enum: ['OPEN', 'FULL', 'RESOLVED'],
    default: 'OPEN',
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    address: { type: String, default: '' },
  },
  requiredVolunteers: {
    type: Number,
    default: 5,
    min: 1,
  },
  volunteers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  contactPerson: {
    name: { type: String, default: '' },
    role: { type: String, default: '' },
  },
  specificItems: [{ type: String }],
  tags: [{ type: String }],
  image: { type: String, default: null },
}, {
  timestamps: true,
});

// Virtual: is at capacity
incidentSchema.virtual('isFull').get(function () {
  return this.volunteers.length >= this.requiredVolunteers;
});

// Auto-set status to FULL when volunteer limit reached
incidentSchema.pre('save', function (next) {
  if (this.volunteers.length >= this.requiredVolunteers && this.status === 'OPEN') {
    this.status = 'FULL';
  }
  next();
});

incidentSchema.set('toJSON', { virtuals: true });
incidentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Incident', incidentSchema);
