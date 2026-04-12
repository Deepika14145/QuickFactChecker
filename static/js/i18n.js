/**
 * Internationalization (i18n) Manager for QuickFactChecker
 * Handles multi-language support with dynamic language switching
 */

class I18nManager {
    constructor() {
        this.currentLanguage = 'en';
        this.fallbackLanguage = 'en';
        this.translations = {};
        this.supportedLanguages = [
            'en', 'es', 'fr', 'de', 'ar', 'hi', 'zh', 'ja', 'pt'
        ];
        
        // Initialize with browser language or stored preference
        this.init();
    }

    /**
     * Initialize the i18n manager
     */
    async init() {
        // Get saved language preference or detect browser language
        const savedLang = localStorage.getItem('factchecker_language');
        const browserLang = navigator.language.split('-')[0];
        
        let targetLang = savedLang || browserLang || 'en';
        
        // Ensure the language is supported
        if (!this.supportedLanguages.includes(targetLang)) {
            targetLang = this.fallbackLanguage;
        }
        
        await this.loadLanguage(targetLang);
        this.createLanguageSelector();
    }

    /**
     * Load translation files for a specific language
     */
    async loadLanguage(languageCode) {
        try {
            // Load fallback language first if not already loaded
            if (languageCode !== this.fallbackLanguage && !this.translations[this.fallbackLanguage]) {
                const fallbackResponse = await fetch(`/api/translations/${this.fallbackLanguage}`);
                if (fallbackResponse.ok) {
                    this.translations[this.fallbackLanguage] = await fallbackResponse.json();
                }
            }

            // Load target language
            const response = await fetch(`/api/translations/${languageCode}`);
            if (!response.ok) {
                throw new Error(`Failed to load language: ${languageCode}`);
            }
            
            this.translations[languageCode] = await response.json();
            this.currentLanguage = languageCode;
            
            // Save preference
            localStorage.setItem('factchecker_language', languageCode);
            
            // Update page
            this.updatePage();
            this.updateLanguageSelector();
            
            // Dispatch language change event
            window.dispatchEvent(new CustomEvent('languageChanged', { 
                detail: { language: languageCode } 
            }));
            
        } catch (error) {
            console.error('Failed to load language:', error);
            // Fallback to English if current language fails
            if (languageCode !== this.fallbackLanguage) {
                await this.loadLanguage(this.fallbackLanguage);
            }
        }
    }

    /**
     * Get translated text for a key
     */
    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations[this.currentLanguage];
        let fallbackValue = this.translations[this.fallbackLanguage];
        
        // Navigate through nested keys
        for (const k of keys) {
            value = value?.[k];
            fallbackValue = fallbackValue?.[k];
        }
        
        // Use fallback if translation not found
        if (value === undefined) {
            value = fallbackValue;
        }
        
        // Return key if no translation found
        if (value === undefined) {
            console.warn(`Translation missing for key: ${key}`);
            return key;
        }
        
        // Replace parameters in the translation
        if (typeof value === 'string' && Object.keys(params).length > 0) {
            return value.replace(/{(\w+)}/g, (match, param) => {
                return params[param] !== undefined ? params[param] : match;
            });
        }
        
        return value;
    }

    /**
     * Update all translatable elements on the page
     */
    updatePage() {
        // Update meta tags
        this.updateMeta();
        
        // Update elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                if (element.type === 'submit' || element.type === 'button') {
                    element.value = translation;
                } else {
                    element.placeholder = translation;
                }
            } else {
                element.textContent = translation;
            }
        });

        // Update elements with data-i18n-html attribute (for HTML content)
        const htmlElements = document.querySelectorAll('[data-i18n-html]');
        htmlElements.forEach(element => {
            const key = element.getAttribute('data-i18n-html');
            element.innerHTML = this.t(key);
        });

        // Update document direction for RTL languages
        document.dir = this.isRTL(this.currentLanguage) ? 'rtl' : 'ltr';
        document.documentElement.lang = this.currentLanguage;
        
        // Update body class for language-specific styling
        document.body.className = document.body.className.replace(/lang-\w+/g, '');
        document.body.classList.add(`lang-${this.currentLanguage}`);
    }

    /**
     * Update meta tags
     */
    updateMeta() {
        // Update title
        const title = document.querySelector('title');
        if (title) {
            title.textContent = this.t('meta.title');
        }

        // Update meta description
        const description = document.querySelector('meta[name="description"]');
        if (description) {
            description.setAttribute('content', this.t('meta.description'));
        }

        // Update Open Graph tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) {
            ogTitle.setAttribute('content', this.t('meta.og_title'));
        }

        const ogDescription = document.querySelector('meta[property="og:description"]');
        if (ogDescription) {
            ogDescription.setAttribute('content', this.t('meta.og_description'));
        }
    }

    /**
     * Check if language is RTL
     */
    isRTL(languageCode) {
        const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
        return rtlLanguages.includes(languageCode);
    }

    /**
     * Create language selector dropdown
     */
    createLanguageSelector() {
        const header = document.querySelector('header') || document.querySelector('.navbar');
        if (!header) return;

        // Remove existing selector
        const existingSelector = document.getElementById('language-selector');
        if (existingSelector) {
            existingSelector.remove();
        }

        // Create language selector
        const languageSelector = document.createElement('div');
        languageSelector.id = 'language-selector';
        languageSelector.className = 'language-selector';
        
        const select = document.createElement('select');
        select.className = 'language-select';
        select.setAttribute('aria-label', 'Select Language');
        
        // Add language options
        this.supportedLanguages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang;
            option.textContent = this.getLanguageDisplayName(lang);
            if (lang === this.currentLanguage) {
                option.selected = true;
            }
            select.appendChild(option);
        });
        
        // Add change event listener
        select.addEventListener('change', async (e) => {
            await this.loadLanguage(e.target.value);
        });
        
        languageSelector.appendChild(select);
        
        // Insert language selector into header
        const themeToggle = header.querySelector('.theme-toggle');
        if (themeToggle) {
            header.insertBefore(languageSelector, themeToggle);
        } else {
            header.appendChild(languageSelector);
        }
    }

    /**
     * Update language selector to reflect current language
     */
    updateLanguageSelector() {
        const select = document.querySelector('.language-select');
        if (select) {
            select.value = this.currentLanguage;
        }
    }

    /**
     * Get display name for language code
     */
    getLanguageDisplayName(languageCode) {
        const displayNames = {
            'en': 'English',
            'es': 'Español',
            'fr': 'Français',
            'de': 'Deutsch',
            'pt': 'Português',
            'ar': 'العربية',
            'hi': 'हिन्दी',
            'zh': '中文',
            'ja': '日本語'
        };
        return displayNames[languageCode] || languageCode.toUpperCase();
    }

    /**
     * Get current language
     */
    getCurrentLanguage() {
        return this.currentLanguage;
    }

    /**
     * Get available languages
     */
    getSupportedLanguages() {
        return this.supportedLanguages;
    }

    /**
     * Format number according to current locale
     */
    formatNumber(number) {
        try {
            return new Intl.NumberFormat(this.currentLanguage).format(number);
        } catch (error) {
            return number.toString();
        }
    }

    /**
     * Format date according to current locale
     */
    formatDate(date, options = {}) {
        try {
            return new Intl.DateTimeFormat(this.currentLanguage, options).format(date);
        } catch (error) {
            return date.toString();
        }
    }
}

// Global i18n instance
const i18n = new I18nManager();

// Make it available globally
window.i18n = i18n;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18nManager;
}