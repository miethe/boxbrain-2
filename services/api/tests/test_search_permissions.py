from .conftest import role_headers


def test_viewer_search_filters_restricted_content_without_leaks(client):
    response = client.post(
        "/api/search",
        json={"query": "client-sensitive operating margin bridge", "limit": 10},
        headers=role_headers("viewer", "viewer-1"),
    )

    assert response.status_code == 200
    payload = response.json()
    serialized = str(payload["items"]).lower()
    assert "client-sensitive operating margin bridge" not in serialized
    assert "/seed/restricted/" not in serialized
    assert payload["debug"] is None


def test_reviewer_search_can_see_restricted_content(client):
    response = client.post(
        "/api/search",
        json={"query": "client-sensitive operating margin bridge", "limit": 10},
        headers=role_headers("reviewer", "reviewer-1"),
    )

    assert response.status_code == 200
    titles = [item["title"] for item in response.json()["items"]]
    assert "Client-sensitive operating margin bridge" in titles
