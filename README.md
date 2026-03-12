# Skip the Hold

Skip the Hold is a production-ready full-stack web application for checking crowd-sourced customer service hold times before you call and for reporting your own wait times.

## Stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Node.js with Express
- Database: PostgreSQL
- ORM: Prisma
- Auth: JWT for user and admin sessions
- Deployment: Docker-ready single container app with PostgreSQL support

## Project Structure

```text
.
|-- backend
|   |-- package.json
|   |-- prisma
|   |   |-- schema.prisma
|   |   `-- migrations
|   |-- scripts
|   |   `-- seed.js
|   `-- src
|       |-- app.js
|       |-- server.js
|       |-- config
|       |-- middleware
|       |-- routes
|       |-- services
|       `-- utils
|-- database
|   `-- companies.csv
|-- docker
|   |-- Dockerfile
|   `-- docker-compose.yml
|-- frontend
|   |-- index.html
|   |-- company.html
|   |-- login.html
|   |-- admin.html
|   |-- css
|   `-- js
`-- README.md
```

## Features

- Search companies by name or industry
- View average hold times and recent reports
- See trending hold times reported today
- Get a best-time-to-call recommendation based on historical report timing
- Submit wait times and beta signups
- JWT auth for user accounts and admin access
- Admin dashboard for company management, moderation, and analytics
- Imports 300 companies from `database/companies.csv` and seeds sample reports
- Responsive UI that works on mobile and desktop

## Local Setup

### Option 1: Docker

1. Start the application:

   ```bash
   docker compose -f docker/docker-compose.yml up --build
   ```

2. Open [http://localhost:8080](http://localhost:8080).

### Option 2: Run without Docker

1. Copy `backend/.env.example` to `backend/.env`.
2. Install dependencies:

   ```bash
   cd backend
   npm install
   ```

3. Run migrations:

   ```bash
   npm run prisma:generate
   npx prisma migrate deploy
   ```

4. Seed the database:

   ```bash
   node scripts/seed.js
   ```

   This imports Companies from `database/companies.csv`, ensures the admin user exists, and adds sample wait-time reports if the table is empty.

5. Start the server:

   ```bash
   npm run dev
   ```

6. Visit [http://localhost:8080](http://localhost:8080).

## Environment Variables

`backend/.env.example` includes:

- `DATABASE_URL`
- `PORT`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `FRONTEND_ORIGIN`
- `ANALYTICS_TIMEZONE`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Default Admin Account

The seed script creates or updates an admin user from:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Change these values before deploying.

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/companies`
- `GET /api/companies/search?q=`
- `GET /api/companies/:id`
- `GET /api/companies/:id/average`
- `GET /api/companies/:id/best-time`
- `POST /api/waittimes`
- `GET /api/trending`
- `POST /api/beta-signup`
- `GET /api/admin/analytics`
- `POST /api/admin/companies`
- `PUT /api/admin/companies/:id`
- `DELETE /api/admin/waittimes/:id`

## Deploying to a Cloud Host

This repository is containerized, so any host that supports Docker can run it. A straightforward path is:

1. Provision a managed PostgreSQL database.
2. Deploy this repo as a Docker web service.
3. Set the environment variables from `backend/.env.example`.
4. Point the app at the managed Postgres instance with `DATABASE_URL`.
5. Set `FRONTEND_ORIGIN` to your public app URL.
6. Keep `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `JWT_SECRET` in secure environment variables.

### Example: Render

1. Create a PostgreSQL database in Render.
2. Create a new Web Service from this repo and choose Docker deployment.
   Use `docker/Dockerfile` as the Docker build file.
3. Add the environment variables from `backend/.env.example`.
4. Deploy. The container runs Prisma migrations automatically on startup.
5. After the first deploy, confirm the seeded admin account can log in at `/login.html`.
6. If you want a faster setup path, this repo also includes [render.yaml](./render.yaml) so you can deploy it as a Render Blueprint.

Official docs:

- Render Web Services: https://render.com/docs/web-services
- Docker on Render: https://render.com/docs/docker
- Render Postgres: https://render.com/docs/databases

### Custom Domain: `skiptheholdapp.com`

1. Add your custom domain in the cloud host dashboard.
2. Create the DNS records the host gives you:
   - usually a `CNAME` for `www`
   - and either `A`, `ALIAS`, or `ANAME` records for the apex domain
3. Set `FRONTEND_ORIGIN=https://skiptheholdapp.com`.
4. If you want both root and `www`, configure one as the primary domain and redirect the other.
5. Wait for SSL provisioning, then test:
   - `https://skiptheholdapp.com`
   - `https://www.skiptheholdapp.com`

Official custom-domain guide:

- Render Custom Domains: https://render.com/docs/custom-domains

## Production Checklist

- Replace the default JWT secret
- Rotate admin credentials
- Restrict CORS to the production domain
- Add your monitoring and logging provider
- Back up the production database
- Enable platform-managed SSL
