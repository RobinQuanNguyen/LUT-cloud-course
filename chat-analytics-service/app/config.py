from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SERVICE_NAME: str = "chat-analytics-service"
    SERVICE_VERSION: str = "1.0.0"
    SERVICE_PORT: int = 8001

    ANALYTICS_DB_URI: str = "mongodb://mongodb:27017"
    ANALYTICS_DB_NAME: str = "chat_analytics"

    LOG_LEVEL: str = "info"


settings = Settings()