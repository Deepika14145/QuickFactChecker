import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.pipeline import Pipeline
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression # Added LR
from sklearn.ensemble import RandomForestClassifier # Added RF
from sklearn.metrics import accuracy_score, precision_score, f1_score, confusion_matrix, classification_report
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path
import sys
import os

# --- Configuration & Paths ---
# Use Path for robust path handling
DATASET_PATH = Path("../dataset/liar/train.tsv")
RESULTS_DIR = Path("results")
RESULTS_DIR.mkdir(exist_ok=True) # Ensure results directory exists

# --- 1. Load Dataset ---
try:
    df = pd.read_csv(DATASET_PATH, sep="\t", header=None, on_bad_lines="warn")
except FileNotFoundError:
    print(f"🛑 Dataset not found at: {DATASET_PATH.resolve()}")
    sys.exit(1)

# Assign column names (assuming standard LIAR structure)
df.columns = [
    "id", "label", "statement", "subject", "speaker", "job", "state", "party",
    "barely_true_counts", "false_counts", "half_true_counts", "mostly_true_counts",
    "pants_on_fire_counts", "context"
]

X_raw = df["statement"]
y_raw = df["label"]
print(f"Dataset loaded. Total samples: {len(df)}")

# --- 2. FIX 1: Apply Label Encoding ---
# This converts string labels (e.g., 'true', 'false') to numerical labels (0, 1, 2, ...)
le = LabelEncoder()
y_encoded = le.fit_transform(y_raw)
print(f"✅ Labels encoded from strings to {len(le.classes_)} integers.")

# --- 3. Data Split ---
# We split the RAW text and the ENCODED labels, stratified to preserve class balance
X_train, X_test, y_train, y_test = train_test_split(
    X_raw, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
)
print(f"Data split: Training samples={len(X_train)}, Testing samples={len(X_test)}")

# --- 4. Helper: Train and Evaluate Pipeline ---
def train_and_evaluate(pipeline, name, results):
    """Trains a pipeline, evaluates metrics, and saves confusion matrix."""
    print(f"\n🚀 Training {name} Pipeline...")
    try:
        # Fit the entire pipeline using raw text
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)

        # Metrics
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, average="macro", zero_division=0)
        f1 = f1_score(y_test, y_pred, average="macro", zero_division=0)
        cm = confusion_matrix(y_test, y_pred)

        results[name] = {"accuracy": acc, "precision": prec, "f1": f1}

        print(f"✅ {name} Accuracy: {acc:.4f}")

        # Save confusion matrix plot
        plt.figure(figsize=(7, 6))
        sns.heatmap(
            cm, 
            annot=True, 
            fmt='d', 
            cmap='Blues', 
            xticklabels=le.classes_, 
            yticklabels=le.classes_
        )
        plt.title(f"{name} Confusion Matrix")
        plt.ylabel('True label')
        plt.xlabel('Predicted label')
        plt.savefig(RESULTS_DIR / f"{name.lower().replace(' ', '_')}_confusion.png")
        plt.close()

        # Print classification report
        print(f"\n📊 Classification Report for {name}:\n")
        print(classification_report(y_test, y_pred, target_names=le.classes_))

    except Exception as e:
        print(f"⚠️ Error training {name}: {type(e).__name__}: {e}")
        results[name] = {"accuracy": 0.0, "precision": 0.0, "f1": 0.0}

# --- 5. Define Models (Pipelines) ---
# FIX 2: All models now use a Pipeline (TfidfVectorizer + Classifier)
tfidf_params = dict(max_features=5000, stop_words="english")

models = {
    # Original NB model (included for completeness)
    "Naive Bayes": Pipeline([
        ("tfidf", TfidfVectorizer(**tfidf_params)),
        ("clf", MultinomialNB())
    ]),
    # Added Logistic Regression (Required by filename/bug context)
    "Logistic Regression": Pipeline([
        ("tfidf", TfidfVectorizer(**tfidf_params)),
        ("clf", LogisticRegression(max_iter=1000, random_state=42))
    ]),
    # Added Random Forest (Required by filename/bug context)
    "Random Forest": Pipeline([
        ("tfidf", TfidfVectorizer(**tfidf_params)),
        ("clf", RandomForestClassifier(n_estimators=100, random_state=42))
    ])
}

# --- 6. Train Models and Collect Results ---
results = {}
for name, model in models.items():
    train_and_evaluate(model, name, results)

# --- 7. Print and Save Comparison ---
print("\nModel Performance Comparison:\n")
print("{:<25} {:<10} {:<10} {:<10}".format("Model", "Accuracy", "Precision", "F1-Score"))
for model, scores in results.items():
    print("{:<25} {:.4f}    {:.4f}    {:.4f}".format(model, scores["accuracy"], scores["precision"], scores["f1"]))

# Save results to markdown (optional but good practice for comparison scripts)
try:
    with open(RESULTS_DIR / "ml_model_comparison.md", "w") as f:
        f.write("# Classical ML Model Comparison Results (Pipelines Fix)\n\n")
        f.write("| Model                   | Accuracy | Precision | F1-Score |\n")
        f.write("|-------------------------|----------|-----------|----------|\n")
        for model, scores in results.items():
            f.write(f"| {model} | {scores['accuracy']:.4f} | {scores['precision']:.4f} | {scores['f1']:.4f} |\n")
except Exception as e:
    print(f"⚠️ Error saving markdown file: {type(e).__name__}: {e}")

# Plot comparison chart
try:
    models_list = list(results.keys())
    accuracies = [results[m]["accuracy"] for m in models_list]

    plt.figure(figsize=(10, 6))
    sns.barplot(x=models_list, y=accuracies, palette="viridis")
    plt.ylim(0, 1.0)
    plt.xlabel("Models")
    plt.ylabel("Accuracy")
    plt.title("Model Accuracy Comparison (TF-IDF Pipelines)")

    for i, acc in enumerate(accuracies):
        plt.text(i, acc + 0.01, f"{acc:.4f}", ha='center', fontsize=12)

    plt.savefig(RESULTS_DIR / "accuracy_comparison.png")
    plt.close()
    
except Exception as e:
    print(f"⚠️ Error generating comparison plot: {type(e).__name__}: {e}")
