# Microservice Detail Diagrams

This document expands the high-level component view and explains each microservice in more detail.

## 1) Backend API Service

### Internal Component Diagram

```mermaid
flowchart LR
    client["Frontend / Browser"]

    subgraph backend["Backend API Service"]
        server["Express Server + Socket.IO"]
        authRoutes["Auth Routes"]
        messageRoutes["Message Routes"]
        middleware["Security / Validation / Auth Middleware"]
        authController["Auth Controller"]
        messageController["Message Controller"]
        socketLayer["Socket Layer"]
    end

    db["MongoDB"]
    cloudinary["Cloudinary"]
    moderation["Moderation Service"]
    prom["Prometheus Metrics"]

    client --> server
    server --> middleware
    middleware --> authRoutes
    middleware --> messageRoutes
    authRoutes --> authController
    messageRoutes --> messageController
    messageController --> socketLayer
    authController --> db
    messageController --> db
    messageController --> cloudinary
    messageController --> moderation
    server --> prom
```

### Request Processing Flow

```mermaid
flowchart TD
    request["Incoming Request"] --> cors["CORS + JSON + Cookie Parsing"]
    cors --> routes{"Route Type"}

    routes -->|"GET /health"| health["Return status ok"]
    routes -->|"GET /metrics"| metrics["Return Prometheus metrics"]
    routes -->|"/api/auth/*"| auth["Auth Route Pipeline"]
    routes -->|"/api/message/*"| message["Message Route Pipeline"]

    auth --> middleware1["Validation / Auth / Arcjet"]
    middleware1 --> authHandler["Auth Controller Logic"]
    authHandler --> db1["MongoDB"]

    message --> middleware2["Auth + Arcjet + Validation"]
    middleware2 --> messageHandler["Message Controller Logic"]
    messageHandler --> db2["MongoDB"]
    messageHandler --> moderationCall["Moderation Service"]
    messageHandler --> cloudinaryCall["Cloudinary"]
    messageHandler --> socketEmit["Socket.IO event emission"]
```

## 2) Moderation Service

### Internal Component Diagram

```mermaid
flowchart LR
    backend["Backend API"]

    subgraph moderation["Moderation Service (FastAPI)"]
        api["FastAPI App"]
        modelLoader["Model Loader"]
        predictor["Prediction Logic"]
        threshold["Toxicity Threshold Check"]
        metrics["Prometheus Metrics"]
    end

    storedModel["Trained Model File (.joblib)"]

    backend --> api
    api --> predictor
    api --> metrics
    predictor --> modelLoader
    modelLoader --> storedModel
    predictor --> threshold
```

### Moderation Request Flow

```mermaid
sequenceDiagram
    autonumber
    participant B as Backend
    participant M as Moderation API
    participant P as Predictor
    participant T as Threshold Logic
    participant X as Metrics

    B->>M: POST /moderate { text }
    M->>M: Validate non-empty text
    M->>P: predict(text)
    P-->>M: label + confidence + scores
    M->>X: increment counters / observe duration
    M->>T: flagged = toxic AND confidence > 0.95
    T-->>M: flagged true/false
    M-->>B: label, confidence, scores, flagged
```

## 3) Usage Analytics Service

### Internal Component Diagram

```mermaid
flowchart LR
    client["Browser / User / Traefik"]

    subgraph analytics["Usage Analytics Service (FastAPI)"]
        api["FastAPI Endpoints"]
        validation["Query Parameter Validation"]
        timeLogic["Time Window + Timezone Logic"]
        aggregation["MongoDB Aggregation Pipelines"]
        formatter["Summary Formatter"]
    end

    mongo["MongoDB Messages Collection"]

    client --> api
    api --> validation
    validation --> timeLogic
    timeLogic --> aggregation
    aggregation --> mongo
    aggregation --> formatter
    formatter --> api
```

### Analytics Processing Flow

```mermaid
flowchart TD
    request["GET /usage-analytics/summary"] --> validate["Validate query parameters"]
    validate --> mode{"Window mode"}

    mode -->|"days"| days["Compute relative time window"]
    mode -->|"start_time + end_time"| custom["Parse custom ISO datetime range"]
    mode -->|"none"| allTime["Use all-time data"]

    days --> match["Build MongoDB match filter"]
    custom --> match
    allTime --> match

    match --> hourly["Aggregate hourly message counts"]
    match --> types["Aggregate text vs image counts"]

    hourly --> summary["Compute totals, peak hours, lowest hours"]
    types --> summary
    summary --> response["Return formatted analytics JSON"]
```

## 4) Service-to-Service Communication Summary

```mermaid
flowchart LR
    frontend["Frontend"] --> backend["Backend API"]
    backend --> mongo["MongoDB"]
    backend --> moderation["Moderation Service"]
    backend --> cloudinary["Cloudinary"]
    analytics["Usage Analytics"] --> mongo
    prometheus["Prometheus"] -.scrapes.-> backend
    grafana["Grafana"] --> prometheus
```
