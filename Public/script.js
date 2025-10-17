// ==============================
// Quick Fact Checker - Clean JavaScript
// ==============================

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    MAX_CHARACTERS: 1000,
    MAX_HISTORY_ITEMS: 5,
    API_TIMEOUT: 3000,
    STORAGE_KEY: 'fact-check-history',
    THEME_STORAGE_KEY: 'theme'
  };

  const STRINGS = {
    EMPTY_INPUT: "Please enter some text to analyze.",
    COPIED: "Result copied to clipboard!",
    COPY_FAILED: "Failed to copy result",
    SHARED: "Result shared successfully!",
    ANALYSIS_ERROR: "Error analyzing text. Please try again.",
    CHARACTER_COUNT: (count) => `${count} character${count !== 1 ? 's' : ''}`,
  };

  // DOM Elements
  const elements = {
    form: document.getElementById('prediction-form'),
    submitBtn: document.getElementById('submit-btn'),
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
    resultTitle: document.getElementById('result-title'),
    resultMessage: document.getElementById('result-message'),
    confidenceBar: document.getElementById('confidence-bar'),
    confidenceFill: document.getElementById('confidence-fill'),
    confidenceText: document.getElementById('confidence-text'),
    mobileMenuBtn: document.getElementById('mobile-menu-btn'),
    mobileMenu: document.getElementById('mobile-menu'),
    homeLogo: document.getElementById('home-logo'),
    loginGithub: document.getElementById('login-github'),
    userMenu: document.getElementById('user-menu'),
    userAvatar: document.getElementById('user-avatar'),
    userName: document.getElementById('user-name'),
    logoutBtn: document.getElementById('logout-btn')
  };

  // State
  let history = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || '[]');
  let historyExpanded = false;

  // ==============================
  // INITIALIZATION
  // ==============================
  function init() {
    // Set theme
    const savedTheme = localStorage.getItem(CONFIG.THEME_STORAGE_KEY) || 'light';
    if (savedTheme === 'dark') document.body.classList.add('dark');
    updateThemeIcon(savedTheme);

    // Bind events
    bindEvents();
    
    // Initial setup
    updateCharCount();
    updateHistoryDisplay();
    refreshAuthUI();
    
    console.log('Quick Fact Checker initialized');
  }

  function bindEvents() {
    // Theme toggle
    elements.themeToggle?.addEventListener('click', toggleTheme);

    // Form submission
    elements.form?.addEventListener('submit', handleFormSubmit);

    // Text input
    if (elements.textInput) {
      elements.textInput.addEventListener('input', () => {
        updateCharCount();
        toggleClearButton();
      });
    }

    // Clear button
    elements.clearBtn?.addEventListener('click', clearInput);

    // Sample buttons
    elements.sampleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.textInput.value = btn.dataset.sample;
        updateCharCount();
        toggleClearButton();
        elements.textInput.focus();
      });
    });

    // History toggle
    elements.historyHeader?.addEventListener('click', toggleHistory);

    // Action buttons
    elements.copyBtn?.addEventListener('click', copyResult);
    elements.shareBtn?.addEventListener('click', shareResult);
    elements.retryBtn?.addEventListener('click', retryAnalysis);
    elements.logoutBtn?.addEventListener('click', handleLogout);
    
    // Mobile menu toggle
    elements.mobileMenuBtn?.addEventListener('click', toggleMobileMenu);
    
    // Close mobile menu when clicking on links
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });
    
    // Home logo click handler
    elements.homeLogo?.addEventListener('click', handleHomeLogoClick);
  }

  async function refreshAuthUI() {
    try {
      const res = await fetch('/api/me', { credentials: 'same-origin' });
      const data = await res.json();
      if (data && data.authenticated && data.user) {
        if (elements.loginGithub) elements.loginGithub.style.display = 'none';
        if (elements.userMenu) elements.userMenu.style.display = 'inline-flex';
        if (elements.userName) elements.userName.textContent = data.user.name || data.user.login || 'User';
        if (elements.userAvatar) {
          elements.userAvatar.src = data.user.avatar_url || '';
          elements.userAvatar.style.display = data.user.avatar_url ? 'inline' : 'none';
        }
      } else {
        if (elements.loginGithub) elements.loginGithub.style.display = 'inline-flex';
        if (elements.userMenu) elements.userMenu.style.display = 'none';
      }
    } catch (e) {
      if (elements.loginGithub) elements.loginGithub.style.display = 'inline-flex';
      if (elements.userMenu) elements.userMenu.style.display = 'none';
    }
  }

  async function handleLogout(e) {
    e.preventDefault();
    try {
      await fetch('/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
      // ignore
    } finally {
      await refreshAuthUI();
      showToast('Signed out');
    }
  }

  // ==============================
  // THEME FUNCTIONS
  // ==============================
  function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    const newTheme = isDark ? 'dark' : 'light';
    localStorage.setItem(CONFIG.THEME_STORAGE_KEY, newTheme);
    updateThemeIcon(newTheme);
    showToast(`Switched to ${newTheme} mode`);
  }

  function updateThemeIcon(theme) {
    if (!elements.themeIcon) return;
    
    if (theme === 'dark') {
      // Moon icon
      elements.themeIcon.innerHTML = `
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      `;
    } else {
      // Sun icon
      elements.themeIcon.innerHTML = `
        <circle cx="12" cy="12" r="4"/>
        <path d="M12 2v2"/>
        <path d="M12 20v2"/>
        <path d="m4.93 4.93 1.41 1.41"/>
        <path d="m17.66 17.66 1.41 1.41"/>
        <path d="M2 12h2"/>
        <path d="M20 12h2"/>
        <path d="m6.34 17.66-1.41 1.41"/>
        <path d="m19.07 4.93-1.41 1.41"/>
      `;
    }
  }

  // ==============================
  // FORM HANDLING
  // ==============================
  async function handleFormSubmit(e) {
    e.preventDefault();
    const text = elements.textInput.value.trim();
    
    if (!text) {
      showToast(STRINGS.EMPTY_INPUT);
      return;
    }

    setLoading(true);
    showResult();

    try {
      const response = await fetch('/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      const result = await response.json();

      if (result.error) {
        displayResult('Error', result.error, 'error');
      } else {
        const message = result.analysis || result.message || `Prediction: ${result.prediction}`;
        const resultType = result.prediction === 1 ? 'success' : 'error';
        displayResult('Analysis Result', message, resultType, result.confidence);
        addToHistory(text, message);
        if (result.prediction === 1) launchConfetti();
      }
    } catch (error) {
      displayResult('Error', STRINGS.ANALYSIS_ERROR, 'error');
      console.error('Request failed:', error);
    } finally {
      setLoading(false);
    }
  }

  function setLoading(isLoading) {
    if (!elements.submitBtn) return;
    
    elements.submitBtn.disabled = isLoading;
    
    if (isLoading) {
      elements.submitBtn.innerHTML = `
        <span class="loading-spinner"></span>
        Processing...
      `;
    } else {
      elements.submitBtn.innerHTML = `
        <span class="btn-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
               viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          Analyze Text
        </span>
      `;
    }
  }

  function showResult() {
    if (!elements.predictionResult) return;
    elements.predictionResult.style.display = 'flex';
    elements.predictionResult.classList.add('show');
  }

  function displayResult(title, message, type, confidence = null) {
    if (elements.resultTitle) elements.resultTitle.textContent = title;
    if (elements.resultMessage) elements.resultMessage.textContent = message;
    
    if (elements.predictionResult) {
      elements.predictionResult.className = `prediction-result show ${type}`;
    }

    // Show confidence bar and percentage
    if (confidence && elements.confidenceBar && elements.confidenceFill && elements.confidenceText) {
      const percentage = Math.round(confidence * 100);
      
      // Show confidence elements
      elements.confidenceBar.style.display = 'block';
      elements.confidenceText.style.display = 'block';
      
      // Update confidence bar
      elements.confidenceFill.style.width = `${percentage}%`;
      
      // Update confidence text
      elements.confidenceText.textContent = `Confidence: ${percentage}%`;
      
      // Add animation delay
      setTimeout(() => {
        elements.confidenceFill.style.width = `${percentage}%`;
      }, 100);
    } else {
      // Hide confidence elements if no confidence provided
      if (elements.confidenceBar) elements.confidenceBar.style.display = 'none';
      if (elements.confidenceText) elements.confidenceText.style.display = 'none';
    }
  }

  // ==============================
  // UTILITY FUNCTIONS
  // ==============================
  function updateCharCount() {
    if (!elements.textInput || !elements.charCountText) return;
    const length = elements.textInput.value.length;
    elements.charCountText.textContent = STRINGS.CHARACTER_COUNT(length);
  }

  function toggleClearButton() {
    if (!elements.clearBtn || !elements.textInput) return;
    elements.clearBtn.style.display = elements.textInput.value.length > 0 ? 'inline' : 'none';
  }

  function clearInput() {
    if (!elements.textInput) return;
    elements.textInput.value = '';
    updateCharCount();
    toggleClearButton();
    elements.textInput.focus();
  }

  // ==============================
  // HISTORY FUNCTIONS
  // ==============================
  function addToHistory(text, result) {
    const historyItem = {
      id: Date.now(),
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      result: result,
      date: new Date().toLocaleDateString()
    };

    history.unshift(historyItem);
    if (history.length > CONFIG.MAX_HISTORY_ITEMS) {
      history = history.slice(0, CONFIG.MAX_HISTORY_ITEMS);
    }

    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(history));
    updateHistoryDisplay();
  }

  function updateHistoryDisplay() {
    if (!elements.historyCount || !elements.historyCard) return;
    
    elements.historyCount.textContent = history.length;
    elements.historyCard.style.display = history.length > 0 ? 'block' : 'none';

    if (elements.historyItems && history.length > 0) {
      elements.historyItems.innerHTML = history.map(item => `
        <div class="history-item">
          <div class="history-item-header">
            <div class="history-result">${item.result}</div>
            <div class="history-date">${item.date}</div>
          </div>
          <div class="history-text">${item.text}</div>
        </div>
      `).join('');
    }
  }

  function toggleHistory() {
    if (!elements.historyItems || !elements.historyToggle) return;
    
    historyExpanded = !historyExpanded;
    elements.historyItems.style.display = historyExpanded ? 'block' : 'none';
    elements.historyToggle.style.transform = historyExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
    
    if (elements.historyHeader) {
      elements.historyHeader.setAttribute('aria-expanded', historyExpanded);
    }
  }

  // ==============================
  // ACTION FUNCTIONS
  // ==============================
  async function copyResult() {
    if (!elements.resultMessage) return;
    
    try {
      await navigator.clipboard.writeText(elements.resultMessage.textContent);
      showToast(STRINGS.COPIED);
    } catch (error) {
      showToast(STRINGS.COPY_FAILED);
      console.error('Copy failed:', error);
    }
  }

  async function shareResult() {
    if (!elements.resultMessage) return;
    
    const text = elements.resultMessage.textContent;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Fact Checker Result',
          text: text
        });
        showToast(STRINGS.SHARED);
      } catch (error) {
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback: copy to clipboard
      await copyResult();
    }
  }

  function retryAnalysis() {
    if (elements.form) {
      elements.form.dispatchEvent(new Event('submit'));
    }
  }

  // ==============================
  // UI FEEDBACK
  // ==============================
  function showToast(message) {
    if (!elements.toast) return;
    
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    
    setTimeout(() => {
      elements.toast.classList.remove('show');
    }, 3000);
  }

  function launchConfetti() {
    // Simple confetti effect - you can enhance this
    console.log('🎉 Confetti!');
    showToast('🎉 Analysis completed!');
  }

  // ==============================
  // MOBILE MENU FUNCTIONS
  // ==============================
  function toggleMobileMenu() {
    if (!elements.mobileMenu) return;
    
    const isOpen = elements.mobileMenu.classList.contains('show');
    
    if (isOpen) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }

  function openMobileMenu() {
    if (!elements.mobileMenu || !elements.mobileMenuBtn) return;
    
    elements.mobileMenu.classList.add('show');
    elements.mobileMenuBtn.classList.add('active');
    
    // Animate hamburger to X
    const spans = elements.mobileMenuBtn.querySelectorAll('span');
    if (spans.length >= 3) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
    }
  }

  function closeMobileMenu() {
    if (!elements.mobileMenu || !elements.mobileMenuBtn) return;
    
    elements.mobileMenu.classList.remove('show');
    elements.mobileMenuBtn.classList.remove('active');
    
    // Animate X back to hamburger
    const spans = elements.mobileMenuBtn.querySelectorAll('span');
    if (spans.length >= 3) {
      spans[0].style.transform = 'none';
      spans[1].style.opacity = '1';
      spans[2].style.transform = 'none';
    }
  }

  // ==============================
  // HOME LOGO FUNCTION
  // ==============================
  function handleHomeLogoClick(e) {
    e.preventDefault();
    
    // Reset the form and hide results
    if (elements.textInput) {
      elements.textInput.value = '';
      updateCharCount();
      toggleClearButton();
    }
    
    // Hide prediction result
    if (elements.predictionResult) {
      elements.predictionResult.style.display = 'none';
      elements.predictionResult.classList.remove('show', 'success', 'error', 'warning');
    }
    
    // Hide confidence elements
    if (elements.confidenceBar) elements.confidenceBar.style.display = 'none';
    if (elements.confidenceText) elements.confidenceText.style.display = 'none';
    
    // Hide history if expanded
    if (elements.historyItems && elements.historyToggle) {
      elements.historyItems.style.display = 'none';
      elements.historyToggle.classList.remove('expanded');
      historyExpanded = false;
    }
    
    // Close mobile menu if open
    closeMobileMenu();
    
    // Focus on text input
    if (elements.textInput) {
      elements.textInput.focus();
    }
    
    // Smooth scroll to top
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
    
    // Show toast
    showToast('🏠 Welcome back to home!');
  }

  // ==============================
  // INITIALIZE
  // ==============================
  document.addEventListener('DOMContentLoaded', init);

})();
