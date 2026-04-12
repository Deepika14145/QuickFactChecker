"""
Tests for the QuickFactChecker Flask application.
"""
import os
import sys
import pytest

# Ensure the project root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app  # noqa: E402


@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_index_page(client):
    """Home page should return 200."""
    response = client.get('/')
    assert response.status_code == 200


def test_predict_valid_text(client):
    """Valid text input should return 200 with a 'message' key."""
    response = client.post('/predict', json={'text': 'hello world'})
    assert response.status_code == 200
    data = response.get_json()
    assert 'message' in data


def test_predict_missing_text(client):
    """Missing text should return 400 with an 'error' key."""
    response = client.post('/predict', json={})
    assert response.status_code == 400
    data = response.get_json()
    assert 'error' in data


def test_predict_all_get(client):
    """GET /predict_all should return a helpful message."""
    response = client.get('/predict_all')
    assert response.status_code == 200
    data = response.get_json()
    assert data.get('ok') is True


def test_predict_all_post_valid(client):
    """POST /predict_all with text should return results."""
    response = client.post('/predict_all', json={'text': 'Scientists confirm new vaccine is effective.'})
    assert response.status_code == 200
    data = response.get_json()
    assert 'results' in data
    assert 'best' in data


def test_api_me_unauthenticated(client):
    """/api/me should return authenticated=False when not logged in."""
    response = client.get('/api/me')
    assert response.status_code == 200
    data = response.get_json()
    assert data['authenticated'] is False


def test_404_page(client):
    """Unknown routes should return 404."""
    response = client.get('/this-route-does-not-exist')
    assert response.status_code == 404
