# Chat Analytics Service - Testing Guide

## Overview

Chat Analytics Service is a microservice that records and analyzes chat activity for the Chatify application.

**Base URL:** `http://localhost/analytics`

---

## Endpoints

### 1. Health Check
```
GET /health
```
Check if the service is running.
```bash
curl http://localhost/health
```
**Response:**
```json
{
  "status": "ok",
  "service": "Chat Analytics",
  "version": "1.0.0"
}
```

---

### 2. Record Single Message
```
POST /event/message
Content-Type: application/json

{
  "senderId": "user_id_1",
  "receiverId": "user_id_2",
  "text": "Hello world"
}
```
```bash
curl -X POST http://localhost/event/message \
  -H "Content-Type: application/json" \
  -d '{"senderId":"user123","receiverId":"user456","text":"Hello Analytics!"}'
```
**Response:**
```json
{
  "status": "recorded",
  "message_id": 1
}
```

---

### 3. Record Multiple Messages (Batch)
```
POST /event/message-batch
Content-Type: application/json

[
  {"senderId": "...", "receiverId": "...", "text": "..."},
  {"senderId": "...", "receiverId": "...", "text": "..."}
]
```
```bash
curl -X POST http://localhost/event/message-batch \
  -H "Content-Type: application/json" \
  -d '[
    {"senderId":"user1","receiverId":"user2","text":"Hello!"},
    {"senderId":"user2","receiverId":"user1","text":"Hi there!"}
  ]'
```

---

### 4. User Analytics
```
GET /analytics/user/{user_id}?days=7
```
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| user_id | path | required | User ID to analyze |
| days | query | 7 | Number of days to analyze (1-90) |

```bash
curl "http://localhost/analytics/user/user123?days=7"
```
**Response:**
```json
{
  "user_id": "user123",
  "period_days": 7,
  "total_messages": 25,
  "active_days": 5,
  "avg_messages_per_day": 5.0,
  "peak_hour": 14,
  "peak_hour_label": "14:00 - 15:00",
  "hourly_distribution": {"9": 3, "14": 12, "20": 10},
  "top_keywords": [
    {"keyword": "project", "count": 8},
    {"keyword": "meeting", "count": 5}
  ]
}
```

---

### 5. Peak Times
```
GET /analytics/peak-times?days=7
```
Analyze when users are most active.
```bash
curl "http://localhost/analytics/peak-times?days=7"
```
**Response:**
```json
{
  "period_days": 7,
  "total_events": 150,
  "hourly_peak": 20,
  "peak_hour_label": "20:00 - 21:00",
  "hourly_distribution": [
    {"hour": 9, "count": 15, "percentage": 10.0},
    {"hour": 14, "count": 30, "percentage": 20.0},
    {"hour": 20, "count": 45, "percentage": 30.0}
  ],
  "daily_distribution": [
    {"day": "Monday", "day_index": 0, "count": 25, "percentage": 16.7},
    {"day": "Tuesday", "day_index": 1, "count": 30, "percentage": 20.0}
  ]
}
```

---

### 6. Trending Keywords
```
GET /analytics/trending?user_id=&limit=10
```
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| user_id | query | null (all) | Filter by user |
| limit | query | 10 | Number of keywords (1-50) |

```bash
curl "http://localhost/analytics/trending?limit=10"
```
**Response:**
```json
{
  "trending_keywords": [
    {"keyword": "meeting", "count": 45, "percentage": 15.5},
    {"keyword": "project", "count": 38, "percentage": 13.1},
    {"keyword": "deadline", "count": 25, "percentage": 8.6}
  ],
  "total_keywords": 290
}
```

---

### 7. Conversation Stats
```
GET /analytics/conversations/{user_id}?days=30
```
View how many conversations a user has.
```bash
curl "http://localhost/analytics/conversations/user123?days=30"
```
**Response:**
```json
{
  "user_id": "user123",
  "total_conversations": 12,
  "total_messages": 580,
  "avg_message_length_chars": 45.2,
  "most_active_partners": [
    ["user456", 120],
    ["user789", 85],
    ["user111", 60]
  ],
  "conversation_partners_count": 12
}
```

---

### 8. System Overview
```
GET /analytics/overview
```
Get overall chat statistics.
```bash
curl http://localhost/analytics/overview
```
**Response:**
```json
{
  "total_messages": 5000,
  "unique_senders": 150,
  "unique_receivers": 200,
  "unique_users": 300,
  "avg_message_length": 35.5,
  "store_size": 5000,
  "keyword_store_size": 12500
}
```

---

### 9. Activity Timeline
```
GET /analytics/activity-timeline?user_id=&days=7
```
View daily activity breakdown.
```bash
curl "http://localhost/analytics/activity-timeline?days=7"
```
**Response:**
```json
{
  "timeline": [
    {
      "date": "2026-04-08",
      "messages": 45,
      "hourly": {"9": 5, "14": 15, "20": 25}
    },
    {
      "date": "2026-04-09",
      "messages": 38,
      "hourly": {"10": 8, "15": 20, "21": 10}
    }
  ],
  "total_events": 83
}
```

---

## Quick Test with PowerShell

### 1. Check service health
```powershell
Invoke-RestMethod -Uri "http://localhost/health"
```

### 2. Send test messages
```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost/event/message" `
  -ContentType "application/json" `
  -Body '{"senderId":"alice","receiverId":"bob","text":"Hello Bob!"}'

Invoke-RestMethod -Method Post -Uri "http://localhost/event/message" `
  -ContentType "application/json" `
  -Body '{"senderId":"bob","receiverId":"alice","text":"Hi Alice!"}'

Invoke-RestMethod -Method Post -Uri "http://localhost/event/message" `
  -ContentType "application/json" `
  -Body '{"senderId":"alice","receiverId":"bob","text":"Meeting at 3pm today"}'
```

### 3. View analytics results
```powershell
# Overview
Invoke-RestMethod -Uri "http://localhost/analytics/overview"

# Peak times
Invoke-RestMethod -Uri "http://localhost/analytics/peak-times"

# Trending keywords
Invoke-RestMethod -Uri "http://localhost/analytics/trending"

# User stats for alice
Invoke-RestMethod -Uri "http://localhost/analytics/user/alice"

# Alice's conversations
Invoke-RestMethod -Uri "http://localhost/analytics/conversations/alice"

# Activity timeline
Invoke-RestMethod -Uri "http://localhost/analytics/activity-timeline"
```

---

## Reset Data (Clear All Data)

Since the service uses in-memory storage, restarting the container will clear all data:
```powershell
docker compose restart chat-analytics-service
```

---

## Important Notes

1. **Data is not persistent** - Restarting the container will lose all data
2. **Production requires MongoDB** - Replace in-memory storage with a real database
3. **Keywords** - Automatically extracted from message text (stopwords removed, words 4+ characters)
4. **Backend Integration** - Backend automatically sends analytics events when messages are sent

---

## Container Info

- **Container Name:** `lut-chat-analytics-service`
- **Internal Port:** `8001`
- **External Access:** via Traefik at `/analytics/*`