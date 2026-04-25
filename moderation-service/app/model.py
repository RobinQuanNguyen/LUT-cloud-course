import re

TOXIC_WORDS = {
    "fuck", "f*ck", "fuk", "phuck",
    "shit", "sh*t", "sht",
    "damn", "dam", "dmn",
    "ass", "a$$", "azz",
    "bitch", "b*tch", "btch", "b1tch",
    "bastard", "bstard",
    "dick", "d*ck", "d1ck",
    "pussy", "p*ss", "puss",
    "cunt",
    "whore", "w*hore",
    "slut",
    "nigger", "nigga", "n1gger",
    "faggot", "f*ggot",
    "retard", "r*tard",
    "idiot", "i*iot",
    "stupid",
    "moron",
    "loser",
    "dumb"
}

def load_model():
    return None

def predict(text: str) -> dict:
    text_lower = text.lower()
    words = re.findall(r'\b\w+\b', text_lower)

    toxic_count = sum(1 for word in words if word in TOXIC_WORDS)

    if toxic_count == 0:
        return {
            "label": "safe",
            "confidence": 0.95,
            "scores": {"safe": 0.95, "toxic": 0.05}
        }
    else:
        confidence = min(0.5 + (toxic_count * 0.15), 0.95)
        return {
            "label": "toxic",
            "confidence": float(confidence),
            "scores": {"safe": 1 - confidence, "toxic": confidence}
        }
