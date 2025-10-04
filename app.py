from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
import math
import json
from typing import Dict, Any, List

# Try to import optional heavy deps lazily; if missing, we'll gracefully fall back
try:  # joblib for sklearn/xgb pipelines
    import joblib  # type: ignore
except Exception:  # pragma: no cover - optional
    joblib = None  # type: ignore

# Do NOT import numpy/tensorflow up-front; import lazily only if required and files exist.
np = None  # type: ignore
tf = None  # type: ignore
pad_sequences = None  # type: ignore

# Serve files from the Public folder
# static_url_path='' means static files are served from root ('/style.css', '/script.js')
# Serve static from /static to prevent it from shadowing API routes like /predict_all
app = Flask(__name__, static_folder='Public', template_folder='Public', static_url_path='/static')
CORS(app)  # Enable CORS for all domains

# ------------------------------
# Load the model
# Comment out if model_pipeline.pkl is missing
# model_path = 'model\\model_pipeline.pkl'
# model = joblib.load(model_path)
# ------------------------------

@app.route('/')
def index():
    return render_template('index.html')


# ------------------------------
# Model loading and inference utilities (graceful, optional)
# ------------------------------

_models_loaded: bool = False
_models: Dict[str, Dict[str, Any]] = {}


def _sigmoid(x: float) -> float:
    try:
        return 1.0 / (1.0 + math.exp(-float(x)))
    except Exception:
        return 0.5


def load_models_if_needed() -> Dict[str, Dict[str, Any]]:
    """Load all available models from the module/ directory once.
    Returns a dict of {key: {name, type, model, extra}} for each successfully loaded model.
    If dependencies or files are missing, those models are skipped.
    """
    global _models_loaded, _models
    if _models_loaded:
        return _models

    base_dir = os.path.dirname(os.path.abspath(__file__))
    module_dir = os.path.join(base_dir, 'module')

    candidates: List[Dict[str, Any]] = [
        {
            'key': 'lr',
            'name': 'Logistic Regression',
            'path': os.path.join(module_dir, 'model_pipeline_lr.pkl'),
            'type': 'sklearn'
        },
        {
            'key': 'svm',
            'name': 'Support Vector Machine',
            'path': os.path.join(module_dir, 'model_pipeline_svm.pkl'),
            'type': 'sklearn'
        },
        {
            'key': 'xgb',
            'name': 'XGBoost',
            'path': os.path.join(module_dir, 'model_pipeline_xgb.pkl'),
            'type': 'sklearn'
        },
        {
            'key': 'base',
            'name': 'Baseline Pipeline',
            'path': os.path.join(module_dir, 'model_pipeline.pkl'),
            'type': 'sklearn'
        },
        {
            'key': 'lstm',
            'name': 'LSTM (Keras)',
            'path': os.path.join(module_dir, 'lstm_model.h5'),
            'type': 'keras',
            'tokenizer': os.path.join(module_dir, 'tokenizer.pkl'),
            'maxlen': 200,
        },
    ]

    loaded: Dict[str, Dict[str, Any]] = {}

    for c in candidates:
        try:
            if c['type'] == 'sklearn':
                if joblib is None:
                    continue
                if not os.path.isfile(c['path']):
                    continue
                model = joblib.load(c['path'])
                loaded[c['key']] = {**c, 'model': model}
            elif c['type'] == 'keras':
                if not os.path.isfile(c['path']) or not os.path.isfile(c['tokenizer']):
                    continue
                # Lazy imports
                global tf, pad_sequences, np
                if tf is None:
                    try:
                        import tensorflow as tf  # type: ignore
                        from tensorflow.keras.preprocessing.sequence import pad_sequences as _pad_sequences  # type: ignore
                        pad_sequences = _pad_sequences
                    except Exception as e:
                        print(f"[load_models_if_needed] TensorFlow unavailable: {e}")
                        continue
                if np is None:
                    try:
                        import numpy as np  # type: ignore
                    except Exception as e:
                        print(f"[load_models_if_needed] NumPy unavailable: {e}")
                        continue
                model = tf.keras.models.load_model(c['path'])
                tokenizer = joblib.load(c['tokenizer'])
                loaded[c['key']] = {**c, 'model': model, 'tokenizer': tokenizer}
        except Exception as e:  # pragma: no cover - best-effort loading
            print(f"[load_models_if_needed] Skipped {c.get('name')}: {e}")
            continue

    _models = loaded
    _models_loaded = True
    return _models


def predict_with_all_models(text: str) -> Dict[str, Any]:
    """Run inference across all available models. Returns detailed results and best selection.
    The expected label convention is: 1 => TRUE, 0 => FAKE.
    """
    models = load_models_if_needed()

    results: List[Dict[str, Any]] = []

    for key, info in models.items():
        name = info['name']
        mtype = info['type']
        try:
            if mtype == 'sklearn':
                model = info['model']
                # Most sklearn text models are pipelines taking raw string input
                proba = None
                if hasattr(model, 'predict_proba'):
                    p = model.predict_proba([text])[0]
                    # probability of class 1 (TRUE)
                    proba = float(p[1]) if len(p) > 1 else float(p[0])
                elif hasattr(model, 'decision_function'):
                    df = model.decision_function([text])
                    raw = float(df[0]) if hasattr(df, '__getitem__') else float(df)
                    proba = _sigmoid(raw)
                else:
                    # fallback: use predict only
                    pred = int(model.predict([text])[0])
                    proba = 0.65 if pred == 1 else 0.35
                pred_label = 1 if proba >= 0.5 else 0
                results.append({
                    'model': name,
                    'key': key,
                    'prediction': pred_label,
                    'confidence': proba,
                    'source': 'sklearn'
                })
            elif mtype == 'keras':
                model = info['model']
                tokenizer = info['tokenizer']
                maxlen = info.get('maxlen', 200)
                if np is None or pad_sequences is None:
                    continue
                seq = tokenizer.texts_to_sequences([text])
                pad = pad_sequences(seq, maxlen=maxlen, padding='post', truncating='post')
                prob_true = float(model.predict(pad, verbose=0)[0][0])
                pred_label = 1 if prob_true >= 0.5 else 0
                results.append({
                    'model': name,
                    'key': key,
                    'prediction': pred_label,
                    'confidence': prob_true,
                    'source': 'keras'
                })
        except Exception as e:  # pragma: no cover - ignore individual model failure
            print(f"[predict_with_all_models] {name} failed: {e}")
            continue

    # If no real models loaded, return mocked 5-model ensemble
    if not results:
        import random
        mock_names = [
            'Logistic Regression', 'Support Vector Machine', 'XGBoost', 'Naive Bayes', 'LSTM (Keras)'
        ]
        for i, name in enumerate(mock_names):
            conf = 0.55 + random.random() * 0.4
            pred = 1 if random.random() > 0.5 else 0
            results.append({
                'model': name,
                'key': f'mock_{i}',
                'prediction': pred,
                'confidence': conf,
                'source': 'mock'
            })

    # Choose best by confidence distance from 0.5 (or simply highest confidence towards its class)
    # Here we select highest confidence regardless of class
    best_idx = max(range(len(results)), key=lambda i: results[i]['confidence'])
    best = {**results[best_idx], 'index': best_idx}

    return {
        'input_text': text,
        'results': results,
        'best': best,
        'models_loaded': {k: v['name'] for k, v in load_models_if_needed().items()}
    }

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Get JSON data
        data = request.get_json(force=True)
        if not data or 'text' not in data:
            return jsonify({'error': 'Missing or incorrect key "text" in JSON data'}), 400

        text = data['text']

        # Handle empty or invalid input
        if not isinstance(text, str) or not text.strip():
            return jsonify({'error': '⚠️ Please enter some text before submitting.'}), 400
        return jsonify({'message': 'Text received successfully!'})

    except Exception as e:
        print(f"Error in /predict: {e}")  # Log the error for debugging
        return jsonify({'error': 'Internal server error.'}), 500


@app.route('/predict_all', methods=['GET', 'POST'])
def predict_all():
    """Return predictions from all available models plus the best pick.
    Response format:
    {
      input_text: str,
      results: [{model, key, prediction, confidence}],
      best: {model, key, prediction, confidence, index},
      models_loaded: {key: name}
    }
    """
    try:
        # Help manual browser checks: GET will return a short message
        if request.method == 'GET':
            return jsonify({
                'message': 'Use POST with JSON body {"text": "..."} to get predictions.',
                'ok': True,
                'endpoint': '/predict_all'
            })

        data = request.get_json(force=True)
        if not data or 'text' not in data:
            return jsonify({'error': 'Missing or incorrect key "text" in JSON data'}), 400
        text = data['text']
        if not isinstance(text, str) or not text.strip():
            return jsonify({'error': '⚠️ Please enter some text before submitting.'}), 400

        result = predict_with_all_models(text.strip())
        return jsonify(result)
    except Exception as e:
        print(f"Error in /predict_all: {e}")
        return jsonify({'error': 'Internal server error.'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)