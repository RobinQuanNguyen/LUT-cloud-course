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

## Upcoming feature:
- CI/CD using Github Action
- (Front-end) Indicators for unseen message
- (Front-end) New features for chat container.

---
## Resources:
### Backend:
- MongoDB (for storing user's data and message): https://www.mongodb.com/
- Cloudinary (for storing image): https://cloudinary.com/
- Arcjet (for preventing DDOS and protect the app from bot): https://app.arcjet.com/
- Sevalla (for deploying web application): https://app.sevalla.com/
- prom-client (Prometheus metrics for Node.js): https://github.com/siimon/prom-client

### Frontend:
- tailwindcss: https://v3.tailwindcss.com/
- daisyUI (v4): https://daisyui.com/?lang=en
- React-Hot-Toast: https://react-hot-toast.com/
- Cruip (Tailwind CSS template): https://cruip.com/
- Lucide (nice buttons and icons): https://lucide.dev/

### Infrastructure
- Traefik (reverse proxy & load balancing): https://traefik.io/
- Prometheus (metrics collection): https://prometheus.io/
- Grafana (metrics visualization): https://grafana.com/
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

4. View logs:
   ```bash
   docker compose logs -f frontend
   docker compose logs -f backend
   ```
   
5. Scale backend for load balancing:
    ```bash
        docker compose up --scale backend=3 -d
    ```

6. Stop all:
    ```bash
    docker compose down
    ```

    (Optional) Stop and remove volumes (if DB volumes added):
    ```bash
    docker compose down -v
    ```

## Architecture
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
                         ┌───────▼──────┐
                         │    MongoDB   │
                         │    (Atlas)   │
                         └──────────────┘
```

## Branch Strategy
- `main` — stable production code
- `hungle-dev` - HTTPS support & security (Task 10)
- `feature/traefik` — Traefik + monitoring (Task 6 & 7)
