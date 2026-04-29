'use strict';
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:  { type: String, required: true, minlength: 6 },
    avatar:    { type: String, default: '' },
    role:      { type: String, enum: ['USER', 'ADMIN', 'MODERATOR'], default: 'USER' },
    status:    { type: String, enum: ['ONLINE', 'OFFLINE', 'AWAY'], default: 'ONLINE' },
    lastPing:  { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    // bcryptjs v2 stable API — synchronous genSaltSync / hashSync to avoid callback issues
    const salt = bcrypt.genSaltSync(10);
    this.password = bcrypt.hashSync(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

// Compare password method
UserSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compareSync(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
