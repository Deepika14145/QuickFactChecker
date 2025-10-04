
    // 🎯 IIFE Pattern - Modular, maintainable, scalable
    (function() {
        'use strict';
        // ======================
        // CONFIG & CONSTANTS
        // ======================
        const CONFIG = {
            MAX_CHARACTERS: 1000,
            MAX_HISTORY_ITEMS: 5,
            API_TIMEOUT_MIN: 2000,
            API_TIMEOUT_MAX: 3000,
            CONFIDENCE_MIN: 0.65,
            CONFIDENCE_RANGE: 0.30,
            STORAGE_KEY: 'fact-check-history',
            THEME_STORAGE_KEY: 'theme'
        };
        // Decide API base dynamically (supports static preview on :8000 hitting Flask on :5000)
        const API_BASE = (() => {
            try {
                const url = new URL(window.location.href);
                if (url.port === '8000') return 'http://127.0.0.1:5000';
            } catch {}
            return '';
        })();
        // i18n Strings (ready for translation)
        const STRINGS = {
            EMPTY_INPUT: "Please enter some text to analyze.",
            COPIED: "Result copied to clipboard!",
            COPY_FAILED: "Failed to copy result",
            SHARED: "Result shared successfully!",
            SHARE_FAILED: "Failed to share result",
            LINK_COPIED: "Share link copied to clipboard!",
            ANALYSIS_ERROR: "Error analyzing text. Please try again.",
            RETRY_SUCCESS: "Retrying analysis...",
            CHARACTER_COUNT: (count) => `${count} character${count !== 1 ? 's' : ''}`,
            RESULT_TRUE: "This text is likely TRUE",
            RESULT_FALSE: "This text is likely FAKE",
            ANALYSIS_COMPLETED: (text) => `Analysis completed for: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`,
            HISTORY_RESULT_TRUE: "TRUE",
            HISTORY_RESULT_FALSE: "FAKE",
            SHARE_TEXT: (result, text) => `Quick Fact Checker result: ${result} - "${text.substring(0, 100)}..."`
        };
        // DOM Elements
        const elements = {
            form: document.getElementById('prediction-form'),
            submitBtn: document.getElementById('submit-btn'),
            btnContent: document.querySelector('.btn-content'),
            loadingSpinner: document.querySelector('.loading-spinner'),
            predictionResult: document.getElementById('prediction-result'),
            themeToggle: document.getElementById('theme-toggle'),
            themeIcon: document.querySelector('.theme-icon'),
            textInput: document.getElementById('text-input'),
            charCountText: document.getElementById('char-count-text'),
            clearBtn: document.getElementById('clear-btn'),
            sampleBtns: document.querySelectorAll('.sample-btn'),
            historyCard: document.getElementById('history-card'),
            historyHeader: document.getElementById('history-header'),
            historyItems: document.getElementById('history-items'),
            historyToggle: document.getElementById('history-toggle'),
            historyCount: document.getElementById('history-count'),
            copyBtn: document.getElementById('copy-btn'),
            shareBtn: document.getElementById('share-btn'),
            retryBtn: document.getElementById('retry-btn'),
            toast: document.getElementById('toast'),
            confettiCanvas: document.getElementById('confetti-canvas'),
            detailsBtn: document.getElementById('details-btn'),
            detailsModal: document.getElementById('details-modal'),
            modalClose: document.getElementById('modal-close'),
            comparisonTbody: document.getElementById('comparison-tbody'),
            modalSummary: document.getElementById('modal-summary')
        };
        // State
        let currentResult = null;
        let history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '[]');
        let historyExpanded = false;
        let resizeTimeout = null;
        // Initialize
        init();
        function init() {
            // Theme
            const savedTheme = localStorage.getItem(CONFIG.THEME_STORAGE_KEY) || 'light';
            if (savedTheme === 'dark') {
                document.body.classList.add('dark');
            }
            updateThemeIcon(savedTheme);
            // Event Listeners
            bindEvents();
            // Initial Setup
            updateCharCount();
            updateHistoryDisplay();
            setupConfettiCanvas();
            // Register Service Worker for PWA
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(console.warn);
            }
        }
        function bindEvents() {
            // Theme Toggle
            elements.themeToggle.addEventListener('click', toggleTheme);
            // Form Submission
            elements.form.addEventListener('submit', handleFormSubmit);
            // Textarea Input (Debounced)
            elements.textInput.addEventListener('input', () => {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(() => {
                    adjustTextareaHeight();
                    updateCharCount();
                    toggleClearButton();
                }, 100);
            });
            // Clear Button
            elements.clearBtn.addEventListener('click', clearInput);
            // Sample Buttons
            elements.sampleBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    elements.textInput.value = btn.dataset.sample;
                    adjustTextareaHeight();
                    updateCharCount();
                    toggleClearButton();
                    elements.textInput.focus();
                    elements.textInput.setSelectionRange(0, elements.textInput.value.length);
                });
            });
            // History Toggle
            elements.historyHeader.addEventListener('click', toggleHistory);
            elements.historyHeader.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleHistory();
                }
            });
            // Copy, Share, Details
            elements.copyBtn.addEventListener('click', copyResult);
            elements.shareBtn.addEventListener('click', shareResult);
            elements.retryBtn.addEventListener('click', retryAnalysis);
            elements.detailsBtn.addEventListener('click', openDetailsModal);
            elements.modalClose.addEventListener('click', closeDetailsModal);
            elements.detailsModal.addEventListener('click', (e) => { if (e.target === elements.detailsModal) closeDetailsModal(); });
            // Keyboard Navigation
            document.addEventListener('keydown', handleGlobalKeys);
        }
        // ======================
        // THEME MANAGEMENT
        // ======================
        function toggleTheme() {
            const isDark = document.body.classList.toggle('dark');
            const newTheme = isDark ? 'dark' : 'light';
            localStorage.setItem(CONFIG.THEME_STORAGE_KEY, newTheme);
            updateThemeIcon(newTheme);
        }
        function updateThemeIcon(theme) {
            elements.themeIcon.innerHTML = theme === 'dark' ? 
                `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>` :
                `<circle cx="12" cy="12" r="4"/>
                    <path d="M12 2v2"/>
                    <path d="M12 20v2"/>
                    <path d="m4.93 4.93 1.41 1.41"/>
                    <path d="m17.66 17.66 1.41 1.41"/>
                    <path d="M2 12h2"/>
                    <path d="M20 12h2"/>
                    <path d="m6.34 17.66-1.41 1.41"/>
                    <path d="m19.07 4.93-1.41 1.41"/>`;
        }
        // ======================
        // TEXTAREA & INPUT
        // ======================
        function adjustTextareaHeight() {
            elements.textInput.style.height = 'auto';
            elements.textInput.style.height = Math.max(120, elements.textInput.scrollHeight) + 'px';
        }
        function updateCharCount() {
            const count = elements.textInput.value.length;
            elements.charCountText.textContent = STRINGS.CHARACTER_COUNT(count);
            // Warn if over limit
            if (count > CONFIG.MAX_CHARACTERS) {
                showToast(`Text exceeds ${CONFIG.MAX_CHARACTERS} character limit.`);
                elements.submitBtn.disabled = true;
            } else {
                elements.submitBtn.disabled = false;
            }
        }
        function toggleClearButton() {
            elements.clearBtn.style.display = elements.textInput.value.length > 0 ? 'block' : 'none';
        }
        function clearInput() {
            elements.textInput.value = '';
            adjustTextareaHeight();
            updateCharCount();
            toggleClearButton();
            elements.textInput.focus();
        }
        // ======================
    // FORM & API CALLS
        // ======================
        async function handleFormSubmit(event) {
            event.preventDefault();
            const text = elements.textInput.value.trim();
            if (!text) {
                showToast(STRINGS.EMPTY_INPUT);
                elements.textInput.focus();
                return;
            }
            if (text.length > CONFIG.MAX_CHARACTERS) {
                showToast(`Text exceeds ${CONFIG.MAX_CHARACTERS} character limit.`);
                return;
            }
            setLoading(true);
            elements.predictionResult.classList.remove('show');
            try {
                const result = await analyzeServer(text);
                // Persist last comparison for details modal
                lastComparison = result;
                const best = result.best;
                showResult(best.prediction, best.confidence, text, best.model);
            } catch (error) {
                console.error('Analysis Error:', error);
                showResult(-1, null, text);
            } finally {
                setLoading(false);
            }
        }
        let lastComparison = null;
        async function analyzeServer(text) {
            // Try backend first
            try {
                const res = await fetch(`${API_BASE}/predict_all`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return await res.json();
            } catch (e) {
                // Fallback to local mock if backend unavailable
                console.warn('Backend unavailable, using mock comparison:', e);
                await new Promise(r => setTimeout(r, 700));
                const models = ['Logistic Regression','Support Vector Machine','XGBoost','Naive Bayes','LSTM (Keras)'];
                const results = models.map(name => ({
                    model: name,
                    key: `mock_${name.substring(0,3).toLowerCase()}`,
                    prediction: Math.random() > 0.5 ? 1 : 0,
                    confidence: CONFIG.CONFIDENCE_MIN + Math.random() * CONFIG.CONFIDENCE_RANGE,
                    source: 'mock'
                }));
                const best = results.reduce((a,b,i) => (b.confidence > a.confidence ? { ...b, index: i } : a), { ...results[0], index: 0 });
                return { input_text: text, results, best, models_loaded: {} };
            }
        }
        function retryAnalysis() {
            elements.retryBtn.disabled = true;
            elements.retryBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="loading-spinner" style="width:16px;height:16px;"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/></svg> ${STRINGS.RETRY_SUCCESS}`;
            setTimeout(() => {
                handleFormSubmit(new Event('submit'));
            }, 800);
        }
        // ======================
        // UI & RESULTS
        // ======================
        function setLoading(isLoading) {
            elements.submitBtn.disabled = isLoading;
            elements.btnContent.style.display = isLoading ? 'none' : 'flex';
            elements.loadingSpinner.style.display = isLoading ? 'block' : 'none';
        }
        function showResult(prediction, confidence = null, text = '', bestModelName = null) {
            currentResult = { 
                prediction, 
                confidence, 
                text, 
                timestamp: new Date(),
                bestModelName
            };
            const resultTitle = document.getElementById('result-title');
            const resultMessage = document.getElementById('result-message');
            const confidenceBar = document.getElementById('confidence-bar');
            const confidenceFill = document.getElementById('confidence-fill');
            const confidenceText = document.getElementById('confidence-text');
            const resultIconSvg = elements.predictionResult.querySelector('.result-icon-svg');
            // Reset classes
            elements.predictionResult.className = 'prediction-result';
            let message, className, iconSvg;
            if (prediction === 1) {
                message = STRINGS.RESULT_TRUE;
                className = 'success';
                iconSvg = `
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                    <path d="m9 12 2 2 4-4"/>
                `;
                // Trigger confetti
                setTimeout(() => launchConfetti(), 500);
            } else if (prediction === 0) {
                message = STRINGS.RESULT_FALSE;
                className = 'error';
                iconSvg = `
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                    <path d="M12 9v4"/>
                    <path d="M12 17h.01"/>
                `;
            } else {
                message = STRINGS.ANALYSIS_ERROR;
                className = 'warning';
                iconSvg = `
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                    <path d="M12 9v4"/>
                    <path d="M12 17h.01"/>
                `;
                elements.retryBtn.style.display = 'block';
            }
            elements.predictionResult.classList.add(className);
            resultTitle.textContent = message;
            const bestSuffix = bestModelName ? ` (Best model: ${bestModelName})` : '';
            resultMessage.textContent = STRINGS.ANALYSIS_COMPLETED(text) + bestSuffix;
            resultIconSvg.innerHTML = iconSvg;
            if (confidence !== null && prediction !== -1) {
                confidenceBar.style.display = 'block';
                confidenceText.style.display = 'block';
                confidenceText.textContent = `Confidence: ${Math.round(confidence * 100)}%`;
                setTimeout(() => {
                    confidenceFill.style.width = `${confidence * 100}%`;
                }, 300);
            } else {
                confidenceBar.style.display = 'none';
                confidenceText.style.display = 'none';
            }
            // Show result with animation
            setTimeout(() => {
                elements.predictionResult.classList.add('show');
                elements.predictionResult.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
                elements.retryBtn.style.display = 'none';
                elements.retryBtn.disabled = false;
                elements.retryBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/></svg> Retry`;
            }, 100);
            // Add to history
            if (prediction !== -1) {
                addToHistory(currentResult);
            }
        }
        // Details modal
        function openDetailsModal() {
            if (!lastComparison) {
                showToast('Run an analysis first.');
                return;
            }
            const { results, best } = lastComparison;
            elements.comparisonTbody.innerHTML = results
                .map((r, idx) => {
                    const cls = idx === best.index ? 'best-row' : '';
                    const tag = r.prediction === 1 ? '✓ TRUE' : '✗ FAKE';
                    return `<tr class="${cls}"><td>${r.model}</td><td>${tag}</td><td>${Math.round(r.confidence * 100)}%</td></tr>`;
                })
                .join('');
            elements.modalSummary.textContent = `Best model: ${best.model} — ${best.prediction === 1 ? 'TRUE' : 'FAKE'} with ${Math.round(best.confidence*100)}% confidence.`;
            elements.detailsModal.style.display = 'block';
            setTimeout(() => elements.detailsModal.classList.add('show'), 10);
        }
        function closeDetailsModal() {
            elements.detailsModal.classList.remove('show');
            setTimeout(() => elements.detailsModal.style.display = 'none', 200);
        }
        // ======================
        // HISTORY MANAGEMENT
        // ======================
        function addToHistory(result) {
            const historyItem = {
                id: Date.now().toString(),
                ...result
            };
            history.unshift(historyItem);
            history = history.slice(0, CONFIG.MAX_HISTORY_ITEMS);
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(history));
            updateHistoryDisplay();
        }
        function updateHistoryDisplay() {
            if (history.length === 0) {
                elements.historyCard.style.display = 'none';
                return;
            }
            elements.historyCard.style.display = 'block';
            elements.historyCount.textContent = history.length;
            // Lazy render only if expanded
            if (historyExpanded) {
                renderHistoryItems();
            }
        }
        function renderHistoryItems() {
            elements.historyItems.innerHTML = history.map(item => {
                const isTrue = item.prediction === 1;
                const resultText = isTrue ? STRINGS.HISTORY_RESULT_TRUE : STRINGS.HISTORY_RESULT_FALSE;
                const resultClass = isTrue ? 'true' : 'false';
                const confidenceText = item.confidence ? ` (${Math.round(item.confidence * 100)}%)` : '';
                return `
                    <div class="history-item" tabindex="0">
                        <button class="copy-history-btn" data-text="${encodeURIComponent(item.text)}" aria-label="Copy this text to input">
                            📋
                        </button>
                        <div class="history-item-header">
                            <span class="history-result ${resultClass}">
                                ${isTrue ? '✓' : '✗'} ${resultText}${confidenceText}
                            </span>
                            <span class="history-date">${new Date(item.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div class="history-text">${item.text}</div>
                    </div>
                `;
            }).join('');
            // Bind copy events for history items
            document.querySelectorAll('.copy-history-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const text = decodeURIComponent(this.dataset.text);
                    elements.textInput.value = text;
                    adjustTextareaHeight();
                    updateCharCount();
                    toggleClearButton();
                    elements.textInput.focus();
                    showToast("Text copied to input!");
                });
            });
        }
        function toggleHistory() {
            historyExpanded = !historyExpanded;
            elements.historyToggle.classList.toggle('expanded', historyExpanded);
            elements.historyHeader.setAttribute('aria-expanded', historyExpanded);
            if (historyExpanded) {
                elements.historyItems.classList.add('show');
                renderHistoryItems();
            } else {
                elements.historyItems.classList.remove('show');
            }
        }
        // ======================
        // COPY & SHARE
        // ======================
        function copyResult() {
            if (!currentResult) return;
            const resultText = currentResult.prediction === 1 ? STRINGS.HISTORY_RESULT_TRUE : STRINGS.HISTORY_RESULT_FALSE;
            const confidenceText = currentResult.confidence ? ` (${Math.round(currentResult.confidence * 100)}% confidence)` : '';
            const copyText = `Fact Check Result: ${resultText}${confidenceText}
Text analyzed: "${currentResult.text}"`;
            navigator.clipboard.writeText(copyText).then(() => {
                showToast(STRINGS.COPIED);
            }).catch(() => {
                showToast(STRINGS.COPY_FAILED);
            });
        }
        async function shareResult() {
            if (!currentResult) return;
            const resultText = currentResult.prediction === 1 ? STRINGS.HISTORY_RESULT_TRUE : STRINGS.HISTORY_RESULT_FALSE;
            const shareData = {
                title: 'Fact Check Result',
                text: STRINGS.SHARE_TEXT(resultText, currentResult.text),
                url: window.location.href
            };
            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                    showToast(STRINGS.SHARED);
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        showToast(STRINGS.SHARE_FAILED);
                    }
                }
            } else {
                navigator.clipboard.writeText(`${shareData.text}
${shareData.url}`).then(() => {
                    showToast(STRINGS.LINK_COPIED);
                }).catch(() => {
                    showToast(STRINGS.COPY_FAILED);
                });
            }
        }
        // ======================
        // UTILITIES
        // ======================
        function showToast(message) {
            elements.toast.textContent = message;
            elements.toast.classList.add('show');
            setTimeout(() => {
                elements.toast.classList.remove('show');
            }, 3000);
        }
        function handleGlobalKeys(e) {
            // Escape to collapse history
            if (e.key === 'Escape') {
                if (historyExpanded) toggleHistory();
                if (elements.detailsModal.classList.contains('show')) closeDetailsModal();
            }
        }
        // ======================
        // CONFETTI EFFECT (on TRUE)
        // ======================
        function setupConfettiCanvas() {
            const canvas = elements.confettiCanvas;
            const ctx = canvas.getContext('2d');
            let confetti = [];
            let animationId = null;
            function resizeCanvas() {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }
            function createConfetti() {
                const count = 150;
                confetti = [];
                for (let i = 0; i < count; i++) {
                    confetti.push({
                        x: Math.random() * canvas.width,
                        y: Math.random() * -canvas.height,
                        size: Math.random() * 5 + 3,
                        color: ['#4f46e5', '#7c3aed', '#10b981', '#f59e0b'][Math.floor(Math.random() * 4)],
                        speed: Math.random() * 3 + 2,
                        rotation: Math.random() * 360,
                        rotationSpeed: (Math.random() - 0.5) * 10
                    });
                }
            }
            function updateConfetti() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                let stillFalling = false;
                confetti.forEach(p => {
                    p.y += p.speed;
                    p.rotation += p.rotationSpeed;
                    if (p.y < canvas.height + 10) {
                        stillFalling = true;
                        ctx.save();
                        ctx.translate(p.x, p.y);
                        ctx.rotate(p.rotation * Math.PI / 180);
                        ctx.fillStyle = p.color;
                        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                        ctx.restore();
                    }
                });
                if (stillFalling) {
                    animationId = requestAnimationFrame(updateConfetti);
                } else {
                    canvas.style.display = 'none';
                    if (animationId) {
                        cancelAnimationFrame(animationId);
                        animationId = null;
                    }
                }
            }
            window.addEventListener('resize', resizeCanvas);
            resizeCanvas();
            createConfetti();
            window.launchConfetti = function() {
                canvas.style.display = 'block';
                resizeCanvas();
                createConfetti();
                if (animationId) cancelAnimationFrame(animationId);
                animationId = requestAnimationFrame(updateConfetti);
            };
        }
})(); // End IIFE

// Manifest.json placeholder
// For demo: create manifest.json dynamically
    if (!document.querySelector('link[rel="manifest"]')) {
        const manifest = {
            "name": "Quick Fact Checker",
            "short_name": "FactCheck",
            "start_url": "/",
            "display": "standalone",
            "background_color": "#4f46e5",
            "theme_color": "#4f46e5",
            "icons": [
                {
                    "src": "/icon-192.png",
                    "sizes": "192x192",
                    "type": "image/png"
                },
                {
                    "src": "/icon-512.png",
                    "sizes": "512x512",
                    "type": "image/png"
                }
            ]
        };
        const manifestBlob = new Blob([JSON.stringify(manifest)], {type: 'application/json'});
        const manifestURL = URL.createObjectURL(manifestBlob);
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = manifestURL;
        document.head.appendChild(link);
    }
    // Mock service worker for demo
    if ('serviceWorker' in navigator && !navigator.serviceWorker.controller) {
        const swScript = `
            self.addEventListener('install', e => e.waitUntil(self.skipWaiting()));
            self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
            self.addEventListener('fetch', () => {});
        `;
        const swBlob = new Blob([swScript], {type: 'application/javascript'});
        const swURL = URL.createObjectURL(swBlob);
        navigator.serviceWorker.register(swURL).catch(console.warn);
    }
