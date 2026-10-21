"""
Pytest Fixtures for LastPlate Backend Tests.
Provides a reusable TestClient instance configured for the FastAPI app.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="session")
def client() -> TestClient:
    """Synchronous test client for API endpoint testing."""
    with TestClient(app) as test_client:
        yield test_client
