# Setup And Maintenance Guide

This guide combines the base setup information already present on `main` with the deployment and infrastructure updates found on the current branch.

It was prepared by reviewing the setup-oriented documents and configuration files in this branch, especially:

- [README.md](../README.md)
- dockerswarm.md
- [backend/README.md](../backend/README.md)
- [frontend/README.md](../frontend/README.md)
- [usage-analytics/instruction.md](../usage-analytics/instruction.md)
- [docker-compose.yml](../docker-compose.yml)
- [docker-compose.secure.yml](../docker-compose.secure.yml)
- [.github/workflows/backend-ci.yml](../.github/workflows/backend-ci.yml)

## 1) Project Overview

This project is a containerized full-stack chat application with:

- a React frontend served by Nginx
- a Node.js / Express backend with JWT authentication and Socket.IO
- a Python moderation microservice
- a Python usage analytics microservice
- Traefik as reverse proxy
- Prometheus and Grafana for monitoring in the extended local stack
- Docker Swarm and Portainer guidance on this branch for cloud deployment

## 2) Prerequisites

Before setup, make sure these tools are available:

- Docker Desktop
- Node.js and npm
- Python 3
- Git

Optional but useful:

- AWS account for EC2 deployment
- Docker Hub account for pushing images
- Portainer for visual container management

## 3) Repository Setup

Clone the repository and move into the project root:

```bash
git clone <repository-url>
cd LUT-cloud-course
```

If you are working on branch-specific deployment features, confirm the active branch:

```bash
git branch --show-current
```

## 4) Environment Configuration

The backend relies on environment variables from a local `.env` file under `backend/`.

At minimum, configure:

```bash
RUN_PORT=3001
MONGO_URI=your_mongodb_uri
MONGO_URI_TEST=your_test_mongodb_uri
NODE_ENV=development
JWT_SECRET=your_secret
CLIENT_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost,http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_value
CLOUDINARY_API_KEY=your_value
CLOUDINARY_API_SECRET=your_value
ARCJET_KEY=your_value
ARCJET_ENV=development
```

For secure deployment on this branch, additional values are relevant:

```bash
APP_DOMAIN=your-domain.example.com
TLS_EMAIL=your-email@example.com
COOKIE_DOMAIN=your-domain.example.com
```

## 5) One-Time Service Preparation

### Moderation Service

The moderation service requires a trained model file before first use.

```bash
cd moderation-service
python -m venv .venv
```

Activate the virtual environment:

```bash
# Windows
.venv\Scripts\activate

# Mac/Linux
source .venv/bin/activate
```

Install training dependencies and build the model:

```bash
pip install scikit-learn pandas numpy joblib datasets
python app/train.py
```

This creates:

- `moderation-service/models/moderation_model.joblib`

## 6) Local Development Setup

The easiest local setup is the full Docker Compose stack from [docker-compose.yml](../docker-compose.yml).

Start the stack:

```bash
docker compose up --build -d
```

Useful local URLs:

| Service | URL |
|---|---|
| Frontend app | `http://localhost` |
| Traefik dashboard | `http://localhost:8080` |
| Prometheus | `http://localhost/prometheus` |
| Grafana | `http://localhost/grafana` |
| Usage analytics | `http://localhost/usage-analytics/health` |
| Moderation health | `http://localhost/moderation/health` |

To view logs:

```bash
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f moderation-service
docker compose logs -f usage-analytics
```

To stop everything:

```bash
docker compose down
```

To stop and remove volumes:

```bash
docker compose down -v
```

## 7) Service-Specific Setup And Run Commands

### Backend

Backend scripts from [backend/package.json](../backend/package.json):

```bash
cd backend
npm ci
npm run dev
```

Other useful backend commands:

```bash
npm start
npm test
```

### Frontend

Frontend scripts from [frontend/package.json](../frontend/package.json):

```bash
cd frontend
npm ci
npm run dev
```

Other useful frontend commands:

```bash
npm run build
npm run preview
npm run lint
```

### Usage Analytics

The service is primarily run through Docker Compose, but the API behavior is documented in [usage-analytics/instruction.md](../usage-analytics/instruction.md).

Key endpoints:

- `GET /usage-analytics/health`
- `GET /usage-analytics/summary`

## 8) Testing And CI

The backend CI workflow is defined in [.github/workflows/backend-ci.yml](../.github/workflows/backend-ci.yml).

It currently:

- installs backend dependencies
- starts the backend server
- waits for `/health`
- runs Jest tests

To run backend tests locally:

```bash
cd backend
npm test
```

To make tests succeed reliably, ensure:

- the backend can start
- `MONGO_URI_TEST` or `MONGO_URI` is valid
- `JWT_SECRET` is set
- `API_BASE_URL` points to the running backend when required by HTTP-based tests

## 9) Secure HTTPS Deployment

This branch adds a more cloud-oriented deployment option via [docker-compose.secure.yml](../docker-compose.secure.yml).

This setup uses:

- Traefik v3
- HTTPS on ports `80` and `443`
- Let's Encrypt certificate resolver
- an `edge` network and an `app_internal` network
- security middleware from [infra/traefik/dynamic/security.yml](../infra/traefik/dynamic/security.yml)

Run the secure stack:

```bash
docker compose -f docker-compose.secure.yml up --build -d
```

## 10) Docker Swarm And Portainer Deployment

This branch also includes a Docker Swarm deployment guide in dockerswarm.md.

Use that path when you need:

- AWS EC2 deployment
- Docker Swarm manager setup
- Portainer UI management
- image push workflow using Docker Hub

High-level Swarm deployment steps:

1. Build and push images to Docker Hub
2. Launch an EC2 instance
3. Install Docker
4. Initialize Swarm
5. Deploy Portainer
6. Upload config files and `.env`
7. Deploy the stack

## 11) Routine Maintenance Tasks

### Daily / Frequent

- check service health endpoints
- inspect logs for backend, moderation, and analytics services
- confirm frontend and API routing still work through Traefik
- verify tests still pass after backend changes

### Weekly

- review Grafana dashboards and Prometheus metrics
- confirm disk usage on the Docker host
- check for failed or restarting containers
- rotate or review any exposed secrets if needed

### Before Release

- rebuild images cleanly
- run backend tests
- confirm `.env` values match the target environment
- verify Traefik routing rules and exposed URLs
- re-check moderation model availability

## 12) Troubleshooting Guide

### Frontend loads, but API calls fail

Check:

- backend container is healthy
- Traefik routes `/api` correctly
- `CLIENT_URL` and `ALLOWED_ORIGINS` are correct

### Backend exits on startup

Common causes:

- missing `MONGO_URI`
- missing `JWT_SECRET`
- invalid environment configuration

### Moderation service does not respond

Check:

- model file exists at `moderation-service/models/moderation_model.joblib`
- service container is running
- backend can reach the moderation service hostname

### Analytics page returns errors

Check:

- `MONGO_URI` is valid for the analytics service
- query parameters are valid
- message collection contains data

### HTTPS deployment does not issue certificates

Check:

- `APP_DOMAIN` points to the correct host
- ports `80` and `443` are publicly reachable
- `TLS_EMAIL` is set
- Traefik can write to `acme.json`

## 13) Recommended Documentation Order For New Team Members

For onboarding, read in this order:

1. [README.md](../README.md)
2. [backend/README.md](../backend/README.md)
3. [frontend/README.md](../frontend/README.md)
4. [usage-analytics/instruction.md](../usage-analytics/instruction.md)
5. dockerswarm.md for cloud deployment on this branch

## 14) Branch-Specific Summary

Compared with `main`, this branch adds or emphasizes:

- Docker Swarm and Portainer deployment guidance
- AWS EC2 deployment workflow
- HTTPS-focused secure Docker Compose setup
- more architecture and documentation artifacts under [docs](.)

That makes this branch especially relevant for deployment, operations, and documentation work.
