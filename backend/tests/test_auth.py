"""
Tests for registration and login (routes/auth.py).

HOW TO READ THESE: each test sends a fake request to a route, the same
way your React frontend would, and checks the response is what it
should be. Run with: pytest tests/test_auth.py -v
"""


def test_register_creates_a_user(client):
    response = client.post("/api/auth/register", json={
        "name": "Test Student",
        "email": "student@test.com",
        "password": "password123",
        "role": "student",
    })
    assert response.status_code == 201
    body = response.get_json()
    assert "token" in body
    assert body["user"]["email"] == "student@test.com"
    assert body["user"]["role"] == "student"
    # Password should never come back in the response
    assert "password" not in body["user"]
    assert "password_hash" not in body["user"]


def test_register_rejects_missing_fields(client):
    response = client.post("/api/auth/register", json={"name": "No Email"})
    assert response.status_code == 400


def test_register_rejects_short_password(client):
    response = client.post("/api/auth/register", json={
        "name": "Test",
        "email": "short@test.com",
        "password": "123",
    })
    assert response.status_code == 400


def test_register_rejects_duplicate_email(client):
    payload = {"name": "First", "email": "dup@test.com", "password": "password123"}
    client.post("/api/auth/register", json=payload)
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 409


def test_register_rejects_invalid_role(client):
    response = client.post("/api/auth/register", json={
        "name": "Test", "email": "role@test.com", "password": "password123",
        "role": "admin",
    })
    assert response.status_code == 400


def test_login_with_correct_credentials(client):
    client.post("/api/auth/register", json={
        "name": "Login Test", "email": "login@test.com", "password": "password123",
    })
    response = client.post("/api/auth/login", json={
        "email": "login@test.com", "password": "password123",
    })
    assert response.status_code == 200
    assert "token" in response.get_json()


def test_login_with_wrong_password_is_rejected(client):
    client.post("/api/auth/register", json={
        "name": "Login Test", "email": "wrongpw@test.com", "password": "password123",
    })
    response = client.post("/api/auth/login", json={
        "email": "wrongpw@test.com", "password": "wrongpassword",
    })
    assert response.status_code == 401


def test_login_with_unknown_email_is_rejected(client):
    response = client.post("/api/auth/login", json={
        "email": "doesnotexist@test.com", "password": "whatever123",
    })
    assert response.status_code == 401


def test_me_requires_a_valid_token(client):
    # No Authorization header at all → should be rejected
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_me_returns_current_user_with_valid_token(client):
    register_response = client.post("/api/auth/register", json={
        "name": "Me Test", "email": "me@test.com", "password": "password123",
    })
    token = register_response.get_json()["token"]
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.get_json()["email"] == "me@test.com"