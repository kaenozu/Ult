from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            print("Navigating to home page...")
            page.goto("http://localhost:3000/", timeout=60000) # 60s timeout

            # Wait for content to load
            page.wait_for_load_state("networkidle", timeout=60000)

            # Take screenshot of the main dashboard
            page.screenshot(path="verification_dashboard.png")
            print("Screenshot saved to verification_dashboard.png")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
