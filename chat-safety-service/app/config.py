import os


class Settings:
    SERVICE_NAME = os.getenv("SERVICE_NAME", "chat-safety-service")
    SERVICE_VERSION = os.getenv("SERVICE_VERSION", "1.0.0")
    MAX_TEXT_LENGTH = int(os.getenv("MAX_TEXT_LENGTH", "5000"))


settings = Settings()