# Docker Swarm & Portainer Deployment Guide

A beginner-friendly guide to deploying the LUT Cloud Course app on AWS EC2 using Docker Swarm and Portainer.

---

## What is Docker Swarm?

Docker Swarm is Docker's built-in container orchestration tool. While regular Docker runs containers on one machine, Docker Swarm lets you manage containers across multiple machines (called **nodes**) as a single cluster.

**Key concepts:**
- **Manager node** — the brain of the cluster. Schedules tasks and manages the cluster state. Our EC2 instance is this.
- **Worker nodes** — machines that just run containers. You can add more EC2 instances as workers later.
- **Services** — instead of `docker run`, in Swarm you deploy *services*. A service says "I want 2 copies of this container running at all times."
- **Stack** — a group of services defined in a `docker-stack.yml` file, deployed together.

## What is Portainer?

Portainer is a **web UI for managing Docker**. Instead of typing CLI commands, you get a visual dashboard where you can see all running containers, deploy stacks, view logs, and monitor resources. It runs as a container inside your Swarm.

---

## Architecture Overview

```
Internet / Users
       │
       ▼
AWS EC2 Instance (Ubuntu)
└── Docker Swarm (manager node)
    ├── Traefik        ← reverse proxy, routes traffic
    ├── Frontend       ← React/Nginx
    ├── Backend        ← Node.js
    ├── Usage Analytics ← Python microservice
    ├── Moderation     ← Python microservice
    ├── Prometheus     ← metrics
    ├── Grafana        ← dashboards
    └── Portainer      ← web UI to manage everything
```

---

## Prerequisites

- An AWS account (free tier works)
- Docker Desktop installed locally
- A DockerHub account (free at https://hub.docker.com)
- Your `.pem` key file from AWS

---

## Step 1 — Push Images to DockerHub

Docker Swarm cannot build images — it only pulls pre-built images from a registry. So first, build and push all custom images.

```bash
# Login to DockerHub
docker login

# Build and push each image (replace 'yourname' with your DockerHub username)
docker build -t yourname/lut-backend ./backend
docker push yourname/lut-backend

docker build -t yourname/lut-frontend ./frontend
docker push yourname/lut-frontend

docker build -t yourname/lut-usage-analytics ./usage-analytics
docker push yourname/lut-usage-analytics

docker build -t yourname/lut-moderation-service ./moderation-service
docker push yourname/lut-moderation-service
```

> **Tip:** After pushing, if you update your code you need to rebuild and push again. This is why we set up CI/CD with GitHub Actions to automate this.

---

## Step 2 — Launch an EC2 Instance on AWS

1. Go to https://console.aws.amazon.com and search for **EC2**
2. Click **Launch Instance** and fill in:
   - **Name:** `lut-swarm`
   - **OS:** Ubuntu 24.04 LTS
   - **Instance type:** `t3.micro` (free tier)
   - **Key pair:** Create new → name it `lut-key` → download the `.pem` file (keep it safe!)
   - **Storage:** 8GB (default is fine)

3. For the **security group**, check:
   - ✅ Allow SSH traffic → Anywhere
   - ✅ Allow HTTP traffic → Anywhere
   - ✅ Allow HTTPS traffic → Anywhere

4. After launching, go to **Edit inbound rules** and add:
   - Port `8080` (Traefik dashboard) → My IP
   - Port `9000` (Portainer) → My IP

> ⚠️ **Never commit your `.pem` file to Git!** Add `*.pem` to your `.gitignore` immediately.

---

## Step 3 — SSH Into Your EC2 Instance

Find your **Public IPv4 address** on the EC2 instance page, then:

**On Mac/Linux:**
```bash
chmod 400 lut-key.pem
ssh -i lut-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

**On Windows (PowerShell):**
```powershell
# Fix permissions first
icacls "C:\path\to\lut-key.pem" /inheritance:r /grant:r "$($env:USERNAME):(R)"

# Then SSH
ssh -i "C:\path\to\lut-key.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

Type `yes` when asked about the fingerprint.

---

## Step 4 — Install Docker on EC2

Once SSH'd in, run:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Allow ubuntu user to run Docker without sudo
sudo usermod -aG docker ubuntu
newgrp docker

# Verify installation
docker --version
```

---

## Step 5 — Initialize Docker Swarm

```bash
docker swarm init --advertise-addr YOUR_EC2_PUBLIC_IP
```

You'll see:
```
Swarm initialized: current node is now a manager.
```

Your EC2 instance is now a Swarm manager node.

---

## Step 6 — Deploy Portainer

```bash
# Create a volume for Portainer data
docker volume create portainer_data

# Deploy Portainer as a Swarm service
docker service create \
  --name portainer \
  --publish 9000:9000 \
  --constraint 'node.role == manager' \
  --mount type=bind,src=/var/run/docker.sock,dst=/var/run/docker.sock \
  --mount type=volume,src=portainer_data,dst=/data \
  portainer/portainer-ce:latest
```

Open your browser: `http://YOUR_EC2_PUBLIC_IP:9000`

- Create an admin account
- Click **Get Started** → **Live connect**

You now have a visual dashboard for your Swarm!

---

## Step 7 — Upload Config Files to EC2

Create the app folder on EC2:
```bash
mkdir -p ~/app/monitoring
```

Then from your **local machine**, upload the config files:

**Mac/Linux:**
```bash
scp -i lut-key.pem traefik.swarm.yml ubuntu@YOUR_EC2_PUBLIC_IP:~/app/
scp -i lut-key.pem docker-stack.yml ubuntu@YOUR_EC2_PUBLIC_IP:~/app/
scp -i lut-key.pem monitoring/prometheus.yml ubuntu@YOUR_EC2_PUBLIC_IP:~/app/monitoring/
```

**Windows (PowerShell):**
```powershell
scp -i "C:\path\to\lut-key.pem" traefik.swarm.yml ubuntu@YOUR_EC2_PUBLIC_IP:~/app/
scp -i "C:\path\to\lut-key.pem" docker-stack.yml ubuntu@YOUR_EC2_PUBLIC_IP:~/app/
scp -i "C:\path\to\lut-key.pem" monitoring/prometheus.yml ubuntu@YOUR_EC2_PUBLIC_IP:~/app/monitoring/
```

Create your `.env` file on EC2:
```bash
nano ~/app/.env
```

Add all your backend environment variables (no spaces around `=`):
```
RUN_PORT=3001
MONGO_URI=your_mongodb_uri
NODE_ENV=production
JWT_SECRET=your_secret
CLIENT_URL=http://YOUR_EC2_PUBLIC_IP
CLOUDINARY_CLOUD_NAME=your_value
CLOUDINARY_API_KEY=your_value
CLOUDINARY_API_SECRET=your_value
ARCJET_KEY=your_value
ARCJET_ENV=production
```

Save with `Ctrl+X` → `Y` → `Enter`.

---

## Step 8 — Deploy Your Stack

```bash
cd ~/app
docker stack deploy -c docker-stack.yml lut-app
```

Check all services are running:
```bash
docker service ls
```

All services should show `1/1` replicas. ✅

---

## Verifying Everything Works

| URL | What you should see |
|---|---|
| `http://YOUR_EC2_PUBLIC_IP` | Frontend app |
| `http://YOUR_EC2_PUBLIC_IP/grafana` | Grafana dashboard |
| `http://YOUR_EC2_PUBLIC_IP/prometheus` | Prometheus metrics |
| `http://YOUR_EC2_PUBLIC_IP:8080` | Traefik dashboard |
| `http://YOUR_EC2_PUBLIC_IP:9000` | Portainer UI |

---

## Useful Commands

```bash
# Check all services
docker service ls

# Check a specific service's logs
docker service logs lut-app_backend --tail 20

# Check containers for a service
docker service ps lut-app_backend

# Redeploy the stack (after updating docker-stack.yml)
docker stack deploy -c docker-stack.yml lut-app

# Force restart a service
docker service update --force lut-app_backend

# Remove the stack
docker stack rm lut-app
```

---

## Important Notes

### Stopping EC2 to Save Costs
You can **Stop** the instance when not using it (not Terminate — that deletes it):
- **EC2 → Instances → Instance state → Stop instance**

> ⚠️ Your public IP changes every time you restart the instance! Set up an **Elastic IP** in AWS to keep a static IP.

### docker-compose.yml vs docker-stack.yml
| File | Used for |
|---|---|
| `docker-compose.yml` | Local development |
| `docker-stack.yml` | EC2 / Docker Swarm deployment |

### traefik.yml vs traefik.swarm.yml
| File | Used for |
|---|---|
| `traefik.yml` | Local development (`providers.docker`) |
| `traefik.swarm.yml` | EC2 deployment (`providers.swarm`) |

### Key differences between docker-compose and docker-stack
| docker-compose | docker-stack |
|---|---|
| `container_name:` | Not supported — remove it |
| `build:` | Not supported — use pre-built images |
| `restart: unless-stopped` | Use `deploy.restart_policy` |
| `networks: bridge` | Use `networks: overlay` |
| Labels at service level | Labels must be under `deploy:` |
| Relative volume paths | Use absolute paths |