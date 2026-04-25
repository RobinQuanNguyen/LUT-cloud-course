from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from prometheus_client import make_asgi_app, Counter, Histogram
from app.model import predict, load_model
import time

app = FastAPI(title="[Python] Content Moderation Service")

@app.on_event("startup")
def startup_event():
    print("Pre-loading model into memory...")
    load_model()

# Prometheus metrics
request_count = Counter(
    "moderation_requests_total", 
    "Total number of moderation requests", 
    ["labels"])

request_duration = Histogram(
    "moderation_request_duration_seconds",
    "Request duration "
)

metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

class ModerationRequest(BaseModel):
    text: str

class ModerationResponse(BaseModel):
    label: str # "toxic" or "safe"
    confidence: float # 0.0 to 1.0
    scores: dict # {"safe": 0.12, "toxic": 0.88}
    flagged: bool # True if content is flagged as toxic AND confidence > threshold

THRESHOLD = 0.5 # Flag as toxic if model is >50% sure that it's toxic

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/moderate", response_model=ModerationResponse)
def moderate(request: ModerationRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    start_time = time.time()
    result = predict(request.text)
    duration = time.time() - start_time

    request_count.labels(labels=result["label"]).inc()
    request_duration.observe(duration)

    flagged = (result["label"] == "toxic") and (result["confidence"] > THRESHOLD)

    return ModerationResponse(
        label=result["label"],
        confidence=result["confidence"],
        scores=result["scores"],
        flagged=flagged
    )