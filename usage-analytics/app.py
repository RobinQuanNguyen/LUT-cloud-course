import os
from datetime import datetime, timedelta, timezone
from typing import Optional
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


def parse_iso_datetime(value: str, *, field_name: str, local_tz: ZoneInfo) -> datetime:
    normalized = value.strip()
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"

    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                f"{field_name} must be a valid ISO-8601 datetime, "
                "for example: 2026-03-01T10:30:00 or 2026-03-01T10:30:00+02:00"
            ),
        ) from exc

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=local_tz)

    return parsed.astimezone(timezone.utc)


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
    days: Optional[int] = Query(default=None, ge=1, le=3650),
    start_time: Optional[str] = Query(default=None),
    end_time: Optional[str] = Query(default=None),
    business_start: int = Query(default=9, ge=0, le=23),
    business_end: int = Query(default=18, ge=1, le=24),
):
    if business_start >= business_end:
        raise HTTPException(status_code=400, detail="business_start must be less than business_end")

    helsinki = ZoneInfo(FINLAND_TZ)
    collection = get_collection()
    now_local = datetime.now(helsinki)
    now_utc = now_local.astimezone(timezone.utc)

    has_custom_range = start_time is not None or end_time is not None
    if has_custom_range and not (start_time and end_time):
        raise HTTPException(status_code=400, detail="start_time and end_time must be provided together")

    if has_custom_range and days is not None:
        raise HTTPException(status_code=400, detail="Use either days or start_time/end_time, not both")

    since_local = None
    until_local = now_local
    since = None
    until = now_utc
    window_mode = "all_time"

    if days is not None:
        since_local = now_local - timedelta(days=days)
        since = since_local.astimezone(timezone.utc)
        window_mode = f"last_{days}_days"

    if has_custom_range:
        since = parse_iso_datetime(start_time, field_name="start_time", local_tz=helsinki)
        until = parse_iso_datetime(end_time, field_name="end_time", local_tz=helsinki)
        if since >= until:
            raise HTTPException(status_code=400, detail="start_time must be earlier than end_time")

        since_local = since.astimezone(helsinki)
        until_local = until.astimezone(helsinki)
        window_mode = "custom_range"

    match_filter = {}
    if since is not None:
        match_filter["$gte"] = since
    if until is not None and window_mode == "custom_range":
        match_filter["$lt"] = until

    created_at_match = {"createdAt": match_filter} if match_filter else None

    pipeline = [
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

    if created_at_match is not None:
        pipeline.insert(0, {"$match": created_at_match})

    try:
        rows = list(collection.aggregate(pipeline))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Failed to aggregate messages: {exc}") from exc

    type_pipeline = [
        {
            "$project": {
                "has_image": {
                    "$gt": [{"$strLenCP": {"$ifNull": ["$image", ""]}}, 0]
                }
            }
        },
        {"$group": {"_id": "$has_image", "count": {"$sum": 1}}},
    ]
    if created_at_match is not None:
        type_pipeline.insert(0, {"$match": created_at_match})

    try:
        type_rows = list(collection.aggregate(type_pipeline))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Failed to aggregate message types: {exc}") from exc

    hourly_counts = {hour: 0 for hour in range(24)}
    for row in rows:
        hour = int(row["_id"])
        hourly_counts[hour] = int(row["count"])

    total_messages = sum(hourly_counts.values())
    image_messages = sum(int(row["count"]) for row in type_rows if bool(row["_id"]))
    text_messages = max(total_messages - image_messages, 0)
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
            "mode": window_mode,
            "days": days,
            "since_local": since_local.isoformat() if since_local is not None else None,
            "until_local": until_local.isoformat(),
            "since_utc": since.isoformat() if since is not None else None,
            "until_utc": until.isoformat(),
            "timezone": FINLAND_TZ,
        },
        "totals": {
            "messages": total_messages,
            "business_hours_messages": business_total,
            "off_hours_messages": off_hours_total,
        },
        "message_types": {
            "text": {
                "count": text_messages,
                "percentage": round((text_messages / total_messages) * 100, 2) if total_messages else 0,
            },
            "image": {
                "count": image_messages,
                "percentage": round((image_messages / total_messages) * 100, 2) if total_messages else 0,
            },
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
