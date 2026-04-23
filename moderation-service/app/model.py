import joblib
import numpy as np

_model = None   # Lazy loading: model only gets loaded into memory first time someone calls

def load_model():
    global _model
    if _model is None:
        print("Loading model into memory...")
        _model = joblib.load("models/moderation_model.joblib")
    return _model

def predict(texts: str) -> dict:
    model = load_model()
    label = model.predict([texts])[0]
    probability = model.predict_proba([texts])[0] # [prob_safe, prob_toxic]

    return {
        "label": "toxic" if label == 1 else "safe",
        "confidence": float(np.max(probability)),
        "scores": {
            "safe": float(probability[0]),
            "toxic": float(probability[1])
        }
    }