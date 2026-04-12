import pytest
from app import app

@pytest.fixture
def client():
    with app.test_client() as client:
        yield client

def test_index_page(client):
    response = client.get("/")
    assert response.status_code == 200

def test_predict_valid_text(client):
    response = client.post("/predict", json={"text": "hello world"})
    assert response.status_code == 200
    data = response.get_json()
    assert "message" in data

def test_predict_missing_text(client):
    response = client.post("/predict", json={})
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data
