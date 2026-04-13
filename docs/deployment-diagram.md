# Deployment Diagram

This diagram illustrates the deployment setup used by the project, based on the Docker Compose configuration.

The main cloud-style deployment is described by:

- [docker-compose.secure.yml](../docker-compose.secure.yml)
- [infra/traefik/traefik.yml](../infra/traefik/traefik.yml)
- [infra/traefik/dynamic/security.yml](../infra/traefik/dynamic/security.yml)

The larger local/dev stack in [docker-compose.yml](../docker-compose.yml) extends this with monitoring and logging services such as Prometheus, Grafana, Loki, and Promtail.

## 1) Cloud Deployment Diagram

```mermaid
flowchart TB
    user["User Browser"]
    internet["Internet / HTTPS"]

    subgraph cloud["Cloud Host / VM"]
        subgraph edge["Edge Network"]
            traefik["Traefik Reverse Proxy
TLS termination
Security middleware"]
            frontend["Frontend Container
Nginx + React build"]
        end

        subgraph internal["Internal App Network"]
            backend["Backend Container
Node.js / Express / Socket.IO"]
        end
    end

    acme["Let's Encrypt ACME"]
    mongo["MongoDB Atlas / External MongoDB"]
    cloudinary["Cloudinary"]
    moderation["Moderation Service"]

    user --> internet
    internet --> traefik
    acme --> traefik

    traefik --> frontend
    frontend --> backend
    backend --> mongo
    backend --> cloudinary
    backend --> moderation
```

## 2) Extended Local / Coursework Deployment Diagram

```mermaid
%%{init: {'flowchart': {'rankSpacing': 40, 'nodeSpacing': 35}}}%%
flowchart TB
    user["User Browser"]
    classDef hidden fill:none,stroke:none,color:none;
    classDef header fill:none,stroke:none,color:#333,font-weight:bold;

    subgraph host["Docker Host"]
        subgraph edge[" "]
            edgeHeader["app_internal / edge access"]
            traefik["Traefik"]
        end

        subgraph app[" "]
            direction TB
            appPad[" "]
            appHeader["Application Services"]
            frontend["Frontend"]
            backend["Backend"]
            analytics["Usage Analytics"]
            moderation["Moderation Service"]
        end

        subgraph observe[" "]
            direction TB
            observePad[" "]
            observeHeader["Observability Services"]
            grafana["Grafana"]
            prometheus["Prometheus"]
            loki["Loki"]
            promtail["Promtail"]
        end
    end

    subgraph external[" "]
        direction LR
        externalPad[" "]
        externalHeader["External Services"]
        mongo["MongoDB"]
        cloudinary["Cloudinary"]
    end

    class appPad,observePad,externalPad hidden;
    class edgeHeader,appHeader,observeHeader,externalHeader header;

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
    prometheus --> backend
    grafana --> prometheus
    grafana --> loki
    promtail --> loki
```

## Notes

- In the secure deployment, `Traefik` is the public entry point and handles HTTPS termination with Let's Encrypt.
- The `frontend` container is the public web application exposed through Traefik.
- The `backend` container is not directly exposed to the internet; it is reached through the reverse proxy and internal network path.
- The backend depends on external services such as `MongoDB` and `Cloudinary`.
- The local/coursework deployment also includes `usage-analytics`, `prometheus`, `grafana`, `loki`, and `promtail`.
- The secure deployment uses separate Docker networks:
  - `edge` for publicly routed services
  - `app_internal` for internal service communication
