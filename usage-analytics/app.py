import os
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import FastAPI, HTTPException, Query
from pymongo import MongoClient

app = FastAPI(title="Usage Analytics Service", version="0.1.0")
FINLAND_TZ = "Europe/Helsinki"


def format_hour_ampm(hour_24: int) -> str:
    hour_12 = hour_24 % 12
    hour_12 = 12 if hour_12 == 0 else hour_12
    period = "AM" if hour_24 < 12 else "PM"
    return f"{hour_12}:00 {period}"


def get_collection():
    mongo_uri = os.getenv("MONGO_URI")
    db_name = os.getenv("MONGO_DB_NAME")
    collection_name = os.getenv("MONGO_MESSAGE_COLLECTION", "messages")

    if not mongo_uri:
        raise HTTPException(status_code=500, detail="MONGO_URI is not set")

    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)

    if db_name:
        database = client[db_name]
    else:
        default_db = client.get_default_database()
        database = default_db if default_db is not None else client["chat_db"]

    return database[collection_name]


@app.get("/usage-analytics/health")
def health():
    return {"status": "ok"}


@app.get("/usage-analytics/summary")
def usage_summary(
    days: int = Query(default=7, ge=1, le=365),
    business_start: int = Query(default=9, ge=0, le=23),
    business_end: int = Query(default=18, ge=1, le=24),
):
    if business_start >= business_end:
        raise HTTPException(status_code=400, detail="business_start must be less than business_end")

    helsinki = ZoneInfo(FINLAND_TZ)
    collection = get_collection()
    now_local = datetime.now(helsinki)
    since_local = now_local - timedelta(days=days)
    now_utc = now_local.astimezone(timezone.utc)
    since = since_local.astimezone(timezone.utc)

    pipeline = [
        {"$match": {"createdAt": {"$gte": since}}},
        {
            "$project": {
                "hour": {
                    "$hour": {
                        "date": "$createdAt",
                        "timezone": FINLAND_TZ,
                    }
                }
            }
        },
        {"$group": {"_id": "$hour", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
    ]

    try:
        rows = list(collection.aggregate(pipeline))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Failed to aggregate messages: {exc}") from exc

    hourly_counts = {hour: 0 for hour in range(24)}
    for row in rows:
        hour = int(row["_id"])
        hourly_counts[hour] = int(row["count"])

    total_messages = sum(hourly_counts.values())
    peak_count = max(hourly_counts.values()) if hourly_counts else 0
    low_count = min(hourly_counts.values()) if hourly_counts else 0

    peak_hours = [hour for hour, count in hourly_counts.items() if count == peak_count]
    low_hours = [hour for hour, count in hourly_counts.items() if count == low_count]

    business_total = sum(
        count for hour, count in hourly_counts.items() if business_start <= hour < business_end
    )
    off_hours_total = total_messages - business_total

    return {
        "window": {
            "days": days,
            "since_local": since_local.isoformat(),
            "until_local": now_local.isoformat(),
            "since_utc": since.isoformat(),
            "until_utc": now_utc.isoformat(),
            "timezone": FINLAND_TZ,
        },
        "totals": {
            "messages": total_messages,
            "business_hours_messages": business_total,
            "off_hours_messages": off_hours_total,
        },
        "peak_usage": {
            "count": peak_count,
            "hours": [format_hour_ampm(hour) for hour in peak_hours],
            "hours_24": peak_hours,
        },
        "lowest_usage": {
            "count": low_count,
            "hours": [format_hour_ampm(hour) for hour in low_hours],
            "hours_24": low_hours,
        },
        "hourly_breakdown": [
            {
                "hour": format_hour_ampm(hour),
                "hour_24": hour,
                "count": count,
            }
            for hour, count in hourly_counts.items()
        ],
    }
