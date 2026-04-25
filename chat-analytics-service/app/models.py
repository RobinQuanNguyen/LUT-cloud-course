from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class MessageEvent(BaseModel):
    senderId: str
    receiverId: str
    text: str = ""
    timestamp: datetime = None

    def __init__(self, **data):
        if data.get("timestamp") is None:
            data["timestamp"] = datetime.utcnow()
        super().__init__(**data)


class BatchMessageEvents(BaseModel):
    messages: List[MessageEvent]


class AnalyticsQuery(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    user_id: Optional[str] = None


class UserActivity(BaseModel):
    user_id: str
    total_messages: int
    active_days: int
    avg_messages_per_day: float
    peak_hour: int
    peak_hour_label: str
    hourly_distribution: dict


class TrendingTopic(BaseModel):
    keyword: str
    count: int
    percentage: float