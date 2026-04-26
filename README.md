<h1>Chatify - Full-stack Chat Application</h1>
Our project, Chatify, is a real-time chat application built with microservices, deployed on AWS EC2 using Docker Swarm. This project was built as part of the Cloud Services & Infrastructure course at LUT University.

Live: https://lut-chatify.duckdns.org

## Feature:
- Custom JWT Authentication
- Real-time Messaging via Socket.io
- Online/Offline Presence Indicators
- REST API with Node.js & Express
- MongoDB for Data Persistence
- API Rate-Limiting powered by Arcjet
- Zustand for State Management
- Deployment with Sevalla
- Reverse Proxy & Load Balancing with Traefik
- Monitoring & Metrics with Prometheus & Grafana
- Log aggregation with Loki & Promtail
- AI-powered Content Moderation microservice (Python/FastAPI)
- Spam & Phishing detection microservice (Python/FastAPI)
- Usage analytics microservice (Python/FastAPI)
- Chat analytics microservice (Python/FastAPI)
- Per-user content filter toggle
- Containerized deployment with Docker Swarm & Portainer on AWS EC2
- CI/CD pipeline with GitHub Actions

## Possible features for future development:
- (Front-end) Indicators for unseen message
- (Front-end) New features for chat container.

---
## Architecture
 
- **Frontend**: React, served via Nginx
- **Backend**: Node.js/Express, JWT auth, Socket.io
- **Database**: MongoDB (Atlas)
- **Moderation microservice**: Python/FastAPI, scikit-learn ML model to detect toxic content
- **Chat safety microservice**: Python/FastAPI to detect spam and phishing
- **Usage analytics microservice**: Python/FastAPI, usage pattern analysis for analyzing peak usage hours
- **Chat analytics microservice**: Python/FastAPI for conversation-level analytics
- **Reverse proxy**: Traefik (routes all traffic, handles load balancing)
- **Monitoring**: Prometheus + Grafana + Loki + Promtail
- **Deployment**: Docker Swarm on AWS EC2, managed via Portainer Dashboard
 
```
                        ┌──────────────────┐
                        │     Traefik      │
                        │  (Reverse Proxy) │
                        │  :80 :443 :8080  │
                        └────────┬─────────┘
                                 │
         ┌───────────────────────┼────────────────────────┐
         │                       │                        │
  ┌──────▼───────┐       ┌───────▼──────┐         ┌───────▼──────┐
  │   Frontend   │       │   Backend    │         │  Prometheus  │
  │    (Nginx)   │       │  (Node.js)   │         │  + Grafana   │
  │     :80      │       │    :3001     │         │  + Loki      │
  └──────────────┘       └──────┬───────┘         └──────────────┘
                                │
      ┌─────────────────────────┼──────────────────────────┐
      │                         │                          │
┌─────▼──────┐      ┌───────────▼────────┐   ┌─────────────▼────────────┐
│  MongoDB   │      │   Moderation +     │   │  Usage Analytics +       │
│  (Atlas)   │      │   Chat Safety      │   │  Chat Analytics          │
└────────────┘      │  (Python/FastAPI)  │   │  (Python/FastAPI)        │
                    └────────────────────┘   └──────────────────────────┘

All services run inside Docker Swarm on AWS EC2, managed via Portainer.

```
| Service | URL |
|---|---|
| App (Frontend) | https://lut-chatify.duckdns.org |
| Grafana | https://lut-chatify.duckdns.org/grafana |
| Prometheus | https://lut-chatify.duckdns.org/prometheus |
| Usage Analytics | https://lut-chatify.duckdns.org/usage-analytics/summary |
| Traefik Dashboard | https://lut-chatify.duckdns.org:8080 |
| Portainer | https://lut-chatify.duckdns.org:9000 |
 
For a full step-by-step deployment guide, see [docs/docker-swarm.md](docs/docker-swarm.md).


## Resources:
### Backend:
- MongoDB (for storing user's data and message): https://www.mongodb.com/
- Cloudinary (for storing image): https://cloudinary.com/
- Arcjet (for preventing DDOS and protect the app from bot): https://app.arcjet.com/
- prom-client (Prometheus metrics for Node.js): https://github.com/siimon/prom-client

### Frontend:
- Tailwind CSS: https://v3.tailwindcss.com/
- daisyUI (v4): https://daisyui.com/?lang=en
- React-Hot-Toast: https://react-hot-toast.com/
- Cruip (Tailwind CSS template): https://cruip.com/
- Lucide (nice buttons and icons): https://lucide.dev/

### Infrastructure
- Traefik (reverse proxy & load balancing): https://traefik.io/
- Prometheus (metrics collection): https://prometheus.io/
- Grafana (metrics visualization): https://grafana.com/
- Loki: https://grafana.com/oss/loki/
- Docker Swarm (container orchestration): https://docs.docker.com/engine/swarm/
- Portainer (Docker management UI): https://www.portainer.io/
- AWS EC2 (cloud server): https://aws.amazon.com/ec2/

### Moderation microservice
- FASTAPI: https://fastapi.tiangolo.com/
- scikit-learn: https://scikit-learn.org/
- Dataset (Jigsaw Toxic Comments): https://huggingface.co/datasets/thesofakillers/jigsaw-toxic-comment-classification-challenge

---

## Local Development Setup

### 1. Clone the repository
 
```bash
git clone https://github.com/RobinQuanNguyen/LUT-cloud-course.git
cd LUT-cloud-course
```

### 2. Configure environment variables
 
Create `backend/.env`:
 
```bash
RUN_PORT=3001
MONGO_URI=your_mongo_uri_here
MONGO_URI_TEST=your_test_mongo_uri_here
NODE_ENV=development
JWT_SECRET=your_jwt_secret
CLIENT_URL=http://localhost
ALLOWED_ORIGINS=http://localhost,http://localhost:5173
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
ARCJET_KEY=your_arcjet_key
ARCJET_ENV=development
```

### 3. Train the moderation model (one-time setup)
**Moderation microservice (`/moderation-service`)**


The service requires a pre-trained model file. Run this once before starting the stack:
```bash
#recommended to create virtual environment
cd moderation-service
python -m venv .venv
 
# Mac/Linux
source .venv/bin/activate
 
# Windows
.venv\Scripts\activate
 
pip install scikit-learn pandas numpy joblib datasets
python app/train.py
```
This downloads the dataset automatically and saves the model to `moderation-service/models/moderation_model.joblib`.

---

### 4. Start all services
 
```bash
docker compose up --build -d
```
### 5. Access the application
 
| Service | URL |
|---|---|
| App (Frontend) | http://localhost |
| Traefik Dashboard | http://localhost:8080 |
| Grafana | http://localhost/grafana |
| Prometheus | http://localhost/prometheus |
| Usage Analytics | http://localhost/usage-analytics/summary |
| Moderation health | http://localhost/moderation/health |
| Chat Safety health | http://localhost/risk/health |
| Chat Analytics health | http://localhost/analytics/health |

### 6. Useful commands
 
```bash
# View logs
docker compose logs -f backend
docker compose logs -f moderation-service
 
# Scale backend for load balancing testing
docker compose up --scale backend=3 -d
 
# Stop all services
docker compose down
 
# Stop and remove volumes
docker compose down -v
```
 
---


## Moderation-service

- FastAPI service serving predictions at /moderation/moderate
- ML model trained on Jigsaw Toxic Comments dataset (159k samples) using TF-IDF + Logistic Regression
- Prometheus metrics endpoint at /moderation/metrics - integrated into existing Grafana setup
- Model pre-loads at startup to avoid slow first request

### How it Works

- User sends a message
- Backend calls moderation service and chat safety service in parallel
- If toxic (confidence > 95%) → message replaced with `********`
- If spam or phishing detected → message blocked entirely
- If services are unreachable → message goes through normally (fail-open)


### How to Test

- Train the model first: cd moderation-service && python app/train.py
- Run docker compose up --build
- Register two users
- Enable content filter on the receiver's account (shield icon)
- Send a toxic message from the sender. It should appear as ********
- Send a normal message. It should go through unchanged.

---

## Usage Analytics Microservice

- FastAPI service serving analytics data at `/usage-analytics/summary`
- Reads message activity from MongoDB and calculates usage trends over time
- Supports quick-range analysis such as 1 day, 7 days, 30 days, and custom date ranges
- Returns message totals, business-hours vs off-hours activity, hourly usage breakdown, and text vs image percentages

### How it Works

- The frontend monitoring page calls the usage analytics service
- The service reads message timestamps from MongoDB
- It groups messages by hour in Finland local time (`Europe/Helsinki`)
- It calculates:
  - total messages
  - business-hours and off-hours counts
  - peak usage and lowest usage periods
  - text vs image message distribution
- The result is shown as charts and summary cards on the monitoring page

### How to Test

- Run `docker compose up --build`
- Open `http://localhost/usage-analytics/summary` for raw JSON output
- Or open the monitoring UI in the app and test:
  - quick ranges such as last 7 days
  - custom start and end times
  - updated charts after sending more messages

### Notes

- This service analyzes message records only
- It does not currently analyze login/logout events
- If there are very few messages in the database, the charts will still work but may look sparse

---

## Chat Safety Service

The Chat Safety Service is a Python/FastAPI microservice that helps protect users from risky chat messages. Its main purpose is to detect spam, phishing messages, suspicious links, and unsafe message patterns before the message is delivered to the receiver.

This service is different from the moderation service. The moderation service focuses mainly on toxic language detection using a machine learning model, while the Chat Safety Service focuses on spam and phishing detection using rule-based analysis.

### Main Features

- Detects spam-like messages
- Detects phishing-related language
- Detects suspicious URLs and unsafe links
- Checks for repeated punctuation and excessive uppercase text
- Supports single-message analysis
- Supports batch-message analysis
- Returns a risk score, risk level, detected flags, and explanations

### Main Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/risk/health` | GET | Checks if the service is running |
| `/risk/analyze` | POST | Analyzes one message for spam, phishing, or suspicious content |
| `/risk/analyze-batch` | POST | Analyzes multiple messages at once |
| `/risk/demo` | GET | Runs a demo with sample safe and risky messages |

### How it Works

When a user sends a message, the backend can send the message content to the Chat Safety Service. The service checks the message and calculates a risk score from 0 to 100.

A low score means the message is likely safe. A higher score means the message may contain spam, phishing, or suspicious content. The service also returns flags and explanations so the backend can understand why the message was considered risky.

If the message is detected as spam or phishing, the backend can block the message before it reaches the receiver. This helps improve user safety and reduces harmful messages in the chat application.

### How to Test

Start the full application:

```bash
docker compose up --build
```

Check if the service is running:

```bash
curl http://localhost/risk/health
```

Test a risky message:

```bash
curl -X POST http://localhost/risk/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "messageId": "m1",
    "senderId": "user1",
    "text": "CLICK NOW!!! Verify your account immediately at http://fake-login.xyz"
  }'
```

Expected result: the service should return a higher risk score with warning flags such as suspicious link, phishing language, spam language, or repeated punctuation.

### Notes

- This service uses rule-based detection.
- It is useful for detecting spam and phishing patterns quickly.
- It works together with the backend before the message is delivered.
- It improves the safety and reliability of the chat application.

---

## Chat Analytics Service

The Chat Analytics Service is a Python/FastAPI microservice that records and analyzes chat activity in the Chatify application. Its main purpose is to provide useful information about how users interact with the chat system.

This service helps the project show how microservices can be used not only for core chat features, but also for analytics, reporting, and monitoring user behavior.

### Main Features

- Records single message events
- Records multiple message events in batch
- Calculates user-level chat statistics
- Finds peak activity hours
- Shows trending keywords from chat messages
- Shows conversation statistics between users
- Provides overall system activity overview
- Provides daily activity timeline

### Main Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/analytics/health` | GET | Checks if the service is running |
| `/analytics/event/message` | POST | Records one message event |
| `/analytics/event/message-batch` | POST | Records multiple message events |
| `/analytics/user/{user_id}` | GET | Shows analytics for one user |
| `/analytics/peak-times` | GET | Shows the most active hours and days |
| `/analytics/trending` | GET | Shows trending keywords |
| `/analytics/conversations/{user_id}` | GET | Shows conversation statistics for one user |
| `/analytics/overview` | GET | Shows overall chat system statistics |
| `/analytics/activity-timeline` | GET | Shows daily activity over time |

### How it Works

When a user sends a message, the backend sends a message event to the Chat Analytics Service. The event includes information such as the sender ID, receiver ID, message text, and timestamp.

The service stores the event and uses it to calculate different analytics results. For example, it can show how many messages were sent, which hours are the most active, which users are active, and which keywords appear often in conversations.

The service can calculate:

- Total number of messages
- Number of active days
- Average messages per day
- Peak messaging hour
- Hourly message distribution
- Most active conversation partners
- Average message length
- Trending keywords
- Daily activity timeline

These analytics can help developers and administrators understand how the chat system is being used.

### How to Test

Start the full application:

```bash
docker compose up --build
```

Check if the service is running:

```bash
curl http://localhost/analytics/health
```

Record a test message:

```bash
curl -X POST http://localhost/analytics/event/message \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": "alice",
    "receiverId": "bob",
    "text": "Hello Bob, let us discuss the project meeting today"
  }'
```

View the overall analytics:

```bash
curl http://localhost/analytics/overview
```

View peak activity times:

```bash
curl http://localhost/analytics/peak-times
```

View trending keywords:

```bash
curl http://localhost/analytics/trending
```

### Notes

- This service is useful for analyzing chat behavior.
- It can help show user activity patterns in the system.
- It supports both single-message and batch-message events.
- In production, the analytics data should be stored in a persistent database such as MongoDB.
---

## Key Deployment Files
 
| File | Purpose |
|---|---|
| `docker-compose.yml` | Local development |
| `docker-stack.yml` | Cloud deployment (Docker Swarm on EC2) |
| `traefik.yml` | Traefik config for local (`providers.docker`) |
| `traefik.swarm.yml` | Traefik config for cloud (`providers.swarm` + HTTPS) |
| `promtail-config.yml` | Log collection config for Loki |
| `monitoring/prometheus.yml` | Prometheus scrape config |
| `monitoring/grafana-dashboard.json` | Exportable Grafana dashboard |
| `docs/docker-swarm.md` | Step-by-step EC2 deployment guide |


## Branch Strategy
| Branch | Purpose |
|---|---|
| `main` | Stable production code |
| `feat/integrated-with-swarm` | All services integrated + Docker Swarm + HTTPS + Loki |
| `feat/docker-swarm-portainer` | Docker Swarm & Portainer deployment (Task 9) |
| `hungle-dev` | HTTPS support & security (Task 10) |
| `feature/traefik` | Traefik + monitoring (Task 6 & 7) |
| `microservice/content-moderation` | ML-powered moderation microservice (Task 4) |
| `feature/integrate-services` | Teammate microservices integration |
 
### Additional Notes

- Model is git-ignored (moderation-service/models/*.joblib) so each developer trains locally.
- If the moderation service is unreachable, messages go through normally (fail-open)
- Model accuracy: 95% overall, 84% recall on toxic messages
