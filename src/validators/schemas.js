const { z } = require('zod');
const { STATUSES } = require('../models/Application');

const register = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().pipe(z.email()),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const login = z.object({
  email: z.string().trim().pipe(z.email()),
  password: z.string().min(1),
});

const applicationBase = {
  company: z.string().trim().min(1),
  role: z.string().trim().min(1),
  status: z.enum(STATUSES).optional(),
  jobUrl: z.url().optional(),
  location: z.string().optional(),
  salary: z.string().optional(),
  appliedOn: z.coerce.date().optional(),
  followUpOn: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
};

const createApplication = z.object(applicationBase);
const updateApplication = z.object(applicationBase).partial();

const listQuery = z.object({
  status: z.enum(STATUSES).optional(),
  search: z.string().optional(),
  sort: z.enum(['newest', 'oldest', 'company']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { register, login, createApplication, updateApplication, listQuery };
