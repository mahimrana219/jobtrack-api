const mongoose = require('mongoose');
const Application = require('../models/Application');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const SORTS = { newest: { appliedOn: -1 }, oldest: { appliedOn: 1 }, company: { company: 1 } };

exports.list = async (req, res, next) => {
  try {
    const { status, search, sort, page, limit } = req.validatedQuery;
    const filter = { user: req.userId };
    if (status) filter.status = status;
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ company: rx }, { role: rx }];
    }
    const [items, total] = await Promise.all([
      Application.find(filter).sort(SORTS[sort]).skip((page - 1) * limit).limit(limit),
      Application.countDocuments(filter),
    ]);
    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const app = await Application.create({ ...req.body, user: req.userId });
    res.status(201).json(app);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const app = await Application.findOne({ _id: req.params.id, user: req.userId });
    if (!app) return res.status(404).json({ message: 'Application not found' });
    res.json(app);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const app = await Application.findOneAndUpdate({ _id: req.params.id, user: req.userId }, req.body, {
      new: true,
      runValidators: true,
    });
    if (!app) return res.status(404).json({ message: 'Application not found' });
    res.json(app);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const app = await Application.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!app) return res.status(404).json({ message: 'Application not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};

// Pipeline stats: count per status, response rate and follow-ups due
exports.stats = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const grouped = await Application.aggregate([
      { $match: { user: userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byStatus = Object.fromEntries(Application.STATUSES.map((s) => [s, 0]));
    grouped.forEach((g) => { byStatus[g._id] = g.count; });

    const sent = byStatus.applied + byStatus.interview + byStatus.offer + byStatus.rejected;
    const responded = byStatus.interview + byStatus.offer + byStatus.rejected;
    const followUpsDue = await Application.countDocuments({
      user: userId,
      status: 'applied',
      followUpOn: { $lte: new Date() },
    });

    res.json({
      total: sent + byStatus.wishlist,
      byStatus,
      responseRate: sent ? Math.round((responded / sent) * 100) : 0,
      followUpsDue,
    });
  } catch (err) {
    next(err);
  }
};
