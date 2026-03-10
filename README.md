<h1>Full-stack Chat Application</h1>

Feature:
- Custom JWT Authentication
- Real-time Messaging via Socket.io
- Online/Offline Presence Indicators
- REST API with Node.js & Express
- MongoDB for Data Persistence
- API Rate-Limiting powered by Arcjet
- Zustand for State Management
- Deployment with Sevalla

Upcoming feature:
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

### Frontend:
- tailwindcss: https://v3.tailwindcss.com/
- daisyUI (v4): https://daisyui.com/?lang=en
- React-Hot-Toast: https://react-hot-toast.com/
- Cruip (Tailwind CSS template): https://cruip.com/
- Lucide (nice buttons and icons): https://lucide.dev/

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

1. Have your Docker desktop ready. Start in background from `/LUT-cloud-course`:

    ```bash
    docker compose up --build -d
    ```

2. The app is now running at: [http://localhost:8080](http://localhost:8080)

   View logs:
   ```bash
   docker compose logs -f frontend
   docker compose logs -f backend
   ```

3. Stop all:
    ```bash
    docker compose down
    ```

    (Optional) Stop and remove volumes (if DB volumes added):
    ```bash
    docker compose down -v
    ```
