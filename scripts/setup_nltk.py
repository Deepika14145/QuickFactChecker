import nltk
import ssl
import logging
from logging.handlers import RotatingFileHandler

def setup_nltk_resources(log_to_file=True, log_filename="nltk_setup.log"):
    """
    Downloads required NLTK resources, handling potential SSL and download errors.
    Optionally logs output to a rotating file for troubleshooting.
    """

    # Configure logging
    logger = logging.getLogger("NLTKSetup")
    logger.setLevel(logging.INFO)

    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # File handler with rotation (max 1MB per file, keep 3 backups)
    if log_to_file:
        file_handler = RotatingFileHandler(log_filename, maxBytes=1_000_000, backupCount=3)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    # SSL workaround for restricted environments
    try:
        _create_unverified_https_context = ssl._create_unverified_context
        ssl._create_default_https_context = _create_unverified_https_context
    except AttributeError:
        pass

    resource_paths = {
        "punkt": "tokenizers/punkt",
        "stopwords": "corpora/stopwords",
        "wordnet": "corpora/wordnet",
        "omw-1.4": "corpora/omw-1.4",
    }

    logger.info("🚀 Starting NLTK resource setup...\n")

    for package, path in resource_paths.items():
        logger.info(f"Processing: {package}")

        try:
            nltk.data.find(path)
            logger.info(f"  ✅ {package} is already installed.")
        except LookupError:
            try:
                logger.info(f"  ⬇️ Downloading {package}...")
                nltk.download(package, quiet=False)
                logger.info(f"  ✅ Successfully downloaded: {package}")
            except Exception as e:
                logger.error(f"--- 🛑 ERROR downloading {package} ---")
                logger.error("  -> Check your network connection or run with administrator permissions.")
                logger.error(f"  -> Details: {type(e).__name__}: {e}")
        except Exception as e:
            logger.warning(f"⚠️ Unexpected error while checking {package}: {type(e).__name__}: {e}")

        logger.info("")

    logger.info("🎉 NLTK resource setup complete.")
    logger.info("If you still encounter 'LookupError', ensure NLTK is installed correctly and your Python environment is active.")

if __name__ == "__main__":
    setup_nltk_resources()
