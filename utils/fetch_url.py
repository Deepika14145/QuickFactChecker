"""
Utility to fetch and extract readable text content from a URL.
"""
import requests
from bs4 import BeautifulSoup


def get_text_from_url(url: str, timeout: int = 10) -> str:
    """
    Fetch a URL and return the concatenated paragraph text.

    Args:
        url: The URL to fetch.
        timeout: Request timeout in seconds (default 10).

    Returns:
        Extracted text string, or an error message prefixed with 'Error:'.
    """
    try:
        headers = {
            'User-Agent': (
                'Mozilla/5.0 (compatible; QuickFactChecker/1.0; '
                '+https://github.com/Deepika14145/QuickFactChecker)'
            )
        }
        response = requests.get(url, headers=headers, timeout=timeout)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # Remove script/style noise
        for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
            tag.decompose()

        paragraphs = soup.find_all('p')
        text = ' '.join(p.get_text(strip=True) for p in paragraphs if p.get_text(strip=True))
        return text if text else soup.get_text(separator=' ', strip=True)
    except requests.exceptions.Timeout:
        return 'Error: Request timed out while fetching the URL.'
    except requests.exceptions.ConnectionError:
        return 'Error: Could not connect to the URL.'
    except requests.exceptions.HTTPError as e:
        return f'Error: HTTP {e.response.status_code} when fetching URL.'
    except Exception as e:
        return f'Error fetching URL: {e}'
