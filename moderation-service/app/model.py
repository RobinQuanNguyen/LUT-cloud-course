import joblib
import numpy as np
import os
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

_model = None   # Lazy loading: model only gets loaded into memory first time someone calls

def _create_dummy_model():
    """Create a simple dummy model for testing when real model doesn't exist."""
    print("Creating dummy moderation model...")
    model = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=100)),
        ('clf', LogisticRegression())
    ])
    # Fit with dummy data so it doesn't crash
    model.fit(["hello", "goodbye"], [0, 1])
    os.makedirs("models", exist_ok=True)
    joblib.dump(model, "models/moderation_model.joblib")
    return model

def load_model():
    global _model
    if _model is None:
        model_path = "models/moderation_model.joblib"
        if os.path.exists(model_path):
            print("Loading model from file...")
            _model = joblib.load(model_path)
        else:
            print("Model not found, creating dummy model...")
            _model = _create_dummy_model()
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