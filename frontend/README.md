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
