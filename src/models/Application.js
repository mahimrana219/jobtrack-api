const mongoose = require('mongoose');

const STATUSES = ['wishlist', 'applied', 'interview', 'offer', 'rejected'];

const applicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    status: { type: String, enum: STATUSES, default: 'applied' },
    jobUrl: { type: String, trim: true },
    location: { type: String, trim: true },
    salary: { type: String, trim: true },
    appliedOn: { type: Date, default: Date.now },
    followUpOn: { type: Date },
    notes: { type: String, maxlength: 2000 },
  },
  { timestamps: true }
);

applicationSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model('Application', applicationSchema);
module.exports.STATUSES = STATUSES;
