const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test-secret';
const app = require('../src/app');

let mongo;
let token;

// Uses MONGO_URI_TEST when set (CI), otherwise an in-memory MongoDB
before(async () => {
  let uri = process.env.MONGO_URI_TEST;
  if (!uri) {
    mongo = await MongoMemoryServer.create();
    uri = mongo.getUri();
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  await mongoose.connection.dropDatabase();
});

after(async () => {
  if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe('Auth', () => {
  it('registers a user and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });
    assert.equal(res.status, 201);
    assert.ok(res.body.token !== undefined);
    assert.equal(res.body.user.password, undefined);
    token = res.body.token;
  });

  it('rejects a duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });
    assert.equal(res.status, 409);
  });

  it('rejects a wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'wrongpass' });
    assert.equal(res.status, 401);
  });

  it('validates input', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'bad' });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.length > 0);
  });
});

describe('Applications', () => {
  let id;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('blocks requests without a token', async () => {
    const res = await request(app).get('/api/applications');
    assert.equal(res.status, 401);
  });

  it('creates an application', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set(auth())
      .send({ company: 'Acme', role: 'Full Stack Developer', jobUrl: 'https://acme.dev/jobs/1' });
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'applied');
    id = res.body._id;
  });

  it('lists, filters and searches', async () => {
    await request(app).post('/api/applications').set(auth()).send({ company: 'Globex', role: 'React Developer', status: 'interview' });
    const all = await request(app).get('/api/applications').set(auth());
    assert.equal(all.body.total, 2);
    const filtered = await request(app).get('/api/applications?status=interview').set(auth());
    assert.equal(filtered.body.items[0].company, 'Globex');
    const searched = await request(app).get('/api/applications?search=acme').set(auth());
    assert.equal(searched.body.total, 1);
  });

  it('updates status', async () => {
    const res = await request(app).patch(`/api/applications/${id}`).set(auth()).send({ status: 'offer' });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'offer');
  });

  it('returns pipeline stats', async () => {
    const res = await request(app).get('/api/applications/stats').set(auth());
    assert.equal(res.body.byStatus.offer, 1);
    assert.equal(res.body.byStatus.interview, 1);
    assert.equal(res.body.responseRate, 100);
  });

  it('deletes an application', async () => {
    const res = await request(app).delete(`/api/applications/${id}`).set(auth());
    assert.equal(res.status, 204);
    const again = await request(app).get(`/api/applications/${id}`).set(auth());
    assert.equal(again.status, 404);
  });
});
