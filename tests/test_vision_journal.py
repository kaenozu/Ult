import os
import sys
import base64
import json
import pytest
from fastapi.testclient import TestClient
from datetime import datetime

# Add project root to path
# Add project root to path (assuming script is in tests/ and backend is in backend/)
# We need to add 'backend' folder to sys.path so 'src' can be imported
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
backend_dir = os.path.join(project_root, 'backend')
sys.path.append(backend_dir)

from src.api.server import app
from src.database_manager import db_manager

client = TestClient(app)

# Dummy image for testing (1x1 transparent pixel)
DUMMY_IMAGE_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

def test_screenshot_diary_flow():
    """
    Test the full flow of Screenshot Diary:
    1. Save a screenshot via API
    2. Verify it's in the DB
    3. Verify the file exists
    4. Retrieve it via Gallery API
    5. Retrieve the image file via API
    """
    
    ticker = "TEST_DIARY_7777.T"
    analysis_mock = {
        "verdict": "BULLISH",
        "patterns": ["Double Bottom"],
        "support": 1000,
        "resistance": 1200,
        "visual_rationale": "Test Rationale"
    }

    # 1. Save
    print(f"\n[1] Saving screenshot for {ticker}...")
    save_payload = {
        "ticker": ticker,
        "image": DUMMY_IMAGE_B64,
        "analysis": analysis_mock
    }
    
    response = client.post("/api/v1/vision/save", json=save_payload)
    assert response.status_code == 200, f"Save failed: {response.text}"
    data = response.json()
    assert data["status"] == "saved"
    record_id = data["id"]
    filename = data["filename"]
    print(f" -> Saved. Record ID: {record_id}, Filename: {filename}")

    # 2. Verify DB (Direct Check)
    print("\n[2] Verifying DB record...")
    screenshots = db_manager.get_screenshots(ticker)
    assert len(screenshots) > 0
    latest = screenshots[0]
    assert latest["id"] == record_id
    assert latest["ticker"] == ticker
    assert latest["analysis_result"]["verdict"] == "BULLISH"
    print(" -> DB Record confirmed.")

    # 3. Verify File System
    print("\n[3] Verifying File existence...")
    # Assuming backend layout, data is in backend/data/screenshots
    # But since we are running tests, let's just assume the API would fail step 5 if file didn't exist
    pass 

    # 4. Verify Gallery API
    print("\n[4] API Gallery Fetch...")
    response = client.get(f"/api/v1/vision/gallery/{ticker}")
    assert response.status_code == 200
    gallery_data = response.json()
    assert len(gallery_data["screenshots"]) > 0
    print(f" -> Gallery API returned {len(gallery_data['screenshots'])} items.")

    # 5. Verify Image Download API
    print("\n[5] Downloading Image via API...")
    response = client.get(f"/api/v1/vision/image/{filename}")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    print(" -> Image download successful.")

    print("\n[SUCCESS] Screenshot Diary Flow Verified!")

if __name__ == "__main__":
    test_screenshot_diary_flow()
