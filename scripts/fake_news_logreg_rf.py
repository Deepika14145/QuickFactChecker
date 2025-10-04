import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, f1_score, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
import os
import sys
from pathlib import Path
import requests
from dotenv import load_dotenv
load_dotenv()  # loads .env variables

# -------------------------
# Hugging Face API config
# -------------------------
HF_API_KEY = os.getenv("HF_API_KEY")
HF_MODEL_URL = os.getenv("HF_MODEL_URL")

def classify_with_hf_api(text):
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    payload = {"inputs": text}
    
    response = requests.post(HF_MODEL_URL, headers=headers, json=payload)
    
    try:
        result = response.json()
        if isinstance(result, list) and len(result) > 0:
            return result[0]  # Return first prediction
        else:
            return {"label": "UNKNOWN", "score": 0.0}
    except Exception as e:
        return {"label": "ERROR", "score": 0.0}

# -------------------------
# Dataset and results paths
# -------------------------
DATASET_PATH = Path("QuickFactChecker/dataset/liar/train.tsv")
RESULTS_DIR = Path("results")
RESULTS_DIR.mkdir(exist_ok=True)

# -------------------------
# Load dataset
# -------------------------
try:
    df = pd.read_csv(DATASET_PATH, sep="\t", on_bad_lines="warn")
except FileNotFoundError:
    print(f"🛑 Dataset not found at: {DATASET_PATH}")
    sys.exit(1)
except Exception as e:
    print(f"🛑 Error loading dataset: {type(e).__name__}: {e}")
    sys.exit(1)

# Validate expected column count
expected_cols = 14
if df.shape[1] != expected_cols:
    print(f"⚠️ Unexpected column count: {df.shape[1]} (expected {expected_cols})")
    sys.exit(1)

df.columns = [
    "id", "label", "statement", "subject", "speaker", "job", "state", "party",
    "barely_true_counts", "false_counts", "half_true_counts", "mostly_true_counts",
    "pants_on_fire_counts", "context"
]

X = df["statement"]
y = df["label"]

# -------------------------
# TF-IDF + sklearn setup
# -------------------------
vectorizer = TfidfVectorizer(max_features=5000, stop_words="english")
X_vec = vectorizer.fit_transform(X)

X_train, X_test, y_train, y_test = train_test_split(
    X_vec, y, test_size=0.2, random_state=42
)

# -------------------------
# Helper: train sklearn models
# -------------------------
def train_and_evaluate(model, name, results):
    try:
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, average="macro", zero_division=0)
        f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)
        cm = confusion_matrix(y_test, y_pred)

        results[name] = {"accuracy": acc, "precision": prec, "f1": f1}

        # Save confusion matrix
        plt.figure(figsize=(6, 4))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues')
        plt.title(f"{name} Confusion Matrix")
        plt.savefig(RESULTS_DIR / f"{name.lower().replace(' ', '_')}_confusion.png")
        plt.close()

    except Exception as e:
        print(f"⚠️ Error training {name}: {type(e).__name__}: {e}")
        results[name] = {"accuracy": 0.0, "precision": 0.0, "f1": 0.0}

# -------------------------
# Train sklearn models
# -------------------------
results = {}

train_and_evaluate(MultinomialNB(), "Naive Bayes", results)
train_and_evaluate(LogisticRegression(max_iter=1000), "Logistic Regression", results)
train_and_evaluate(RandomForestClassifier(n_estimators=100, random_state=42), "Random Forest", results)

# -------------------------
# Hugging Face Transformer API
# -------------------------
try:
    # Take a subset for speed (can scale up)
    test_texts = df["statement"].iloc[:200].tolist()
    true_labels = df["label"].iloc[:200].tolist()

    hf_preds = [classify_with_hf_api(txt)["label"].lower() for txt in test_texts]

    # Map labels to match your dataset (adjust if needed)
    label_map = {
        "pants-fire": "pants-fire",
        "false": "false",
        "barely-true": "barely-true",
        "half-true": "half-true",
        "mostly-true": "mostly-true",
        "true": "true",
        "fake": "pants-fire",  # example mapping
        "real": "true"
    }
    hf_preds_mapped = [label_map.get(lbl, lbl) for lbl in hf_preds]

    results["Transformer (HF API)"] = {
        "accuracy": accuracy_score(true_labels, hf_preds_mapped),
        "precision": precision_score(true_labels, hf_preds_mapped, average="macro", zero_division=0),
        "f1": f1_score(true_labels, hf_preds_mapped, average="macro", zero_division=0)
    }

except Exception as e:
    print(f"⚠️ Hugging Face API failed: {type(e).__name__}: {e}")
    results["Transformer (HF API)"] = {"accuracy": 0.0, "precision": 0.0, "f1": 0.0}

# -------------------------
# Print results table
# -------------------------
print("\nModel Performance Comparison:\n")
print("{:<25} {:<10} {:<10} {:<10}".format("Model", "Accuracy", "Precision", "F1-Score"))
for model, scores in results.items():
    print("{:<25} {:.4f}    {:.4f}    {:.4f}".format(model, scores["accuracy"], scores["precision"], scores["f1"]))

# -------------------------
# Save results to markdown
# -------------------------
try:
    with open(RESULTS_DIR / "model_comparison.md", "w") as f:
        f.write("# Model Comparison Results\n\n")
        f.write("| Model                   | Accuracy | Precision | F1-Score |\n")
        f.write("|-------------------------|----------|-----------|----------|\n")
        for model, scores in results.items():
            f.write(f"| {model} | {scores['accuracy']:.4f} | {scores['precision']:.4f} | {scores['f1']:.4f} |\n")
except Exception as e:
    print(f"⚠️ Error saving markdown file: {type(e).__name__}: {e}")

# -------------------------
# Plot comparison
# -------------------------
try:
    models = list(results.keys())
    accuracies = [results[m]["accuracy"] for m in models]

    plt.figure(figsize=(9, 5))
    plt.bar(models, accuracies, color=['skyblue', 'lightgreen', 'salmon', 'violet'])
    plt.ylim(0, 1)
    plt.xlabel("Models")
    plt.ylabel("Accuracy")
    plt.title("Model Accuracy Comparison")

    for i, acc in enumerate(accuracies):
        plt.text(i, acc + 0.01, f"{acc:.2f}", ha='center', fontsize=12)

    plt.savefig(RESULTS_DIR / "comparison.png")
    plt.show()
    
except Exception as e:
    print(f"⚠️ Error generating plot: {type(e).__name__}: {e}")
