'use strict';

const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['AUTH', 'INCIDENT', 'ADMIN', 'SYSTEM'],
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    actorRole: {
      type: String,
      enum: ['USER', 'ADMIN', 'MODERATOR', 'SYSTEM', 'GUEST'],
      default: 'SYSTEM',
    },
    actorLabel: {
      type: String,
      default: 'SYSTEM',
      trim: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sourceIp: {
      type: String,
      default: '',
      trim: true,
    },
    userAgent: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);