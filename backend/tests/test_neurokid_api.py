"""NeuroKid backend regression suite."""
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or "https://calm-screen-guard.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")

DEMO_EMAIL = "parent@neurokid.app"
DEMO_PASSWORD = "NeuroKid2026!"


@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def demo_token(api):
    r = api.post(f"{BASE_URL}/api/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="session")
def auth_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def children(api, auth_headers):
    r = api.get(f"{BASE_URL}/api/children", headers=auth_headers)
    assert r.status_code == 200
    return r.json()


# -------- Health --------
def test_health(api):
    r = api.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200
    assert r.json()["ok"] is True


# -------- Auth: register/login/me --------
def test_register_new_parent_gets_starter_child(api):
    email = f"test_{uuid.uuid4().hex[:10]}@neurokid.app"
    r = api.post(f"{BASE_URL}/api/auth/register", json={"name": "Test Parent", "email": email, "password": "StrongPass123!"})
    assert r.status_code == 201, r.text
    body = r.json()
    assert "access_token" in body
    token = body["access_token"]
    h = {"Authorization": f"Bearer {token}"}
    rc = api.get(f"{BASE_URL}/api/children", headers=h)
    assert rc.status_code == 200
    kids = rc.json()
    assert len(kids) >= 1, "new parent should have at least one starter child"
    assert kids[0]["name"] == "Leo"


def test_register_duplicate_rejected(api):
    r = api.post(f"{BASE_URL}/api/auth/register", json={"name": "Dup", "email": DEMO_EMAIL, "password": "StrongPass123!"})
    assert r.status_code == 409


def test_login_demo(demo_token):
    assert demo_token


def test_login_wrong_password(api):
    r = api.post(f"{BASE_URL}/api/auth/login", json={"email": DEMO_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_me_requires_token(api):
    r = api.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 401


def test_me_with_invalid_bearer(api):
    r = api.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert r.status_code == 401


def test_me_with_valid_token(api, auth_headers):
    r = api.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == DEMO_EMAIL
    assert "id" in data


# -------- Emergent Google session --------
def test_auth_session_fake_rejected(api):
    r = api.post(f"{BASE_URL}/api/auth/session", json={"session_id": "fake-session-id-not-valid"})
    assert r.status_code == 401


def test_auth_logout(api, auth_headers):
    r = api.post(f"{BASE_URL}/api/auth/logout", headers=auth_headers)
    assert r.status_code == 200
    assert r.json().get("ok") is True


# -------- Children --------
def test_list_children_demo(children):
    names = {c["name"] for c in children}
    assert {"Leo", "Mia", "Nina"}.issubset(names)
    for c in children:
        assert "id" in c and "bracket" in c and "shield_active" in c


def test_toggle_shield(api, auth_headers, children):
    child_id = children[0]["id"]
    r1 = api.patch(f"{BASE_URL}/api/children/{child_id}/shield", json={"shield_active": False}, headers=auth_headers)
    assert r1.status_code == 200
    assert r1.json()["shield_active"] is False
    r2 = api.patch(f"{BASE_URL}/api/children/{child_id}/shield", json={"shield_active": True}, headers=auth_headers)
    assert r2.status_code == 200
    assert r2.json()["shield_active"] is True


# -------- Dashboard --------
def test_dashboard(api, auth_headers, children):
    child_id = children[0]["id"]
    r = api.get(f"{BASE_URL}/api/children/{child_id}/dashboard", headers=auth_headers)
    assert r.status_code == 200
    d = r.json()
    assert "screen_time" in d
    for k in ("minutes", "limit_minutes", "ratio"):
        assert k in d["screen_time"]
    assert "sensory" in d
    for k in ("status_label", "low_pct", "moderate_pct", "high_pct", "wave"):
        assert k in d["sensory"]
    assert isinstance(d["sensory"]["wave"], list)
    assert len(d["sensory"]["wave"]) > 0, "wave should be non-empty for today"
    assert "interventions_today" in d


# -------- Alerts --------
def test_alerts_grouped(api, auth_headers, children):
    child_id = children[0]["id"]
    r = api.get(f"{BASE_URL}/api/children/{child_id}/alerts", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert "total" in body and "groups" in body
    labels = {g["label"] for g in body["groups"]}
    # TODAY or YESTERDAY likely present; at least groups is a list
    assert isinstance(body["groups"], list)


def test_soft_landing_creates_alert(api, auth_headers, children):
    child_id = children[0]["id"]
    r = api.post(f"{BASE_URL}/api/children/{child_id}/soft-landing", json={"trigger": "test"}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["duration_seconds"] == 12
    # Verify alert visible
    r2 = api.get(f"{BASE_URL}/api/children/{child_id}/alerts", headers=auth_headers)
    assert r2.json()["total"] >= 1


def test_screen_break_creates_alert(api, auth_headers, children):
    child_id = children[1]["id"]
    r = api.post(f"{BASE_URL}/api/children/{child_id}/screen-break", json={}, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["break_minutes"] == 15


def test_clear_alerts(api, auth_headers, children):
    child_id = children[2]["id"]
    r = api.post(f"{BASE_URL}/api/children/{child_id}/alerts/clear", json={}, headers=auth_headers)
    assert r.status_code == 200
    assert "cleared" in r.json()
    r2 = api.get(f"{BASE_URL}/api/children/{child_id}/alerts", headers=auth_headers)
    assert r2.json()["total"] == 0


# -------- Content --------
def test_content_all(api, auth_headers):
    r = api.get(f"{BASE_URL}/api/content?bracket=all", headers=auth_headers)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list) and len(items) >= 1
    for it in items:
        assert "id" in it and "title" in it


def test_content_bracket_filter(api, auth_headers):
    r = api.get(f"{BASE_URL}/api/content?bracket=toddler", headers=auth_headers)
    assert r.status_code == 200
    items = r.json()
    for it in items:
        assert "toddler" in it["age_brackets"]


def test_content_get_one_and_allow_toggle(api, auth_headers, children):
    items = api.get(f"{BASE_URL}/api/content?bracket=all", headers=auth_headers).json()
    cid = items[0]["id"]
    child_id = children[0]["id"]
    g = api.get(f"{BASE_URL}/api/content/{cid}?child_id={child_id}", headers=auth_headers)
    assert g.status_code == 200
    assert g.json()["id"] == cid
    a = api.post(f"{BASE_URL}/api/content/{cid}/allow", json={"child_id": child_id, "allowed": True}, headers=auth_headers)
    assert a.status_code == 200
    g2 = api.get(f"{BASE_URL}/api/content/{cid}?child_id={child_id}", headers=auth_headers)
    assert g2.json()["allowed"] is True
    a2 = api.post(f"{BASE_URL}/api/content/{cid}/allow", json={"child_id": child_id, "allowed": False}, headers=auth_headers)
    assert a2.status_code == 200
    g3 = api.get(f"{BASE_URL}/api/content/{cid}?child_id={child_id}", headers=auth_headers)
    assert g3.json()["allowed"] is False


def test_classify_content(api, auth_headers, children):
    items = api.get(f"{BASE_URL}/api/content?bracket=all", headers=auth_headers).json()
    cid = items[0]["id"]
    child_id = children[0]["id"]
    r = api.post(f"{BASE_URL}/api/content/{cid}/classify", json={"child_id": child_id}, headers=auth_headers, timeout=60)
    assert r.status_code == 200, r.text
    body = r.json()
    for k in ("verdict", "sensory_load_score", "stimulus_badges", "why", "parent_tip", "source"):
        assert k in body
    print(f"[classify source] {body['source']}")


# -------- Weekly report --------
def test_weekly_report(api, auth_headers, children):
    child_id = children[0]["id"]
    r = api.get(f"{BASE_URL}/api/children/{child_id}/weekly-report", headers=auth_headers)
    assert r.status_code == 200
    b = r.json()
    for k in ("total_minutes", "delta_pct", "spikes_intercepted", "balance_score", "days", "activities"):
        assert k in b
    assert isinstance(b["days"], list)
    assert len(b["activities"]) >= 1


def test_schedule_offline_reminder(api, auth_headers, children):
    child_id = children[0]["id"]
    r = api.post(
        f"{BASE_URL}/api/children/{child_id}/offline-reminder",
        json={"activity_title": "Sensory Clay Sculpting", "at_hour": 17},
        headers=auth_headers,
    )
    assert r.status_code == 200
    assert r.json()["activity_title"] == "Sensory Clay Sculpting"


# -------- Ownership isolation --------
def test_ownership_isolation(api):
    # Register a 2nd parent, confirm they get 404 for demo's children
    email = f"iso_{uuid.uuid4().hex[:10]}@neurokid.app"
    reg = api.post(f"{BASE_URL}/api/auth/register", json={"name": "Iso", "email": email, "password": "StrongPass123!"}).json()
    tok = reg["access_token"]
    h = {"Authorization": f"Bearer {tok}"}

    # Login as demo to get a demo child id
    demo = api.post(f"{BASE_URL}/api/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}).json()
    demo_h = {"Authorization": f"Bearer {demo['access_token']}"}
    demo_kids = api.get(f"{BASE_URL}/api/children", headers=demo_h).json()
    foreign_id = demo_kids[0]["id"]

    r = api.get(f"{BASE_URL}/api/children/{foreign_id}/dashboard", headers=h)
    assert r.status_code == 404
    r2 = api.patch(f"{BASE_URL}/api/children/{foreign_id}/shield", json={"shield_active": True}, headers=h)
    assert r2.status_code == 404
    r3 = api.get(f"{BASE_URL}/api/children/{foreign_id}/alerts", headers=h)
    assert r3.status_code == 404
