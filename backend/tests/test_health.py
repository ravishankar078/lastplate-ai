"""
Tests for Health, Readiness, CORS, OpenAPI, and Exception Handling.
"""

import pytest
from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    """Test that the root endpoint returns service metadata and timing headers."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "LastPlate Backend"
    assert "version" in data
    assert data["documentation"] == "/docs"
    assert "X-Process-Time" in response.headers


def test_health_probe(client: TestClient):
    """Test the liveness health probe endpoint."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["message"] == "LastPlate API is operational."
    assert payload["data"]["status"] == "healthy"
    assert payload["data"]["app"] == "LastPlate Backend"
    assert "timestamp" in payload["data"]


def test_readiness_probe(client: TestClient):
    """Test the readiness probe endpoint."""
    response = client.get("/api/v1/ready")
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["ready"] is True
    assert payload["data"]["services"]["api"] == "ready"


def test_ping_endpoint(client: TestClient):
    """Test lightweight ping endpoint."""
    response = client.get("/api/v1/ping")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ping"] == "pong"
    assert "timestamp" in payload


def test_cors_preflight_headers(client: TestClient):
    """Test CORS preflight headers for allowed frontend origins."""
    headers = {
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization,content-type",
    }
    response = client.options("/api/v1/health", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"
    assert "GET" in response.headers.get("access-control-allow-methods", "")


def test_openapi_docs_accessible(client: TestClient):
    """Test OpenAPI JSON specification and Swagger UI accessibility."""
    spec_response = client.get("/api/v1/openapi.json")
    assert spec_response.status_code == 200
    spec = spec_response.json()
    assert spec["info"]["title"] == "LastPlate Backend"
    assert "/api/v1/health" in spec["paths"]

    docs_response = client.get("/docs")
    assert docs_response.status_code == 200
    assert "swagger-ui" in docs_response.text.lower()


def test_not_found_handling(client: TestClient):
    """Test 404 response follows standardized ErrorEnvelope."""
    response = client.get("/api/v1/non_existent_route")
    assert response.status_code == 404
    payload = response.json()
    assert payload["success"] is False
    assert payload["error_code"] == "HTTP_404"
    assert "Not Found" in payload["message"]


def test_validation_error_envelope(client: TestClient):
    """Test 422 validation failure returns standardized ErrorEnvelope with field details."""
    from pydantic import BaseModel, Field
    from app.main import app

    class DummyModel(BaseModel):
        quantity: int = Field(..., gt=0)

    @app.post("/api/v1/test-validation-route", include_in_schema=False)
    async def sample_route(data: DummyModel):
        return {"received": data.quantity}

    # Pass invalid payload (negative quantity and missing required field)
    response = client.post("/api/v1/test-validation-route", json={"quantity": -5})
    assert response.status_code == 422
    payload = response.json()
    assert payload["success"] is False
    assert payload["error_code"] == "VALIDATION_ERROR"
    assert "validation failed" in payload["message"].lower()
    assert len(payload["details"]) >= 1
    assert payload["details"][0]["field"] == "body -> quantity"

