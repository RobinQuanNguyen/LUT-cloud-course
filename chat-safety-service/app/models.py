from typing import List, Optional
from pydantic import BaseModel, Field


class MessageInput(BaseModel):
    messageId: Optional[str] = None
    senderId: Optional[str] = None
    text: str = Field(default="", max_length=5000)


class BatchAnalyzeInput(BaseModel):
    messages: List[MessageInput]


class AnalyzeResult(BaseModel):
    messageId: Optional[str] = None
    senderId: Optional[str] = None
    risk_score: int
    risk_level: str
    flags: List[str]
    explanations: List[str]
    normalized_text: str


class SummaryItem(BaseModel):
    total_scanned: int
    low_risk: int
    medium_risk: int
    high_risk: int
    most_common_flags: List[dict]