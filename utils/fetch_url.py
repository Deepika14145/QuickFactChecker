import requests
from bs4 import BeautifulSoup

def get_text_from_url(url):
    """
    Fetches and returns text content from a given URL.
    """
    try:
        response = requests.get(url)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        paragraphs = soup.find_all('p')
        text = " ".join([p.get_text() for p in paragraphs])
        return text
    except Exception as e:
        return f"Error fetching URL: {e}"
