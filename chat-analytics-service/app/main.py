from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Optional
from collections import Counter
import re

from app.config import settings

app = FastAPI(
    title=settings.SERVICE_NAME,
    version=settings.SERVICE_VERSION
)

# In-memory storage (replace with MongoDB in production)
activity_store = []
keyword_store = []


def extract_keywords(text: str) -> List[str]:
    words = re.findall(r'\b[a-zA-Z]{4,}\b', text.lower())
    stopwords = {
        'this', 'that', 'with', 'have', 'from', 'they', 'been', 'will',
        'would', 'could', 'what', 'when', 'where', 'which', 'their',
        'there', 'here', 'about', 'some', 'into', 'your', 'each',
        'time', 'just', 'like', 'know', 'want', 'think', 'good', 'very'
    }
    return [w for w in words if w not in stopwords]


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": settings.SERVICE_NAME,
        "version": settings.SERVICE_VERSION
    }


class MessageEvent(BaseModel):
    senderId: str
    receiverId: str
    text: str = ""
    timestamp: Optional[datetime] = None


class MessageEventInput(BaseModel):
    senderId: str
    receiverId: str
    text: str = ""


@app.post("/event/message")
async def record_message_event(event: MessageEventInput):
    timestamp = datetime.utcnow()
    hour = timestamp.hour
    day_of_week = timestamp.weekday()
    keywords = extract_keywords(event.text)
    message_length = len(event.text)

    record = {
        "type": "message",
        "sender_id": event.senderId,
        "receiver_id": event.receiverId,
        "text": event.text,
        "timestamp": timestamp,
        "hour": hour,
        "day_of_week": day_of_week,
        "keywords": keywords,
        "message_length": message_length
    }

    activity_store.append(record)
    keyword_store.extend(keywords)

    return {
        "status": "recorded",
        "message_id": len(activity_store)
    }


@app.post("/event/message-batch")
async def record_message_batch(events: List[MessageEventInput]):
    timestamp = datetime.utcnow()
    records = []

    for event in events:
        hour = timestamp.hour
        day_of_week = timestamp.weekday()
        keywords = extract_keywords(event.text)

        record = {
            "type": "message",
            "sender_id": event.senderId,
            "receiver_id": event.receiverId,
            "text": event.text,
            "timestamp": timestamp,
            "hour": hour,
            "day_of_week": day_of_week,
            "keywords": keywords,
            "message_length": len(event.text)
        }
        records.append(record)

    activity_store.extend(records)
    for event in events:
        keyword_store.extend(extract_keywords(event.text))

    return {
        "status": "recorded",
        "count": len(records)
    }


@app.get("/analytics/user/{user_id}")
async def get_user_analytics(
    user_id: str,
    days: int = Query(default=7, ge=1, le=90)
):
    cutoff = datetime.utcnow() - timedelta(days=days)
    user_events = [
        e for e in activity_store
        if e["sender_id"] == user_id and e["timestamp"] > cutoff
    ]

    if not user_events:
        raise HTTPException(
            status_code=404,
            detail=f"No data found for user {user_id} in the last {days} days"
        )

    hourly_counts = Counter(e["hour"] for e in user_events)
    peak_hour = hourly_counts.most_common(1)[0][0] if hourly_counts else 0

    daily_counts = Counter(e["timestamp"].date() for e in user_events)
    active_days = len(daily_counts)

    user_keywords = []
    for e in user_events:
        user_keywords.extend(e.get("keywords", []))

    keyword_counts = Counter(user_keywords).most_common(10)

    return {
        "user_id": user_id,
        "period_days": days,
        "total_messages": len(user_events),
        "active_days": active_days,
        "avg_messages_per_day": round(len(user_events) / active_days, 2) if active_days else 0,
        "peak_hour": peak_hour,
        "peak_hour_label": f"{peak_hour:02d}:00 - {(peak_hour + 1) % 24:02d}:00",
        "hourly_distribution": {str(k): v for k, v in hourly_counts.items()},
        "top_keywords": [
            {"keyword": k, "count": c}
            for k, c in keyword_counts
        ]
    }


@app.get("/analytics/peak-times")
async def get_peak_times(days: int = Query(default=7, ge=1, le=90)):
    cutoff = datetime.utcnow() - timedelta(days=days)
    recent_events = [e for e in activity_store if e["timestamp"] > cutoff]

    if not recent_events:
        return {
            "period_days": days,
            "total_events": 0,
            "hourly_peak": 0,
            "hourly_distribution": [],
            "daily_distribution": []
        }

    hourly = Counter(e["hour"] for e in recent_events)
    total = len(recent_events)

    hourly_distribution = [
        {
            "hour": h,
            "count": c,
            "percentage": round(c / total * 100, 1)
        }
        for h, c in sorted(hourly.items())
    ]

    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    daily = Counter(e["day_of_week"] for e in recent_events)

    daily_distribution = [
        {
            "day": day_names[d],
            "day_index": d,
            "count": c,
            "percentage": round(c / total * 100, 1)
        }
        for d, c in sorted(daily.items())
    ]

    peak_hour = max(hourly.items(), key=lambda x: x[1])[0] if hourly else 0

    return {
        "period_days": days,
        "total_events": total,
        "hourly_peak": peak_hour,
        "peak_hour_label": f"{peak_hour:02d}:00 - {(peak_hour + 1) % 24:02d}:00",
        "hourly_distribution": hourly_distribution,
        "daily_distribution": daily_distribution
    }


@app.get("/analytics/trending")
async def get_trending_topics(
    user_id: Optional[str] = None,
    limit: int = Query(default=10, ge=1, le=50)
):
    if user_id:
        keywords = []
        for e in activity_store:
            if e["sender_id"] == user_id:
                keywords.extend(e.get("keywords", []))
    else:
        keywords = keyword_store[-5000:] if len(keyword_store) > 5000 else keyword_store

    if not keywords:
        return {
            "trending_keywords": [],
            "total_keywords": 0
        }

    keyword_counts = Counter(keywords).most_common(limit)
    total = sum(c for _, c in keyword_counts)

    return {
        "trending_keywords": [
            {
                "keyword": k,
                "count": c,
                "percentage": round(c / total * 100, 1) if total else 0
            }
            for k, c in keyword_counts
        ],
        "total_keywords": len(keywords)
    }


@app.get("/analytics/conversations/{user_id}")
async def get_conversation_stats(
    user_id: str,
    days: int = Query(default=30, ge=1, le=365)
):
    cutoff = datetime.utcnow() - timedelta(days=days)
    user_events = [
        e for e in activity_store
        if (e["sender_id"] == user_id or e["receiver_id"] == user_id)
        and e["timestamp"] > cutoff
    ]

    partners = set(
        e["receiver_id"] if e["sender_id"] == user_id else e["sender_id"]
        for e in user_events
    )

    msg_lengths = [e["message_length"] for e in user_events]
    avg_length = sum(msg_lengths) / len(msg_lengths) if msg_lengths else 0

    partner_activity = {}
    for partner in partners:
        partner_events = [
            e for e in user_events
            if e["sender_id"] == partner or e["receiver_id"] == partner
        ]
        partner_activity[partner] = len(partner_events)

    return {
        "user_id": user_id,
        "total_conversations": len(partners),
        "total_messages": len(user_events),
        "avg_message_length_chars": round(avg_length, 1),
        "most_active_partners": sorted(
            partner_activity.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5],
        "conversation_partners_count": len(partners)
    }


@app.get("/analytics/overview")
async def get_overall_analytics():
    if not activity_store:
        return {
            "total_messages": 0,
            "unique_senders": 0,
            "unique_receivers": 0,
            "unique_users": 0,
            "avg_message_length": 0,
            "store_size": 0
        }

    senders = set(e["sender_id"] for e in activity_store)
    receivers = set(e["receiver_id"] for e in activity_store)
    all_users = senders | receivers

    msg_lengths = [e["message_length"] for e in activity_store]

    return {
        "total_messages": len(activity_store),
        "unique_senders": len(senders),
        "unique_receivers": len(receivers),
        "unique_users": len(all_users),
        "avg_message_length": round(sum(msg_lengths) / len(msg_lengths), 1),
        "store_size": len(activity_store),
        "keyword_store_size": len(keyword_store)
    }


@app.get("/analytics/activity-timeline")
async def get_activity_timeline(
    user_id: Optional[str] = None,
    days: int = Query(default=7, ge=1, le=90)
):
    cutoff = datetime.utcnow() - timedelta(days=days)

    if user_id:
        events = [e for e in activity_store if e["sender_id"] == user_id and e["timestamp"] > cutoff]
    else:
        events = [e for e in activity_store if e["timestamp"] > cutoff]

    if not events:
        return {
            "timeline": [],
            "total_events": 0
        }

    timeline = {}
    for event in events:
        date_key = event["timestamp"].strftime("%Y-%m-%d")
        if date_key not in timeline:
            timeline[date_key] = {"date": date_key, "messages": 0, "hourly": {}}
        timeline[date_key]["messages"] += 1
        hour_key = str(event["hour"])
        timeline[date_key]["hourly"][hour_key] = timeline[date_key]["hourly"].get(hour_key, 0) + 1

    return {
        "timeline": sorted(timeline.values(), key=lambda x: x["date"]),
        "total_events": len(events)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=settings.SERVICE_PORT)