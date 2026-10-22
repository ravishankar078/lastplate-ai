"""
Pytest Fixtures for LastPlate Backend Tests.
Provides a reusable TestClient configured for the FastAPI app in testing mode.
"""

import os
os.environ["ENVIRONMENT"] = "testing"

from typing import Generator
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="session")
def client() -> Generator[TestClient, None, None]:
    """Synchronous test client for API endpoint testing."""
    with TestClient(app) as test_client:
        yield test_client
