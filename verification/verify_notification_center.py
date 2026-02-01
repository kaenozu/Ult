import re
from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use a large viewport to ensure everything is visible
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        try:
            print("Navigating to home page...")
            page.goto("http://localhost:3000")

            # Wait for the bell icon to be visible
            print("Waiting for bell icon...")
            bell = page.get_by_label("通知センター")
            expect(bell).to_be_visible(timeout=10000)

            print("Clicking notification bell...")
            bell.click()

            # Wait for dropdown
            dropdown = page.locator("#notification-dropdown")
            expect(dropdown).to_be_visible()

            print("Opening settings...")
            # Click settings button INSIDE the dropdown
            settings_btn = dropdown.get_by_title("設定")
            settings_btn.click()

            # Verify toggle buttons exist and have correct role
            print("Verifying toggle buttons...")
            main_toggle = page.get_by_role("switch", name="通知機能")
            expect(main_toggle).to_be_visible()

            # Take screenshot of the settings panel
            print("Taking screenshot...")
            page.screenshot(path="verification/notification_settings.png")
            print("Screenshot saved to verification/notification_settings.png")

        except Exception as e:
            print(f"Error: {e}")
            # Take error screenshot
            page.screenshot(path="verification/error.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    run()
