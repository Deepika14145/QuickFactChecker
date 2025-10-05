from flask import Flask, request, jsonify, render_template, g
from flask_cors import CORS
import os
import json
from dotenv import load_dotenv
load_dotenv()   # loads variables from .env into os.environ

app = Flask(__name__, static_folder='Public', template_folder='Public', static_url_path='')
CORS(app)  # Enable CORS for all domains

# Supported languages
SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'ar', 'hi', 'zh', 'ja', 'pt']
DEFAULT_LANGUAGE = 'en'

# ------------------------------

# Load the model (commented if not available)
# import joblib
# Load the model
# Uncomment if model_pipeline.pkl is available
# model_path = 'model/model_pipeline.pkl'
# model = joblib.load(model_path)
# ------------------------------

def get_user_language():
    """Detect user's preferred language from Accept-Language header or query parameter"""
    # Check for explicit language parameter
    lang = request.args.get('lang', '').lower()
    if lang in SUPPORTED_LANGUAGES:
        return lang
    
    # Check Accept-Language header
    if request.headers.get('Accept-Language'):
        for lang_code in request.headers.get('Accept-Language', '').split(','):
            lang = lang_code.split(';')[0].strip().split('-')[0].lower()
            if lang in SUPPORTED_LANGUAGES:
                return lang
    
    return DEFAULT_LANGUAGE

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
                language_info[lang] = {
                    'name': lang.upper(),
                    'available': False
                }
        except Exception:
            language_info[lang] = {
                'name': lang.upper(),
                'available': False
            }
    
    return jsonify({
        'supported': SUPPORTED_LANGUAGES,
        'default': DEFAULT_LANGUAGE,
        'languages': language_info
    })

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json(force=True)
        if not data or 'text' not in data:
            return jsonify({'error': 'Missing or incorrect key "text" in JSON data'}), 400

        text = data['text']

        if not isinstance(text, str) or not text.strip():
            return jsonify({'error': '⚠️ Please enter some text before submitting.'}), 400

        # Uncomment once you have model
        # prediction = model.predict([text])[0]
        # return jsonify({'prediction': int(prediction)})

        # Temporary placeholder
        return jsonify({'message': 'Text received successfully!'})

    except Exception as e:
        print(f"Error in /predict: {e}")
        return jsonify({'error': 'Internal server error.'}), 500

# ------------------------------
# New route: Dashboard Data API
# ------------------------------
@app.route('/dashboard_data')
def dashboard_data():
    data = []
    file_path = os.path.join("results", "model_comparison.md")

    if not os.path.exists(file_path):
        return jsonify({'error': 'results/model_comparison.md not found'}), 404

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            lines = f.readlines()

        for line in lines:
            if "|" in line and "Model" not in line:
                parts = [p.strip() for p in line.split("|") if p.strip()]
                if len(parts) >= 5:
                    model = parts[0]
                    try:
                        accuracy = float(parts[1] or 0)
                        precision = float(parts[2] or 0)
                        recall = float(parts[3] or 0)
                        f1 = float(parts[4] or 0)
                    except ValueError:
                        continue
                    data.append({
                        'model': model,
                        'accuracy': accuracy,
                        'precision': precision,
                        'recall': recall,
                        'f1': f1
                    })
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return jsonify({'error': 'Error parsing model_comparison.md'}), 500

    return jsonify(data)
# ✅ Health check route
@app.route('/health')
def health():
    return jsonify({'status': 'ok'}), 200


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
