# Usage Analytics Instructions

This document explains how to use the usage analytics microservice and what each query parameter means.

## 1) Service Startup Behavior

- The service name is `usage-analytics` in `docker-compose.yml`.
- It starts with Docker Compose like other services (for example Traefik, backend, frontend).
- If all services are started together, this service is included automatically:

```bash
docker compose up --build -d
```

- If you only want to rebuild/restart analytics:

```bash
docker compose up --build -d usage-analytics
```

## 2) Endpoints

- Health check:

```http
GET /usage-analytics/health
```

- Usage summary:

```http
GET /usage-analytics/summary
```

## 3) Query Parameters (Usage Summary)

### `days`

- Type: integer
- Allowed range: 1 to 365
- Meaning: how many recent days to include in the analysis window.
- Example values:
	- `days=7` for last 7 days (short-term trend)
	- `days=265` for long-term trend across 265 days

Example:

```http
GET /usage-analytics/summary?days=7
```

### `business_start`

- Type: integer
- Allowed range: 0 to 23
- Meaning: business-hours start (inclusive), in Finland local time.
- Example: `business_start=9` means business time starts at 9:00 AM.

### `business_end`

- Type: integer
- Allowed range: 1 to 24
- Meaning: business-hours end (exclusive), in Finland local time.
- Example: `business_end=18` means business time ends before 6:00 PM.

Example (9 AM to 6 PM business window):

```http
GET /usage-analytics/summary?days=7&business_start=9&business_end=18
```

### `t` (cache buster)

- Type: any value (commonly number or timestamp)
- Meaning: not used by backend logic; only used to force a fresh browser/proxy request.
- Use this when the browser might show cached results.

Example:

```http
GET /usage-analytics/summary?days=7&t=123
```

## 4) Timezone Behavior

- MongoDB timestamps are not modified.
- The service converts and groups time in `Europe/Helsinki` (Finland local time) during analytics calculation.

## 5) Quick Start

1. Start Docker Desktop.
2. Run `docker compose up --build -d` from project root.
3. Verify health endpoint:

```http
GET http://localhost/usage-analytics/health
```

4. Open summary endpoint with your preferred window:

```http
GET http://localhost/usage-analytics/summary
```
or
```http
GET http://localhost/usage-analytics/summary?days=7
```
or
```http
GET http://localhost/usage-analytics/summary?days=7&business_start=9&business_end=18
```

5. If response looks stale in browser, add cache buster:

```http
GET http://localhost/usage-analytics/summary?days=7&t=123
```

## 6) Scope Note

This version analyzes message timestamps only (`Message.createdAt`). Login/logout activity analytics is intentionally out of scope for now.
