# 📰 QuickFactChecker – Fake News Detection

## 🚀 Live Demo
**Try it now:** [https://quickfactchecker.onrender.com/](https://quickfactchecker.onrender.com/)

## 📌 Project Overview
QuickFactChecker is a **machine learning–based web app** that helps detect whether a news article is **real** or **fake**.
It uses different models (e.g., Naive Bayes, LSTM) trained on the **LIAR dataset** to evaluate credibility and assist users in identifying potentially misleading information.

---
## 🌟GSSoc 
![GSSoC Logo](https://github.com/dimpal-yadav/QuickFactChecker/blob/add-gssoc-banner/GSSoC.png)
🌟 **Exciting News...**

🚀 This project is now an official part of GirlScript Summer of Code – GSSoC'25! 💻 We're thrilled to welcome contributors from all over India and beyond to collaborate, build, and grow *QuickFactChecker!* Let’s make learning and career development smarter – together! 🌟

👩‍💻 GSSoC is one of India’s **largest 3-month-long open-source programs** that encourages developers of all levels to contribute to real-world projects 🌍 while learning, collaborating, and growing together. 🌱

🌈 With **mentorship, community support**, and **collaborative coding**, it's the perfect platform for developers to:

- ✨ Improve their skills
- 🤝 Contribute to impactful projects
- 🏆 Get recognized for their work
- 📜 Receive certificates and swag!

🎉 **I can’t wait to welcome new contributors** from GSSoC 2025 to this QuickFactChecker project family! Let's build, learn, and grow together — one commit at a time. 🔥

---

## ✨ Features
- ✅ Fake news classification using ML models (**Naive Bayes**, **Logistic Regression**, **Random Forest**, and **LSTM**).
- ✅ Interactive web app built with **Flask** and **HTML templates**.
- ✅ **Automated NLTK Setup** to prevent missing resource errors.
- ✅ Preprocessed dataset included (`train.tsv`, `test.tsv`, `valid.tsv`).
- ✅ Notebooks for **data analysis & experimentation** (`liar-data-analysis.ipynb`, `dataset.ipynb`).
- ✅ Easy setup with `requirements.txt`.

---

## 📂 Project Structure
```bash
dataset/liar
   ├── README.md   ##Dataset description
   ├── train.tsv   ##Training data
   ├── test.tsv    ##Testing data
   ├── valid.tsv   ##Validation data

module/
   ├── dataset.ipynb
   ├── fake-news-detection-using-lstm.ipynb
   ├── fake-news-detection-using-nb.ipynb
   ├── liar-data-analysis.ipynb

templates/
   ├── index.html

scripts/
   ├── setup_nltk.py          
   └── fake_news_logreg_rf.py     ## Train & evaluate Naive Bayes, Logistic Regression, Random Forest
results/
   ├── model_comparison.md        ## Generated baseline comparison table (markdown)
   └── comparison.png             ## Generated accuracy bar chart

.gitattributes
app.py
hero_img.svg
LICENSE
Readme.md
requirements.txt
```

## ⚙️ Installation & Setup

1. Clone the repository and navigate into it:
   ```bash
   git clone https://github.com/Deepika14145/QuickFactChecker.git
   cd QuickFactChecker
   ```
2. Create virtual environment (optional but recommended)
   ```bash
      python -m venv venv
3. Activate the virtual environment:
   ```bash
      source venv/bin/activate   # for Linux/Mac
      venv\Scripts\activate      # for Windows
   ```

4. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Download NLTK Corpora:
```bash
python scripts/setup_nltk.py
```

## 📊 Baseline Model Comparison

We evaluated three models on the LIAR dataset using TF-IDF features. Example results (accuracy & precision):
example:
| Model               | Accuracy | Precision |
|---------------------|----------|-----------|
| Naive Bayes         | 0.XXXX   | 0.XXXX    |
| Logistic Regression | 0.XXXX   | 0.XXXX    |
| Random Forest       | 0.XXXX   | 0.XXXX    |

Logistic Regression achieved the highest accuracy among the tested baselines.
### 🔧 Run the comparison script
To reproduce these results, run:
```bash
scripts/fake_news_logreg_rf.py
```

## ▶️ Usage

1. Run the following command to start the application:
   ```bash
   python app.py
   ```

2. The app will provide predictions on whether a news article is real or fake based on the input.
   
## 🛠️ Model Training
To retrain or experiment with the models, run the provided Jupyter notebooks. Ensure your virtual environment is activated and all dependencies are installed.
### Naive Bayes
Run the notebook:
 ```bash
jupyter notebook fake-news-detection-using-nb.ipynb
 ```

### LSTM
Run the notebook:
 ```bash
jupyter notebook fake-news-detection-using-lstm.ipynb
 ```

### Dataset Analysis
```bash
jupyter notebook liar-data-analysis.ipynb
 ```
## 🤝 Contributing

Contributions are welcome! Whether you’re fixing typos, improving docs, or adding new features — every PR helps. Follow these steps:

1. Fork the repository
2. Create a new branch (git checkout -b feature-name)
3. Make your changes
4. Commit your changes (git commit -m 'description of your feature/fix')
5. Push to the branch  (git push origin feature-name)
6. Create a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## 📦 Deployment

The application is deployed on **Render** and accessible at: [https://quickfactchecker.onrender.com/](https://quickfactchecker.onrender.com/)

### Deployment Features:
- ✅ **Free hosting** on Render
- ✅ **Auto-deployment** from GitHub commits
- ✅ **Production-ready** with Gunicorn server
- ✅ **HTTPS enabled** by default
- ✅ **Optimized requirements** for faster build times

### Technical Stack:
- **Backend**: Flask (Python)
- **Server**: Gunicorn
- **Platform**: Render
- **CI/CD**: GitHub integration

## 📧 Contact  

For queries, feedback, or guidance regarding this project, you can contact the **mentor** assigned to the issue:  

- 📩 **GitHub** (Owner): [Deepika14145](https://github.com/Deepika14145)
- 💬 **By commit/PR comments**: Please tag the mentor in your commit or pull request discussion for direct feedback.  
 
Original Repository: [QuickFactChecker](https://github.com/Deepika14145/QuickFactChecker.git)  



## 📄 **License**
This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

--- 

If you find this project useful, please give it a ⭐️! Your support is appreciated!

Feel free to contribute or suggest new features!🙏
