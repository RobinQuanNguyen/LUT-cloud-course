<h1>Full-stack Chat Application</h1>

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
- AI-powered Content Moderation microservice (Python/FastAPI)
- Per-user content filter toggle

## Upcoming feature:
- CI/CD using Github Action
- (Front-end) Indicators for unseen message
- (Front-end) New features for chat container.

---
## Architecture
 
- **Frontend**: React, served via Nginx
- **Backend**: Node.js/Express, JWT auth, Socket.io
- **Database**: MongoDB (Atlas)
- **Moderation microservice**: Python/FastAPI, scikit-learn ML model
- **Reverse proxy**: Traefik (routes all traffic, handles load balancing)
- **Monitoring**: Prometheus + Grafana at `/prometheus` and `/grafana`
 
```
                        ┌──────────────────┐
                        │     Traefik      │
                        │  (Reverse Proxy) │
                        │   :80, :443      │
                        └────────┬─────────┘
                                 │
              ┌──────────────────┼─────────────────┐
              │                  │                 │
       ┌──────▼───────┐   ┌──────▼──────┐   ┌──────▼───────┐
       │   Frontend   │   │   Backend   │   │  Prometheus  │
       │    (Nginx)   │   │  (Node.js)  │   │  + Grafana   │
       │     :80      │   │    :3001    │   │  Monitoring  │
       └──────────────┘   └──────┬──────┘   └──────────────┘
                                 │
                ┌────────────────┴──────────────────┐
                │                                   │
        ┌───────▼──────┐                  ┌─────────▼────────┐
        │   MongoDB    │                  │   Moderation     │
        │   (Atlas)    │                  │   microservice   │
        └──────────────┘                  │ (Python/FastAPI) │
                                          └──────────────────┘
```

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

### Moderation microservice
- FASTAPI: https://fastapi.tiangolo.com/
- scikit-learn: https://scikit-learn.org/
- Dataset (Jigsaw Toxic Comments): https://huggingface.co/datasets/thesofakillers/jigsaw-toxic-comment-classification-challenge
---

## Setup before running the application

### Backend (`/backend`)
### .env setup
```bash
PORT=3000
MONGO_URI=your_mongo_uri_here

NODE_ENV=development

JWT_SECRET=your_jwt_secret

CLIENT_URL=http://localhost:5173 (if you have a URL from Sevalla, replace the localhost with it)

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

ARCJET_KEY=your_arcjet_key
ARCJET_ENV=development
```
### Moderation microservice (`/moderation-service`)
Prerequisites: train the model first.

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
## Run Commands:

1. Have your Docker desktop ready. Make sure it's running.
2. Start all services from the project root `/LUT-cloud-course`:

    ```bash
    docker compose up --build -d
    ```

3. Access the application:
   
   | Service | URL |
    |---|---|
    | App (Frontend) | http://localhost |
    | Traefik Dashboard | http://localhost:8080 |
    | Prometheus | http://localhost/prometheus |
    | Grafana | http://localhost/grafana|
    | Message Monitoring UI | http://localhost/monitoring |
    | Moderation API | http://localhost/moderation/health |

5. View logs:
   ```bash
   docker compose logs -f frontend
   docker compose logs -f backend
   docker compose logs -f moderation-service
   ```
   
6. Scale backend for load balancing:
    ```bash
        docker compose up --scale backend=3 -d
    ```

7. Stop all:
    ```bash
    docker compose down
    ```

    (Optional) Stop and remove volumes (if DB volumes added):
    ```bash
    docker compose down -v
    ```

## Moderation-service

- FastAPI service serving predictions at /moderation/moderate
- ML model trained on Jigsaw Toxic Comments dataset (159k samples) using TF-IDF + Logistic Regression
- Prometheus metrics endpoint at /moderation/metrics - integrated into existing Grafana setup
- Model pre-loads at startup to avoid slow first request

### How it Works

- User sends a message
- Backend checks the receiver's contentFilter setting in MongoDB
- If enabled -> calls the moderation service with the message text
- If confidence > 95% toxic -> replaces text with ******** before saving
- If disabled or service unreachable -> message saves normally

### How to Test

- Train the model first: cd moderation-service && python app/train.py
- Run docker compose up --build
- Register two users
- Enable content filter on the receiver's account (shield icon)
- Send a toxic message from the sender. It should appear as ********
- Send a normal message. It should go through unchanged.

### Notes

- Model is git-ignored (moderation-service/models/*.joblib) so each developer trains locally.
- If the moderation service is unreachable, messages go through normally (fail-open)
- Model accuracy: 95% overall, 84% recall on toxic messages

## Branch Strategy
- `main` - stable production code
- `hungle-dev` - HTTPS support & security (Task 10)
- `feature/traefik` - Traefik + monitoring (Task 6 & 7)
- `microservice/content-moderation` - ML-powered moderation microservice (Task 4)
