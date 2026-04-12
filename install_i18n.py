#!/usr/bin/env python3
"""
Installation script for QuickFactChecker Multi-Language Support
This script helps set up the internationalization features.
"""

import os
import sys
import shutil
import json
from pathlib import Path

def print_status(message, status="INFO"):
    """Print status message with formatting"""
    status_colors = {
        "INFO": "\033[94m",
        "SUCCESS": "\033[92m", 
        "WARNING": "\033[93m",
        "ERROR": "\033[91m"
    }
    reset_color = "\033[0m"
    
    color = status_colors.get(status, "\033[94m")
    print(f"{color}[{status}]{reset_color} {message}")

def check_files():
    """Check if all required i18n files are present"""
    required_files = [
        "Public/locales/en.json",
        "Public/locales/es.json", 
        "Public/locales/fr.json",
        "Public/locales/de.json",
        "Public/locales/ar.json",
        "Public/locales/hi.json",
        "Public/locales/zh.json",
        "Public/locales/ja.json",
        "Public/locales/pt.json",
        "Public/js/i18n.js",
        "Public/css/i18n.css",
        "Public/index_i18n.html"
    ]
    
    missing_files = []
    for file_path in required_files:
        if not os.path.exists(file_path):
            missing_files.append(file_path)
    
    return missing_files

def backup_original_files():
    """Backup original files before modification"""
    backup_files = [
        ("Public/index.html", "Public/index_original.html"),
        ("app.py", "app_original.py")
    ]
    
    for original, backup in backup_files:
        if os.path.exists(original) and not os.path.exists(backup):
            try:
                shutil.copy2(original, backup)
                print_status(f"Backed up {original} to {backup}", "SUCCESS")
            except Exception as e:
                print_status(f"Failed to backup {original}: {e}", "ERROR")
                return False
    return True

def update_html_file():
    """Replace original HTML with i18n version"""
    if os.path.exists("Public/index_i18n.html"):
        try:
            shutil.copy2("Public/index_i18n.html", "Public/index.html")
            print_status("Updated index.html with i18n version", "SUCCESS")
            return True
        except Exception as e:
            print_status(f"Failed to update HTML file: {e}", "ERROR")
            return False
    else:
        print_status("index_i18n.html not found", "ERROR")
        return False

def verify_flask_app():
    """Check if Flask app has been updated for i18n"""
    try:
        with open("app.py", "r", encoding="utf-8") as f:
            content = f.read()
            
        if "/api/translations" in content and "SUPPORTED_LANGUAGES" in content:
            print_status("Flask app appears to have i18n support", "SUCCESS")
            return True
        else:
            print_status("Flask app may need manual i18n updates", "WARNING")
            return False
    except Exception as e:
        print_status(f"Could not verify Flask app: {e}", "ERROR")
        return False

def create_directories():
    """Create necessary directories"""
    directories = [
        "Public/locales",
        "Public/js", 
        "Public/css"
    ]
    
    for directory in directories:
        try:
            Path(directory).mkdir(parents=True, exist_ok=True)
            print_status(f"Created directory: {directory}", "SUCCESS")
        except Exception as e:
            print_status(f"Failed to create directory {directory}: {e}", "ERROR")
            return False
    return True

def test_translation_loading():
    """Test if translation files can be loaded"""
    test_languages = ["en", "es", "fr"]
    
    for lang in test_languages:
        file_path = f"Public/locales/{lang}.json"
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                
            # Check for required keys
            required_keys = ["meta", "header", "form", "results"]
            missing_keys = [key for key in required_keys if key not in data]
            
            if missing_keys:
                print_status(f"Translation file {lang}.json missing keys: {missing_keys}", "WARNING")
            else:
                print_status(f"Translation file {lang}.json is valid", "SUCCESS")
                
        except json.JSONDecodeError as e:
            print_status(f"Invalid JSON in {lang}.json: {e}", "ERROR")
        except FileNotFoundError:
            print_status(f"Translation file {lang}.json not found", "ERROR")
        except Exception as e:
            print_status(f"Error testing {lang}.json: {e}", "ERROR")

def main():
    """Main installation function"""
    print_status("QuickFactChecker Multi-Language Support Installation", "INFO")
    print("=" * 60)
    
    # Step 1: Check if we're in the right directory
    if not os.path.exists("Public") or not os.path.exists("app.py"):
        print_status("Please run this script from the QuickFactChecker project root directory", "ERROR")
        sys.exit(1)
    
    # Step 2: Create directories
    print_status("Creating directories...", "INFO")
    if not create_directories():
        print_status("Failed to create required directories", "ERROR")
        sys.exit(1)
    
    # Step 3: Check for missing files
    print_status("Checking for required files...", "INFO")
    missing_files = check_files()
    if missing_files:
        print_status("Missing files detected:", "WARNING")
        for file in missing_files:
            print(f"  - {file}")
        print_status("Please ensure all i18n files are in place before running", "WARNING")
    
    # Step 4: Backup original files
    print_status("Backing up original files...", "INFO")
    if not backup_original_files():
        print_status("Backup failed - proceeding with caution", "WARNING")
    
    # Step 5: Update HTML file
    print_status("Updating HTML file...", "INFO")
    if not update_html_file():
        print_status("HTML update failed", "ERROR")
        sys.exit(1)
    
    # Step 6: Verify Flask app
    print_status("Verifying Flask app configuration...", "INFO")
    verify_flask_app()
    
    # Step 7: Test translation files
    print_status("Testing translation files...", "INFO")
    test_translation_loading()
    
    print("=" * 60)
    print_status("Installation completed!", "SUCCESS")
    print("\nNext steps:")
    print("1. Start the Flask server: python app.py")
    print("2. Open your browser and visit http://localhost:5000")
    print("3. Test language switching using the dropdown in the header")
    print("4. Check browser console for any JavaScript errors")
    print("\nFor more information, see MULTILINGUAL_SUPPORT.md")

if __name__ == "__main__":
    main()