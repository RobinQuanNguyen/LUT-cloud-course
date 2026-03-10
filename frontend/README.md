# Frontend Route And Feature Flow Diagrams

This document explains how the frontend works using diagrams for routing, authentication, chat state, API calls, and realtime messaging.

## 1) Frontend Boot And Route Guard Flow

```mermaid
flowchart TB
	A[Browser loads app] --> B[main.jsx renders BrowserRouter and App]
	B --> C[App mounts]
	C --> D[useAuthStore.checkAuth]
	D --> E{Auth check loading}
	E -->|Yes| F[Show PageLoader]
	E -->|No| G{authUser exists}

	G -->|Yes| H[Route slash goes to ChatPage]
	G -->|No| I[Route slash redirects to login]

	J[Route slash login] --> K{authUser exists}
	K -->|No| L[Show LoginPage]
	K -->|Yes| H

	M[Route slash signup] --> N{authUser exists}
	N -->|No| O[Show SignUpPage]
	N -->|Yes| H
```

## 2) Auth Actions To Backend

Routes used by frontend:
- `GET /api/auth/check`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `PUT /api/auth/update-profile`

```mermaid
sequenceDiagram
	autonumber
	participant U as User
	participant P as LoginPage or SignUpPage
	participant S as useAuthStore
	participant API as axiosInstance slash api
	participant BE as Backend auth routes
	participant SO as socket io client

	U->>P: Submit auth form
	P->>S: signUp or logIn
	S->>API: POST auth endpoint
	API->>BE: Request with credentials
	BE-->>API: Success and cookie jwt
	API-->>S: Auth user payload
	S->>S: set authUser
	S->>SO: connectSocket
	SO-->>S: getOnlineUsers events
	S-->>P: Loading false and success toast
```

## 3) Chat Page Composition And Data Loading

```mermaid
flowchart LR
	A[ChatPage] --> B[Left panel]
	A --> C[Right panel]

	B --> D[ProfileHeader]
	B --> E[ActiveTabSwitch]
	E --> F{activeTab}
	F -->|chats| G[ChatList]
	F -->|contacts| H[ContactList]

	G --> I[useChatStore.getMyChatPartners]
	H --> J[useChatStore.getAllContacts]
	I --> K[GET message slash chats]
	J --> L[GET message slash contacts]

	C --> M{selectedUser exists}
	M -->|No| N[NoConversationPlaceHolder]
	M -->|Yes| O[ChatContainer]
	O --> P[getMessagesByUserId]
	P --> Q[GET message slash userId]
```

## 4) Send Message And Realtime Update

```mermaid
sequenceDiagram
	autonumber
	participant U as User
	participant MI as MessageInput
	participant CS as useChatStore
	participant API as axiosInstance
	participant BE as Backend message routes
	participant SOCK as socket io

	U->>MI: Type text or choose image
	U->>MI: Click send
	MI->>CS: sendMessage messageData
	CS->>CS: Add optimistic message to state
	CS->>API: POST message send slash selectedUserId
	API->>BE: Persist message
	BE-->>API: Created saved message
	API-->>CS: Response data
	CS->>CS: Replace optimistic message with saved message
	BE-->>SOCK: Emit newMessage to receiver if online
	SOCK-->>CS: newMessage event on subscribed client
	CS->>CS: Update messages and chats ordering
```

## 5) Socket Lifecycle In Frontend

```mermaid
flowchart TD
	A[Auth success or checkAuth success] --> B[useAuthStore.connectSocket]
	B --> C[Create socket io client with credentials]
	C --> D[Connect to backend socket endpoint]
	D --> E[Listen getOnlineUsers]
	E --> F[Update onlineUsers in auth store]

	G[ChatContainer selects user] --> H[subscribeToMessages]
	H --> I[socket off newMessage]
	I --> J[socket on newMessage]
	J --> K{Message sender equals selected user}
	K -->|Yes| L[Append to open conversation]
	K -->|No| M[Highlight sender chat and show toast]

	N[Logout] --> O[disconnectSocket]
	O --> P[Socket disconnected]
```

## 6) Store Responsibility Map

- `useAuthStore`: auth user state, auth requests, socket connection, online users.
- `useChatStore`: contacts, chats, messages, selected user, send message, subscribe and unsubscribe to realtime events.
- `axiosInstance`: base URL and cookie credentials for all API requests.

## Notes

- Frontend routing is protected at component level in `App.jsx` using `Navigate`.
- JWT is stored in cookies by backend and sent automatically because axios uses `withCredentials: true`.
- Message sending uses optimistic UI for fast feedback, then reconciles with backend response.

---

## 7) Nginx Request Flow

Nginx runs inside the frontend container and routes incoming requests:

```mermaid
flowchart LR
	B["Browser<br/>localhost:8080"] --> N["Nginx<br/>Port 80"]
	N --> R{Request Path}
	
	R -->|/ or /assets/*<br/>or other static| SF["Serve Static<br/>Files<br/>(React dist/)"]
	R -->|/api/*| BP["Proxy to Backend<br/>http://backend:3001"]
	R -->|/socket.io/*| SIO["Proxy to Backend<br/>http://backend:3001<br/>(WebSocket Upgrade)"]
	R -->|Any other route| SPA["SPA Fallback<br/>Serve index.html"]
	
	BP --> BE["Backend API<br/>(Express)"]
	SIO --> BE
	SF --> B
	SPA --> B
	BE --> B
```

**Key Nginx Rules:**
- `client_max_body_size 10M` - Allows large image uploads in messages
- `try_files $uri $uri/ /index.html` - SPA routing fallback
- `proxy_read_timeout 600s` and `proxy_send_timeout 600s` - WebSocket stability
- `Upgrade` + `Connection "upgrade"` headers - WebSocket protocol support

---

## 8) Docker Compose Architecture

When you run `docker compose up --build`, both containers are created on a shared Docker network:

```mermaid
flowchart TB
	subgraph Host["Host Machine (Windows)"]
		Port["Port 8080"]
	end
	
	subgraph DockerNet["Docker Network<br/>(lut-cloud-course_default)"]
		FE["Frontend Container<br/>(lut-frontend)<br/>Nginx on :80"]
		BE["Backend Container<br/>(lut-backend)<br/>Express on :3001"]
	end
	
	Browser["Browser<br/>http://localhost:8080"] --> Port
	Port --> FE
	FE -->|Proxies /api<br/>and /socket.io| BE
	FE -->|Uses hostname<br/>'backend:3001'| BE
	BE --> MongoDB["MongoDB<br/>(external)"]
	BE --> Cloudinary["Cloudinary<br/>(external)"]
	
	style FE fill:#e1f5ff
	style BE fill:#fff3e0
	style DockerNet fill:#f5f5f5
```

**Container Details:**
- **Frontend**: Node.js build stage → Nginx serving React dist in final stage. Exposes port 80 (mapped to host 8080).
- **Backend**: Node.js running Express. Exposes port 3001 (internal only, not directly accessible from host).
- **Network**: Both containers share `lut-cloud-course_default` network, so `backend` hostname resolves to the backend container's internal IP.

**Docker Compose Flow:**
1. `docker compose up --build` reads `docker-compose.yml`
2. Builds both Dockerfiles (frontend and backend) if images don't exist
3. Creates shared network and both containers
4. Starts backend first (dependency), then frontend
5. Routes requests: Browser → Port 8080 → Nginx → /api proxies to backend:3001 → Express

**Run Commands:**
```bash
# Start in background
docker compose up --build -d

# View logs
docker compose logs -f frontend
docker compose logs -f backend

# Stop all
docker compose down

# Stop and remove volumes (if DB volumes added)
docker compose down -v
```
