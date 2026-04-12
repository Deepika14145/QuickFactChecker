/**
 * Quick Fact Checker — Main Frontend Logic
 * Handles form submission, theme toggling, history, and UI feedback.
 */
(function () {
  'use strict';

  // ==============================
  // CONFIGURATION
  // ==============================
  const CONFIG = {
    MAX_HISTORY_ITEMS: 5,
    API_TIMEOUT_MS: 10000,
    STORAGE_KEY: 'fact-check-history',
    THEME_KEY: 'theme',
  };

  const STRINGS = {
    EMPTY_INPUT: 'Please enter some text to analyze.',
    COPIED: 'Result copied to clipboard!',
    COPY_FAILED: 'Could not copy — try manually.',
    SHARED: 'Result shared successfully!',
    NETWORK_ERROR: 'Network error. Check your connection and try again.',
    TIMEOUT_ERROR: 'Request timed out. Please try again.',
    API_ERROR: 'Service temporarily unavailable. Please try again later.',
    GENERIC_ERROR: 'Something went wrong. Please try again.',
    LOADING_MESSAGE: 'Analyzing your text…',
    CHAR_COUNT: (n) => `${n} character${n !== 1 ? 's' : ''}`,
  };

  // ==============================
  // DOM ELEMENT REFERENCES
  // ==============================
  const el = {
    form:            document.getElementById('prediction-form'),
    submitBtn:       document.getElementById('submit-btn'),
    textInput:       document.getElementById('text-input'),
    charCountText:   document.getElementById('char-count-text'),
    clearBtn:        document.getElementById('clear-btn'),
    sampleBtns:      document.querySelectorAll('.sample-btn'),
    predictionResult:document.getElementById('prediction-result'),
    resultTitle:     document.getElementById('result-title'),
    resultMessage:   document.getElementById('result-message'),
    confidenceBar:   document.getElementById('confidence-bar'),
    confidenceFill:  document.getElementById('confidence-fill'),
    confidenceText:  document.getElementById('confidence-text'),
    copyBtn:         document.getElementById('copy-btn'),
    shareBtn:        document.getElementById('share-btn'),
    retryBtn:        document.getElementById('retry-btn'),
    historyCard:     document.getElementById('history-card'),
    historyHeader:   document.getElementById('history-header'),
    historyItems:    document.getElementById('history-items'),
    historyToggle:   document.getElementById('history-toggle'),
    historyCount:    document.getElementById('history-count'),
    themeToggle:     document.getElementById('theme-toggle'),
    themeIcon:       document.querySelector('.theme-icon'),
    mobileMenuBtn:   document.getElementById('mobile-menu-btn'),
    mobileMenu:      document.getElementById('mobile-menu'),
    homeLogo:        document.getElementById('home-logo'),
    loginGithub:     document.getElementById('login-github'),
    userMenu:        document.getElementById('user-menu'),
    userAvatar:      document.getElementById('user-avatar'),
    userName:        document.getElementById('user-name'),
    logoutBtn:       document.getElementById('logout-btn'),
    toast:           document.getElementById('toast'),
  };

  // ==============================
  // STATE
  // ==============================
  let history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '[]');
  let historyExpanded = false;
  let lastText = '';

  // ==============================
  // INITIALIZATION
  // ==============================
  function init() {
    applyTheme(localStorage.getItem(CONFIG.THEME_KEY) || 'light');
    bindEvents();
    updateCharCount();
    updateHistoryDisplay();
    refreshAuthUI();
    initDashboard();
  }

  function bindEvents() {
    el.themeToggle?.addEventListener('click', toggleTheme);
    el.form?.addEventListener('submit', handleFormSubmit);

    if (el.textInput) {
      el.textInput.addEventListener('input', () => {
        updateCharCount();
        toggleClearButton();
      });
    }

    el.clearBtn?.addEventListener('click', clearInput);

    el.sampleBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!el.textInput) return;
        el.textInput.value = btn.dataset.sample || '';
        updateCharCount();
        toggleClearButton();
        el.textInput.focus();
      });
    });

    el.historyHeader?.addEventListener('click', toggleHistory);
    el.historyHeader?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleHistory(); }
    });

    el.copyBtn?.addEventListener('click', copyResult);
    el.shareBtn?.addEventListener('click', shareResult);
    el.retryBtn?.addEventListener('click', retryAnalysis);
    el.logoutBtn?.addEventListener('click', handleLogout);
    el.mobileMenuBtn?.addEventListener('click', toggleMobileMenu);
    el.homeLogo?.addEventListener('click', handleHomeLogoClick);

    document.querySelectorAll('.mobile-nav-link').forEach((link) => {
      link.addEventListener('click', closeMobileMenu);
    });
  }

  // ==============================
  // THEME
  // ==============================
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
    updateThemeIcon(theme);
  }

  function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    const theme = isDark ? 'dark' : 'light';
    localStorage.setItem(CONFIG.THEME_KEY, theme);
    updateThemeIcon(theme);
    showToast(`Switched to ${theme} mode`);
  }

  function updateThemeIcon(theme) {
    if (!el.themeIcon) return;
    if (theme === 'dark') {
      el.themeIcon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    } else {
      el.themeIcon.innerHTML = `
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2"/><path d="M12 20v2"/>
        <path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/>
        <path d="M2 12h2"/><path d="M20 12h2"/>
        <path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
      `;
    }
  }

  // ==============================
  // AUTH
  // ==============================
  async function refreshAuthUI() {
    try {
      const res = await fetch('/api/me', { credentials: 'same-origin' });
      const data = await res.json();
      if (data?.authenticated && data.user) {
        if (el.loginGithub) el.loginGithub.style.display = 'none';
        if (el.userMenu) el.userMenu.style.display = 'inline-flex';
        if (el.userName) el.userName.textContent = data.user.name || data.user.login || 'User';
        if (el.userAvatar) {
          if (data.user.avatar_url) {
            el.userAvatar.src = data.user.avatar_url;
            el.userAvatar.style.display = 'inline';
            // Remove any initial badge
            el.userMenu.querySelector('.avatar-badge')?.remove();
          } else {
            // Show initial badge instead of broken img
            el.userAvatar.style.display = 'none';
            if (!el.userMenu.querySelector('.avatar-badge')) {
              const badge = document.createElement('span');
              badge.className = 'avatar-badge';
              badge.textContent = (data.user.name || data.user.login || 'U')[0].toUpperCase();
              el.userMenu.insertBefore(badge, el.userMenu.firstChild);
            }
          }
        }
      } else {
        if (el.loginGithub) el.loginGithub.style.display = 'inline-flex';
        if (el.userMenu) el.userMenu.style.display = 'none';
        el.userMenu?.querySelector('.avatar-badge')?.remove();
      }
    } catch (_) {
      if (el.loginGithub) el.loginGithub.style.display = 'inline-flex';
      if (el.userMenu) el.userMenu.style.display = 'none';
    }
  }

  async function handleLogout(e) {
    e.preventDefault();
    try {
      await fetch('/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    } catch (_) { /* ignore */ }
    await refreshAuthUI();
    showToast('Signed out successfully');
  }

  // ==============================
  // FORM SUBMISSION
  // ==============================
  async function handleFormSubmit(e) {
    e.preventDefault();
    const text = el.textInput?.value.trim() || '';

    if (!text) {
      showToast(STRINGS.EMPTY_INPUT);
      el.textInput?.focus();
      return;
    }

    lastText = text;
    setLoading(true);
    showResultPanel();
    displayResult('Analyzing…', STRINGS.LOADING_MESSAGE, 'loading');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.API_TIMEOUT_MS);

      const response = await fetch('/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        displayResult('Analysis Error', result.error, 'error');
        showRetryButton();
        return;
      }

      const message = result.analysis || result.message || `Prediction: ${result.prediction}`;
      const type = result.prediction === 1 ? 'success' : 'warning';
      displayResult('Analysis Complete', message, type, result.confidence);
      addToHistory(text, message);
      if (result.prediction === 1) launchConfetti();

    } catch (err) {
      let msg = STRINGS.GENERIC_ERROR;
      let title = 'Error';

      if (err.name === 'AbortError') {
        msg = STRINGS.TIMEOUT_ERROR; title = 'Request Timeout';
      } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        msg = STRINGS.NETWORK_ERROR; title = 'Network Error';
      } else if (err.message.startsWith('HTTP_')) {
        msg = STRINGS.API_ERROR; title = 'Service Error';
      }

      displayResult(title, msg, 'error');
      showRetryButton();
    } finally {
      setLoading(false);
    }
  }

  // ==============================
  // LOADING STATE
  // ==============================
  function setLoading(isLoading) {
    if (!el.submitBtn) return;
    el.submitBtn.disabled = isLoading;

    const spinner = el.submitBtn.querySelector('.loading-spinner');
    const content = el.submitBtn.querySelector('.btn-content');
    if (spinner) spinner.style.display = isLoading ? 'inline-block' : 'none';
    if (content) content.style.display = isLoading ? 'none' : 'inline-flex';
  }

  // ==============================
  // RESULT DISPLAY
  // ==============================
  function showResultPanel() {
    if (!el.predictionResult) return;
    el.predictionResult.style.display = 'flex';
    el.predictionResult.classList.add('show');
  }

  /**
   * Update the result panel with title, message, type, and optional confidence.
   * @param {string} title
   * @param {string} message
   * @param {'loading'|'success'|'warning'|'error'} type
   * @param {number|null} confidence  0–1 float
   */
  function displayResult(title, message, type, confidence = null) {
    if (el.resultTitle) el.resultTitle.textContent = title;
    if (el.resultMessage) el.resultMessage.textContent = message;

    if (el.predictionResult) {
      el.predictionResult.className = `prediction-result show ${type}`;
      el.predictionResult.setAttribute('aria-busy', type === 'loading' ? 'true' : 'false');
      if (type !== 'loading') el.predictionResult.focus();
    }

    // Hide retry during loading
    if (el.retryBtn) el.retryBtn.style.display = 'none';

    if (type === 'loading') {
      if (el.confidenceBar) el.confidenceBar.style.display = 'none';
      if (el.confidenceText) el.confidenceText.style.display = 'none';
      return;
    }

    // Confidence bar
    if (confidence != null && el.confidenceBar && el.confidenceFill && el.confidenceText) {
      const pct = Math.round(confidence * 100);
      el.confidenceBar.style.display = 'block';
      el.confidenceText.style.display = 'block';
      el.confidenceText.textContent = `Confidence: ${pct}%`;
      // Animate after a tick so CSS transition fires
      requestAnimationFrame(() => {
        el.confidenceFill.style.width = `${pct}%`;
      });
    } else {
      if (el.confidenceBar) el.confidenceBar.style.display = 'none';
      if (el.confidenceText) el.confidenceText.style.display = 'none';
    }
  }

  function showRetryButton() {
    if (el.retryBtn) el.retryBtn.style.display = 'inline-flex';
  }

  // ==============================
  // CHARACTER COUNT
  // ==============================
  function updateCharCount() {
    if (!el.textInput || !el.charCountText) return;
    el.charCountText.textContent = STRINGS.CHAR_COUNT(el.textInput.value.length);
  }

  function toggleClearButton() {
    if (!el.clearBtn || !el.textInput) return;
    el.clearBtn.style.display = el.textInput.value.length > 0 ? 'inline' : 'none';
  }

  function clearInput() {
    if (!el.textInput) return;
    el.textInput.value = '';
    updateCharCount();
    toggleClearButton();
    el.textInput.focus();
  }

  // ==============================
  // HISTORY
  // ==============================
  function addToHistory(text, result) {
    const item = {
      id: Date.now(),
      text: text.length > 100 ? text.substring(0, 100) + '…' : text,
      result,
      date: new Date().toLocaleDateString(),
    };
    history.unshift(item);
    if (history.length > CONFIG.MAX_HISTORY_ITEMS) {
      history = history.slice(0, CONFIG.MAX_HISTORY_ITEMS);
    }
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(history));
    updateHistoryDisplay();
  }

  function updateHistoryDisplay() {
    if (!el.historyCount || !el.historyCard) return;
    el.historyCount.textContent = history.length;
    el.historyCard.style.display = history.length > 0 ? 'block' : 'none';

    if (el.historyItems && history.length > 0) {
      el.historyItems.innerHTML = history.map((item) => `
        <div class="history-item">
          <div class="history-item-header">
            <div class="history-result">${escapeHtml(item.result)}</div>
            <div class="history-date">${escapeHtml(item.date)}</div>
          </div>
          <div class="history-text">${escapeHtml(item.text)}</div>
        </div>
      `).join('');
    }
  }

  function toggleHistory() {
    if (!el.historyItems || !el.historyToggle) return;
    historyExpanded = !historyExpanded;
    el.historyItems.style.display = historyExpanded ? 'block' : 'none';
    el.historyToggle.style.transform = historyExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
    el.historyHeader?.setAttribute('aria-expanded', String(historyExpanded));
  }

  // ==============================
  // COPY / SHARE
  // ==============================
  async function copyResult() {
    const text = el.resultMessage?.textContent || '';
    try {
      await navigator.clipboard.writeText(text);
      showToast(STRINGS.COPIED);
    } catch (_) {
      showToast(STRINGS.COPY_FAILED);
    }
  }

  async function shareResult() {
    const text = el.resultMessage?.textContent || '';
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Fact Checker Result', text });
        showToast(STRINGS.SHARED);
      } catch (_) { /* user cancelled */ }
    } else {
      await copyResult();
    }
  }

  function retryAnalysis() {
    if (el.form) el.form.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  // ==============================
  // TOAST
  // ==============================
  function showToast(message) {
    if (!el.toast) return;
    el.toast.textContent = message;
    el.toast.classList.add('show');
    setTimeout(() => el.toast.classList.remove('show'), 3000);
  }

  // ==============================
  // CONFETTI (lightweight)
  // ==============================
  function launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 6 + 3,
      d: Math.random() * 80,
      color: `hsl(${Math.random() * 360},70%,60%)`,
      tilt: Math.random() * 10 - 10,
      tiltAngle: 0,
      tiltAngleInc: Math.random() * 0.07 + 0.05,
    }));

    let frame = 0;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.tiltAngle += p.tiltAngleInc;
        p.y += (Math.cos(frame / 10 + p.d) + 1 + p.r / 2) * 1.5;
        p.tilt = Math.sin(p.tiltAngle) * 15;
        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 4, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 4);
        ctx.stroke();
      });
      frame++;
      if (frame < 120) {
        requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
      }
    }
    draw();
  }

  // ==============================
  // MOBILE MENU
  // ==============================
  function toggleMobileMenu() {
    const isOpen = el.mobileMenu?.classList.contains('show');
    isOpen ? closeMobileMenu() : openMobileMenu();
  }

  function openMobileMenu() {
    if (!el.mobileMenu || !el.mobileMenuBtn) return;
    el.mobileMenu.classList.add('show');
    el.mobileMenu.setAttribute('aria-hidden', 'false');
    el.mobileMenuBtn.setAttribute('aria-expanded', 'true');
    // Animate hamburger → X
    const spans = el.mobileMenuBtn.querySelectorAll('span');
    if (spans.length >= 3) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 6px)';
      spans[1].style.opacity = '0';
      spans[1].style.transform = 'scaleX(0)';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -6px)';
    }
  }

  function closeMobileMenu() {
    if (!el.mobileMenu || !el.mobileMenuBtn) return;
    el.mobileMenu.classList.remove('show');
    el.mobileMenu.setAttribute('aria-hidden', 'true');
    el.mobileMenuBtn.setAttribute('aria-expanded', 'false');
    // Animate X → hamburger
    const spans = el.mobileMenuBtn.querySelectorAll('span');
    if (spans.length >= 3) {
      spans[0].style.transform = 'none';
      spans[1].style.opacity = '1';
      spans[1].style.transform = 'none';
      spans[2].style.transform = 'none';
    }
  }

  // ==============================
  // HOME LOGO CLICK
  // ==============================
  function handleHomeLogoClick(e) {
    e.preventDefault();
    clearInput();
    if (el.predictionResult) {
      el.predictionResult.style.display = 'none';
      el.predictionResult.className = 'prediction-result';
    }
    if (el.confidenceBar) el.confidenceBar.style.display = 'none';
    if (el.confidenceText) el.confidenceText.style.display = 'none';
    if (historyExpanded) toggleHistory();
    closeMobileMenu();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    el.textInput?.focus();
  }

  // ==============================
  // DASHBOARD (Chart.js)
  // ==============================
  function initDashboard() {
    const canvas = document.getElementById('dashboard-chart');
    if (!canvas || typeof Chart === 'undefined') return;

    // Mock performance data keyed by dataset → model → metric
    const DATA = {
      test: {
        logreg: { accuracy: 0.87, precision: 0.85, recall: 0.88, f1: 0.86 },
        rf:     { accuracy: 0.89, precision: 0.88, recall: 0.90, f1: 0.89 },
        lstm:   { accuracy: 0.91, precision: 0.90, recall: 0.92, f1: 0.91 },
      },
      train: {
        logreg: { accuracy: 0.92, precision: 0.91, recall: 0.93, f1: 0.92 },
        rf:     { accuracy: 0.95, precision: 0.94, recall: 0.96, f1: 0.95 },
        lstm:   { accuracy: 0.97, precision: 0.96, recall: 0.97, f1: 0.96 },
      },
      valid: {
        logreg: { accuracy: 0.85, precision: 0.83, recall: 0.86, f1: 0.84 },
        rf:     { accuracy: 0.87, precision: 0.86, recall: 0.88, f1: 0.87 },
        lstm:   { accuracy: 0.89, precision: 0.88, recall: 0.90, f1: 0.89 },
      },
    };

    const MODEL_COLORS = {
      logreg: { bar: '#4f46e5', light: 'rgba(79,70,229,0.15)' },
      rf:     { bar: '#7c3aed', light: 'rgba(124,58,237,0.15)' },
      lstm:   { bar: '#06b6d4', light: 'rgba(6,182,212,0.15)' },
    };
    const MODEL_LABELS = { logreg: 'Logistic Regression', rf: 'Random Forest', lstm: 'LSTM' };

    // State
    let activeModels = new Set(['logreg', 'rf', 'lstm']);
    let activeDataset = 'test';
    let activeMetric = 'accuracy';

    // Chart instance
    const chart = new Chart(canvas, {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${(ctx.raw * 100).toFixed(1)}%`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: false,
            min: 0.5,
            max: 1,
            ticks: {
              callback: (v) => `${(v * 100).toFixed(0)}%`,
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#9ca3af',
            },
            grid: { color: 'rgba(0,0,0,0.06)' },
          },
          x: {
            ticks: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#6b7280',
            },
            grid: { display: false },
          },
        },
        animation: { duration: 500, easing: 'easeInOutQuart' },
      },
    });

    /** Rebuild chart and stat cards from current state */
    function update() {
      const models = [...activeModels];
      const datasetData = DATA[activeDataset] || DATA.test;

      // Chart data — one dataset per model
      chart.data.labels = [activeMetric.charAt(0).toUpperCase() + activeMetric.slice(1)];
      chart.data.datasets = models.map((m) => ({
        label: MODEL_LABELS[m],
        data: [datasetData[m]?.[activeMetric] ?? 0],
        backgroundColor: MODEL_COLORS[m].bar,
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 48,
      }));
      chart.update();

      // Stat cards — each gets its model color as the bottom accent
      const statCards = document.getElementById('stat-cards');
      if (statCards) {
        const gradients = {
          logreg: 'linear-gradient(90deg,#4f46e5,#6366f1)',
          rf:     'linear-gradient(90deg,#7c3aed,#a78bfa)',
          lstm:   'linear-gradient(90deg,#06b6d4,#22d3ee)',
        };
        statCards.innerHTML = models.map((m) => {
          const val = datasetData[m]?.[activeMetric] ?? 0;
          const pct = (val * 100).toFixed(1);
          return `
            <div class="stat-card" style="--stat-accent:${gradients[m] || gradients.logreg}">
              <div class="stat-card-label">${MODEL_LABELS[m]}</div>
              <div class="stat-card-value" style="background:${gradients[m]};-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent">${pct}%</div>
              <div class="stat-card-model">${activeMetric} · ${activeDataset}</div>
            </div>`;
        }).join('');
      }

      // Legend row
      const legend = document.getElementById('chart-legend');
      if (legend) {
        legend.innerHTML = models.map((m) => `
          <span class="legend-item">
            <span class="legend-swatch" style="background:${MODEL_COLORS[m].bar}"></span>
            ${MODEL_LABELS[m]}
          </span>`).join('');
      }
      const summaryText = document.getElementById('summary-text');
      if (summaryText && models.length) {
        const best = models.reduce((a, b) =>
          (datasetData[a]?.[activeMetric] ?? 0) >= (datasetData[b]?.[activeMetric] ?? 0) ? a : b
        );
        const score = ((datasetData[best]?.[activeMetric] ?? 0) * 100).toFixed(1);
        summaryText.textContent =
          `${MODEL_LABELS[best]} leads on ${activeMetric} (${score}%) using the ${activeDataset} dataset.`;
      } else if (summaryText) {
        summaryText.textContent = 'Select at least one model to see insights.';
      }
    }

    // Wire up pill toggles (model selection)
    document.querySelectorAll('#model-pill-group .pill').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.value;
        if (activeModels.has(val)) {
          if (activeModels.size > 1) { // keep at least one selected
            activeModels.delete(val);
            btn.classList.remove('active');
          }
        } else {
          activeModels.add(val);
          btn.classList.add('active');
        }
        update();
      });
    });

    // Wire up segmented controls (dataset)
    document.querySelectorAll('#dataset-segmented .seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#dataset-segmented .seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeDataset = btn.dataset.value;
        update();
      });
    });

    // Wire up segmented controls (metric)
    document.querySelectorAll('#metric-segmented .seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#metric-segmented .seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeMetric = btn.dataset.value;
        update();
      });
    });

    update();
  }

  // ==============================
  // HELPERS
  // ==============================
  /** Escape HTML to prevent XSS when inserting user-generated content. */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ==============================
  // AUTH MODAL
  // ==============================
  function initAuthModal() {
    const modal       = document.getElementById('auth-modal');
    const openBtns    = [
      document.getElementById('login-github'),       // navbar btn (now opens modal)
      document.getElementById('mobile-open-auth'),   // mobile menu btn
    ];
    const closeBtn    = document.getElementById('modal-close');
    const tabLogin    = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const panelLogin  = document.getElementById('panel-login');
    const panelReg    = document.getElementById('panel-register');

    if (!modal) return;

    /** Open modal, optionally switching to a tab */
    function openModal(tab = 'login') {
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      switchTab(tab);
      // Focus first input
      setTimeout(() => {
        const first = modal.querySelector('input');
        first?.focus();
      }, 50);
    }

    function closeModal() {
      modal.hidden = true;
      document.body.style.overflow = '';
      clearErrors();
    }

    function switchTab(tab) {
      const isLogin = tab === 'login';
      tabLogin.classList.toggle('active', isLogin);
      tabRegister.classList.toggle('active', !isLogin);
      tabLogin.setAttribute('aria-selected', String(isLogin));
      tabRegister.setAttribute('aria-selected', String(!isLogin));
      panelLogin.hidden  = !isLogin;
      panelReg.hidden    = isLogin;
    }

    function clearErrors() {
      ['login-error', 'register-error'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) { el.setAttribute('hidden', ''); el.textContent = ''; }
      });
    }

    function showError(id, msg) {
      const el = document.getElementById(id);
      if (el) { el.textContent = msg; el.removeAttribute('hidden'); }
    }

    function setSubmitting(formId, busy) {
      const btn = document.getElementById(
        formId === 'login-form' ? 'login-submit' : 'register-submit'
      );
      if (!btn) return;
      btn.disabled = busy;
      const text    = btn.querySelector('.modal-submit-text');
      const spinner = btn.querySelector('.modal-submit-spinner');
      if (text)    text.style.display    = busy ? 'none' : '';
      if (spinner) spinner.style.display = busy ? 'inline-block' : 'none';
    }

    // Open triggers
    openBtns.forEach((btn) => {
      btn?.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('login');
      });
    });

    // Tab switching
    tabLogin?.addEventListener('click',    () => switchTab('login'));
    tabRegister?.addEventListener('click', () => switchTab('register'));

    // Switch links inside panels
    modal.querySelectorAll('.modal-switch-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.switch));
    });

    // Close
    closeBtn?.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

    // Password visibility toggles
    modal.querySelectorAll('.toggle-pw').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        if (!input) return;
        const isText = input.type === 'text';
        input.type = isText ? 'password' : 'text';
        btn.setAttribute('aria-label', isText ? 'Show password' : 'Hide password');
      });
    });

    // LOGIN form
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();
      const username = document.getElementById('login-username')?.value.trim();
      const password = document.getElementById('login-password')?.value;
      if (!username || !password) { showError('login-error', 'Please fill in all fields.'); return; }

      setSubmitting('login-form', true);
      try {
        const res  = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
          credentials: 'same-origin',
        });
        const data = await res.json();
        if (!res.ok) { showError('login-error', data.error || 'Login failed.'); return; }
        closeModal();
        await refreshAuthUI();
        showToast(`Welcome back, ${data.user.name}! 👋`);
      } catch (_) {
        showError('login-error', 'Network error. Please try again.');
      } finally {
        setSubmitting('login-form', false);
      }
    });

    // REGISTER form
    document.getElementById('register-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearErrors();
      const name     = document.getElementById('reg-name')?.value.trim();
      const username = document.getElementById('reg-username')?.value.trim();
      const password = document.getElementById('reg-password')?.value;
      if (!name || !username || !password) { showError('register-error', 'Please fill in all fields.'); return; }

      setSubmitting('register-form', true);
      try {
        const res  = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, username, password }),
          credentials: 'same-origin',
        });
        const data = await res.json();
        if (!res.ok) { showError('register-error', data.error || 'Registration failed.'); return; }
        closeModal();
        await refreshAuthUI();
        showToast(`Account created! Welcome, ${data.user.name} 🎉`);
      } catch (_) {
        showError('register-error', 'Network error. Please try again.');
      } finally {
        setSubmitting('register-form', false);
      }
    });
  }

  // ==============================
  // BOOT
  // ==============================
  document.addEventListener('DOMContentLoaded', () => { init(); initAuthModal(); });

})();
