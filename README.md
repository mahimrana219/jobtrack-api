# JobTrack API

A REST API for tracking job applications, built with **Node.js, Express and MongoDB**.
Users sign up, log in with JWT, and manage their own pipeline: add applications, move them through stages, search and filter them, and see pipeline stats like response rate and follow-ups due.

![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)

## Features

- **JWT authentication**: register, login, `GET /me`; passwords hashed with bcrypt and never returned
- **Per-user data**: every query is scoped to the logged-in user, so nobody can read or edit another user's records
- **CRUD for applications** with statuses: `wishlist`, `applied`, `interview`, `offer`, `rejected`
- **Filter, search, sort and paginate**: `?status=interview&search=react&sort=newest&page=1&limit=20`
- **Pipeline stats**: count per status, response rate, and how many follow-ups are due
- **Request validation with Zod**: clear `400` errors listing each bad field
- **Security basics**: Helmet headers, CORS, rate limiting on auth routes, body size limit, regex-escaped search
- **Tests**: Node's built-in test runner + Supertest integration tests, run on every push with GitHub Actions and a real MongoDB service

## Project structure

```
src/
  app.js                 Express app: middleware, routes, error handling
  server.js              Entry point: connects MongoDB and starts the server
  config/db.js
  models/                User, Application (Mongoose schemas + indexes)
  controllers/           Route logic
  routes/                /api/auth, /api/applications
  middleware/            JWT auth, Zod validation, error handler
  validators/schemas.js  Zod schemas
tests/api.test.js        Integration tests
```

## Getting started

```bash
git clone https://github.com/mahimrana219/jobtrack-api.git
cd jobtrack-api
npm install
cp .env.example .env     # set MONGO_URI and JWT_SECRET
npm run dev
```

Run the tests (uses an in-memory MongoDB, or `MONGO_URI_TEST` if set):

```bash
npm test
```

## API

All `/api/applications` routes need the header `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an account, returns `{ user, token }` |
| POST | `/api/auth/login` | Log in, returns `{ user, token }` |
| GET | `/api/auth/me` | Current user |
| GET | `/api/applications` | List with `status`, `search`, `sort`, `page`, `limit` |
| POST | `/api/applications` | Add an application |
| GET | `/api/applications/:id` | Get one |
| PATCH | `/api/applications/:id` | Update (e.g. move to `interview`) |
| DELETE | `/api/applications/:id` | Delete |
| GET | `/api/applications/stats` | Pipeline stats |

### Example

```bash
curl -X POST http://localhost:5000/api/applications \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"company":"Acme","role":"Full Stack Developer","status":"applied","followUpOn":"2026-11-24"}'
```

`GET /api/applications/stats` returns:

```json
{
  "total": 12,
  "byStatus": { "wishlist": 2, "applied": 6, "interview": 3, "offer": 1, "rejected": 0 },
  "responseRate": 40,
  "followUpsDue": 2
}
```

## Author

**Mahim Rana**, Full-Stack Developer (MERN · Next.js · Flutter)
[Portfolio](https://mahimrana-portfolio.vercel.app) · [LinkedIn](https://www.linkedin.com/in/mahimrana219)

## License

MIT
