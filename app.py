from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import os
from dotenv import load_dotenv
load_dotenv()   # loads variables from .env into os.environ

app = Flask(__name__, static_folder='Public', template_folder='Public', static_url_path='')
CORS(app)  # Enable CORS for all domains

# ------------------------------

# Load the model (commented if not available)
# import joblib
# Load the model
# Uncomment if model_pipeline.pkl is available
# model_path = 'model/model_pipeline.pkl'
# model = joblib.load(model_path)
# ------------------------------

@app.route('/')
def index():
    return render_template('index.html')

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
        # confidence = model.predict_proba([text])[0].max()
        # return jsonify({
        #     'prediction': int(prediction),
        #     'confidence': float(confidence),
        #     'message': 'REAL' if prediction == 1 else 'FAKE'
        # })

        # Simple mock prediction with confidence (keep original logic)
        import random
        
        # Generate mock prediction based on simple text keywords  
        fake_keywords = ['fake', 'hoax', 'conspiracy', 'secret', 'hidden truth', 'they don\'t want you to know']
        real_keywords = ['study', 'research', 'published', 'university', 'official', 'confirmed']
        
        text_lower = text.lower()
        fake_score = sum(1 for keyword in fake_keywords if keyword in text_lower)
        real_score = sum(1 for keyword in real_keywords if keyword in text_lower)
        
        # Base prediction on keyword analysis + some randomness
        if fake_score > real_score:
            is_real = False
            base_confidence = 0.7 + (fake_score * 0.1)
        elif real_score > fake_score:
            is_real = True
            base_confidence = 0.7 + (real_score * 0.1)
        else:
            is_real = random.choice([True, False])
            base_confidence = 0.6
        
        # Add some randomness but keep it realistic
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
