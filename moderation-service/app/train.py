import os
import pandas as pd
from datasets import load_dataset
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

def train(): 
    print ("Please wait. Loading dataset...")
    dataset = load_dataset("thesofakillers/jigsaw-toxic-comment-classification-challenge", split="train")
    df = dataset.to_pandas()

    # After loading, check the column names:
    print(df.columns.tolist())

    # Create a binary label as 0 for safe and 1 for toxic
    toxic_cols = ['toxic', 'severe_toxic', 'obscene', 'threat', 'insult', 'identity_hate']
    df['label'] = (df[toxic_cols].sum(axis=1) > 0).astype(int)

    x = df['comment_text'].fillna("")
    y = df['label']

    print(f"Total samples: {len(df)}")
    print(f"Toxic samples: {y.sum()}")
    print(f"Safe samples: {(y == 0).sum()}")

    x_train, x_test, y_train, y_test = train_test_split(x,y, test_size=0.2, random_state=42, stratify = y)

    # Model/Pipeline used = TF-IDF vectorizer + Logistic Regression classifier
    # sklearn runs them in order automatically: text → numbers → prediction
    model = Pipeline([
        ('tfidf', TfidfVectorizer(
            max_features=50000, # Only keep the top 50k most common words
            ngram_range=(1,2),  # Consider single words AND two-word pairs e.g. "not good"
            sublinear_tf=True,  # Use log scale for word counts (helps with very frequent words)
            strip_accents='unicode',
            analyzer='word',
            min_df=3)), # Ignore words that appear in fewer than 3 messages
        ('clf', LogisticRegression(
            max_iter=2000,
            C=5.0,  # How much to trust the training data (higher = more trust)
            solver='lbfgs',
            class_weight="balanced"
            ))
    ])

    print("Training model....\n")
    print("This may take a few minutes...")
    model.fit(x_train, y_train)

    print("Evaluating model on test set...")
    y_pred = model.predict(x_test)
    print(classification_report(y_test, y_pred, target_names=['safe', 'toxic']))

    os.makedirs("models", exist_ok=True)
    joblib.dump(model, "models/moderation_model.joblib")
    print("Model saved to models/moderation_model.joblib")

if __name__ == '__main__':
    train()