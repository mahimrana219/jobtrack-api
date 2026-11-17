const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.JWT_SECRET = 'test-secret';
const app = require('../src/app');

let mongo;
let token;

// Uses MONGO_URI_TEST when set (CI), otherwise an in-memory MongoDB
beforeAll(async () => {
  let uri = process.env.MONGO_URI_TEST;
  if (!uri) {
    mongo = await MongoMemoryServer.create();
    uri = mongo.getUri();
  }
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

describe('Auth', () => {
  it('registers a user and returns a token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.password).toBeUndefined();
    token = res.body.token;
  });

  it('rejects a duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('rejects a wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('validates input', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });
});

describe('Applications', () => {
  let id;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  it('blocks requests without a token', async () => {
    const res = await request(app).get('/api/applications');
    expect(res.status).toBe(401);
  });

  it('creates an application', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set(auth())
      .send({ company: 'Acme', role: 'Full Stack Developer', jobUrl: 'https://acme.dev/jobs/1' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('applied');
    id = res.body._id;
  });

  it('lists, filters and searches', async () => {
    await request(app).post('/api/applications').set(auth()).send({ company: 'Globex', role: 'React Developer', status: 'interview' });
    const all = await request(app).get('/api/applications').set(auth());
    expect(all.body.total).toBe(2);
    const filtered = await request(app).get('/api/applications?status=interview').set(auth());
    expect(filtered.body.items[0].company).toBe('Globex');
    const searched = await request(app).get('/api/applications?search=acme').set(auth());
    expect(searched.body.total).toBe(1);
  });

  it('updates status', async () => {
    const res = await request(app).patch(`/api/applications/${id}`).set(auth()).send({ status: 'offer' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('offer');
  });

  it('returns pipeline stats', async () => {
    const res = await request(app).get('/api/applications/stats').set(auth());
    expect(res.body.byStatus.offer).toBe(1);
    expect(res.body.byStatus.interview).toBe(1);
    expect(res.body.responseRate).toBe(100);
  });

  it('deletes an application', async () => {
    const res = await request(app).delete(`/api/applications/${id}`).set(auth());
    expect(res.status).toBe(204);
    const again = await request(app).get(`/api/applications/${id}`).set(auth());
    expect(again.status).toBe(404);
  });
});
