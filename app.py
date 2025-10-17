from utils.fetch_url import get_text_from_url
from flask import Flask, request, jsonify, render_template, g, session, redirect, url_for
from flask_cors import CORS
import os
import math
import json
from typing import Dict, Any, List
from dotenv import load_dotenv
load_dotenv()   # loads variables from .env into os.environ

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
app = Flask(__name__, static_folder='Public', template_folder='Public', static_url_path='/static')
CORS(app)  # Enable CORS for all routes

# Secret key for session management (set via ENV in production)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-change-me')

# OAuth (GitHub) setup
_oauth = None
try:
    from authlib.integrations.flask_client import OAuth  # type: ignore
    _oauth = OAuth(app)
    _oauth.register(
        name='github',
        client_id=os.environ.get('GITHUB_CLIENT_ID'),
        client_secret=os.environ.get('GITHUB_CLIENT_SECRET'),
        access_token_url='https://github.com/login/oauth/access_token',
        authorize_url='https://github.com/login/oauth/authorize',
        api_base_url='https://api.github.com/',
        client_kwargs={'scope': 'read:user user:email'}
    )
except Exception as _e:  # pragma: no cover - optional dependency
    print(f"[oauth] Authlib not available or failed to init: {_e}")

# Supported languages
SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'ar', 'hi', 'zh', 'ja', 'pt']
DEFAULT_LANGUAGE = 'en'

# ------------------------------
# Load the model
# Comment out if model_pipeline.pkl is missing
# model_path = 'model\\model_pipeline.pkl'
# model = joblib.load(model_path)
# ------------------------------

def get_user_language():
    """Detect user's preferred language from Accept-Language header or query parameter"""
    lang = request.args.get('lang', '').lower()
    if lang in SUPPORTED_LANGUAGES:
        return lang
    if request.headers.get('Accept-Language'):
        for lang_code in request.headers.get('Accept-Language', '').split(','):
            lang = lang_code.split(';')[0].strip().split('-')[0].lower()
            if lang in SUPPORTED_LANGUAGES:
                return lang
    return DEFAULT_LANGUAGE

# ------------------------------
# Auth routes
# ------------------------------

@app.route('/login/github')
def login_github():
    if _oauth is None:
        return jsonify({'error': 'OAuth is not configured on server'}), 501
    redirect_uri = url_for('auth_github_callback', _external=True)
    return _oauth.github.authorize_redirect(redirect_uri)

@app.route('/auth/github/callback')
def auth_github_callback():
    if _oauth is None:
        return redirect(url_for('index'))
    try:
        token = _oauth.github.authorize_access_token()
        resp = _oauth.github.get('user', token=token)
        profile = resp.json() if resp is not None else {}
        # Get primary email if needed
        email = profile.get('email')
        if not email:
            try:
                emails_resp = _oauth.github.get('user/emails', token=token)
                if emails_resp and emails_resp.ok:
                    emails = emails_resp.json()
                    primary = next((e for e in emails if e.get('primary')), None)
                    email = primary.get('email') if primary else None
            except Exception:
                pass
        session['user'] = {
            'id': profile.get('id'),
            'login': profile.get('login'),
            'name': profile.get('name') or profile.get('login'),
            'avatar_url': profile.get('avatar_url'),
            'email': email,
            'provider': 'github'
        }
    except Exception as e:
        print(f"[auth] GitHub callback error: {e}")
    return redirect(url_for('index'))

@app.route('/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return jsonify({'ok': True})

@app.route('/api/me')
def api_me():
    user = session.get('user')
    return jsonify({'authenticated': bool(user), 'user': user})

@app.route('/')
def index():
    """Main route with language detection"""
    user_lang = get_user_language()
    g.language = user_lang
    return render_template('index_i18n.html')

@app.route('/api/translations/<lang_code>')
def get_translations(lang_code):
    """API endpoint to fetch translation files"""
    if lang_code not in SUPPORTED_LANGUAGES:
        return jsonify({'error': 'Unsupported language'}), 400
    try:
        translations_path = os.path.join('Public', 'locales', f'{lang_code}.json')
        if os.path.exists(translations_path):
            with open(translations_path, 'r', encoding='utf-8') as f:
                translations = json.load(f)
            return jsonify(translations)
        else:
            return jsonify({'error': 'Translation file not found'}), 404
    except Exception as e:
        print(f"Error loading translations for {lang_code}: {e}")
        return jsonify({'error': 'Failed to load translations'}), 500

@app.route('/api/languages')
def get_supported_languages():
    """API endpoint to get list of supported languages"""
    language_info = {}
    for lang in SUPPORTED_LANGUAGES:
        try:
            translations_path = os.path.join('Public', 'locales', f'{lang}.json')
            if os.path.exists(translations_path):
                with open(translations_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    language_info[lang] = {
                        'name': data.get('languages', {}).get(lang, lang.upper()),
                        'available': True
                    }
            else:
                language_info[lang] = {'name': lang.upper(), 'available': False}
        except Exception:
            language_info[lang] = {'name': lang.upper(), 'available': False}
    return jsonify({'supported': SUPPORTED_LANGUAGES, 'default': DEFAULT_LANGUAGE, 'languages': language_info})

# ------------------------------
# Model loading and inference utilities
# ------------------------------

_models_loaded: bool = False
_models: Dict[str, Dict[str, Any]] = {}

def _sigmoid(x: float) -> float:
    try:
        return 1.0 / (1.0 + math.exp(-float(x)))
    except Exception:
        return 0.5

def load_models_if_needed() -> Dict[str, Dict[str, Any]]:
    global _models_loaded, _models
    if _models_loaded:
        return _models
    base_dir = os.path.dirname(os.path.abspath(__file__))
    module_dir = os.path.join(base_dir, 'module')
    candidates: List[Dict[str, Any]] = [
        {'key': 'lr', 'name': 'Logistic Regression', 'path': os.path.join(module_dir, 'model_pipeline_lr.pkl'), 'type': 'sklearn'},
        {'key': 'svm', 'name': 'Support Vector Machine', 'path': os.path.join(module_dir, 'model_pipeline_svm.pkl'), 'type': 'sklearn'},
        {'key': 'xgb', 'name': 'XGBoost', 'path': os.path.join(module_dir, 'model_pipeline_xgb.pkl'), 'type': 'sklearn'},
        {'key': 'base', 'name': 'Baseline Pipeline', 'path': os.path.join(module_dir, 'model_pipeline.pkl'), 'type': 'sklearn'},
        {'key': 'lstm', 'name': 'LSTM (Keras)', 'path': os.path.join(module_dir, 'lstm_model.h5'), 'type': 'keras', 'tokenizer': os.path.join(module_dir, 'tokenizer.pkl'), 'maxlen': 200},
    ]
    loaded: Dict[str, Dict[str, Any]] = {}
    for c in candidates:
        try:
            if c['type'] == 'sklearn':
                if joblib is None or not os.path.isfile(c['path']):
                    continue
                model = joblib.load(c['path'])
                loaded[c['key']] = {**c, 'model': model}
            elif c['type'] == 'keras':
                if not os.path.isfile(c['path']) or not os.path.isfile(c['tokenizer']):
                    continue
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
        except Exception as e:
            print(f"[load_models_if_needed] Skipped {c.get('name')}: {e}")
            continue
    _models = loaded
    _models_loaded = True
    return _models

def predict_with_all_models(text: str) -> Dict[str, Any]:
    models = load_models_if_needed()
    results: List[Dict[str, Any]] = []
    for key, info in models.items():
        name = info['name']
        mtype = info['type']
        try:
            if mtype == 'sklearn':
                model = info['model']
                proba = None
                if hasattr(model, 'predict_proba'):
                    p = model.predict_proba([text])[0]
                    proba = float(p[1]) if len(p) > 1 else float(p[0])
                elif hasattr(model, 'decision_function'):
                    df = model.decision_function([text])
                    raw = float(df[0]) if hasattr(df, '__getitem__') else float(df)
                    proba = _sigmoid(raw)
                else:
                    pred = int(model.predict([text])[0])
                    proba = 0.65 if pred == 1 else 0.35
                pred_label = 1 if proba >= 0.5 else 0
                results.append({'model': name, 'key': key, 'prediction': pred_label, 'confidence': proba, 'source': 'sklearn'})
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
                results.append({'model': name, 'key': key, 'prediction': pred_label, 'confidence': prob_true, 'source': 'keras'})
        except Exception as e:
            print(f"[predict_with_all_models] {name} failed: {e}")
            continue
    if not results:
        import random
        mock_names = ['Logistic Regression', 'Support Vector Machine', 'XGBoost', 'Naive Bayes', 'LSTM (Keras)']
        for i, name in enumerate(mock_names):
            conf = 0.55 + random.random() * 0.4
            pred = 1 if random.random() > 0.5 else 0
            results.append({'model': name, 'key': f'mock_{i}', 'prediction': pred, 'confidence': conf, 'source': 'mock'})
    best_idx = max(range(len(results)), key=lambda i: results[i]['confidence'])
    best = {**results[best_idx], 'index': best_idx}
    return {'input_text': text, 'results': results, 'best': best, 'models_loaded': {k: v['name'] for k, v in load_models_if_needed().items()}}

# ------------------------------
# PREDICTION ROUTES
# ------------------------------

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json(force=True)

        # --- NEW: Handle URL input ---
        text = data.get('text', '').strip()
        url = data.get('url', '').strip()  # optional 'url' key

        if url:
            text_to_check = get_text_from_url(url)
        elif text:
            text_to_check = text
        else:
            return jsonify({'error': '⚠️ Please provide text or URL to check.'}), 400

        # Mock prediction logic (keep original)
        import random
        fake_keywords = ['fake', 'hoax', 'conspiracy', 'secret', 'hidden truth', 'they don\'t want you to know']
        real_keywords = ['study', 'research', 'published', 'university', 'official', 'confirmed']
        text_lower = text_to_check.lower()
        fake_score = sum(1 for keyword in fake_keywords if keyword in text_lower)
        real_score = sum(1 for keyword in real_keywords if keyword in text_lower)
        if fake_score > real_score:
            is_real = False
            base_confidence = 0.7 + (fake_score * 0.1)
        elif real_score > fake_score:
            is_real = True
            base_confidence = 0.7 + (real_score * 0.1)
        else:
            is_real = random.choice([True, False])
            base_confidence = 0.6
        confidence = min(0.95, max(0.55, base_confidence + random.uniform(-0.1, 0.1)))
        result_message = "LIKELY REAL" if is_real else "LIKELY FAKE"
        return jsonify({
            'prediction': 1 if is_real else 0,
            'confidence': round(confidence, 3),
            'message': result_message,
            'analysis': f"Based on content analysis, this text appears to be {result_message.lower()} with {confidence*100:.1f}% confidence."
        })
    except Exception as e:
        print(f"Error in /predict: {e}")
        return jsonify({'error': 'Internal server error.'}), 500

@app.route('/predict_all', methods=['GET', 'POST'])
def predict_all():
    """Return predictions from all available models plus the best pick."""
    try:
        if request.method == 'GET':
            return jsonify({'message': 'Use POST with JSON body {"text": "..."} or {"url": "..."} to get predictions.', 'ok': True, 'endpoint': '/predict_all'})
        data = request.get_json(force=True)
        text = data.get('text', '').strip()
        url = data.get('url', '').strip()
        if url:
            text_to_check = get_text_from_url(url)
        elif text:
            text_to_check = text
        else:
            return jsonify({'error': '⚠️ Please provide text or URL to check.'}), 400
        result = predict_with_all_models(text_to_check)
        return jsonify(result)
    except Exception as e:
        print(f"Error in /predict_all: {e}")
        return jsonify({'error': 'Internal server error.'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
