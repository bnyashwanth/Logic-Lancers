'use strict';

const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema(
  {
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    deviceId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['BLOOD', 'MEDICINE', 'RESCUE', 'SUPPLIES'],
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      required: false,
      index: true,
    },
    images: {
      type: [String],
      default: undefined,
      validate: [
        {
          validator(value) {
            if (value == null) return true;
            if (!Array.isArray(value)) return false;
            return value.length <= 10;
          },
          message: 'images must contain up to 10 items',
        },
      ],
    },
    location: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
    },
    // GeoJSON representation for $nearSphere queries (2dsphere index).
    // We keep the explicit lat/lng above for UI friendliness, while this field
    // is used purely for geospatial duplicate detection.
    locationGeo: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },
    status: {
      type: String,
      enum: ['OPEN', 'FULL', 'RESOLVED'],
      default: 'OPEN',
      index: true,
    },
    requiredVolunteers: {
      type: Number,
      default: 5,
      min: 1,
    },
    volunteersEnRoute: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // AI dispatcher fields (set when a new incident is created).
    priorityScore: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'LOW'],
      default: 'LOW',
      index: true,
    },
    recommendedAction: {
      type: String,
      required: false,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

IncidentSchema.index({ status: 1, createdAt: -1 });
IncidentSchema.index({ locationGeo: '2dsphere' });

// Ensure locationGeo is always derived from the lat/lng pair.
IncidentSchema.pre('validate', function (next) {
  if (
    this.location
    && typeof this.location.lat === 'number'
    && typeof this.location.lng === 'number'
    && Array.isArray(this.locationGeo?.coordinates) !== true
  ) {
    this.locationGeo = {
      type: 'Point',
      coordinates: [this.location.lng, this.location.lat],
    };
  }

  // If coordinates are present but incomplete, rebuild them too.
  if (this.location && (this.locationGeo?.coordinates?.length !== 2)) {
    this.locationGeo = {
      type: 'Point',
      coordinates: [this.location.lng, this.location.lat],
    };
  }

  next();
});

module.exports = mongoose.model('Incident', IncidentSchema);