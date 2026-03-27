from fastapi import FastAPI
from app.config import settings
from app.models import MessageInput, BatchAnalyzeInput
from app.analyzer import analyze_one, analyze_batch, build_summary

app = FastAPI(
    title=settings.SERVICE_NAME,
    version=settings.SERVICE_VERSION
)

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": settings.SERVICE_NAME,
        "version": settings.SERVICE_VERSION
    }


@app.post("/risk/analyze")
def analyze_message(payload: MessageInput):
    result = analyze_one(payload.model_dump())
    return result


@app.post("/risk/analyze-batch")
def analyze_messages(payload: BatchAnalyzeInput):
    results = analyze_batch([m.model_dump() for m in payload.messages])
    summary = build_summary(results)

    return {
        "summary": summary,
        "results": results
    }


@app.get("/risk/demo")
def risk_demo():
    demo_messages = [
        {
            "messageId": "m1",
            "senderId": "u1",
            "text": "CLICK NOW!!! Verify your account immediately at http://fake-login.xyz"
        },
        {
            "messageId": "m2",
            "senderId": "u2",
            "text": "Hello, how are you today?"
        },
        {
            "messageId": "m3",
            "senderId": "u3",
            "text": "BUY NOW!!! LIMITED OFFER!!! FREE MONEY!!!"
        }
    ]

    results = analyze_batch(demo_messages)
    summary = build_summary(results)

    return {
        "summary": summary,
        "results": results
    }