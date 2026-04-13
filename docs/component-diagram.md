# Component Diagram

This UML-style component diagram shows the main microservices in the project and their dependencies.

```mermaid
flowchart LR
    user["User / Browser"]

    subgraph edge["Edge Layer"]
        traefik["Traefik Reverse Proxy"]
    end

    subgraph app["Application Components"]
        frontend["Frontend (Vite + Nginx)"]
        backend["Backend API Service (Node.js / Express / Socket.IO)"]
        moderation["Moderation Service (Python)"]
        analytics["Usage Analytics Service (Python)"]
    end

    subgraph observability["Observability"]
        prometheus["Prometheus"]
        grafana["Grafana"]
    end

    subgraph external["External Dependencies"]
        mongo["MongoDB"]
        cloudinary["Cloudinary"]
    end

    user --> traefik

    traefik --> frontend
    traefik --> backend
    traefik --> analytics
    traefik --> moderation
    traefik --> prometheus
    traefik --> grafana

    frontend --> backend
    backend --> mongo
    backend --> cloudinary
    backend --> moderation
    analytics --> mongo
    prometheus -.scrapes .-> backend
    grafana --> prometheus
```

## Notes

- `Traefik` is the entry point for incoming HTTP traffic and routes requests to the correct service.
- `Backend API Service` is the main application service and depends on `MongoDB`, `Cloudinary`, and the `Moderation Service`.
- `Usage Analytics Service` is a separate microservice that reads analytics-related data from `MongoDB`.
- `Prometheus` collects metrics from the backend, and `Grafana` visualizes those metrics.
