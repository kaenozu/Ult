from playwright.sync_api import sync_playwright
import time

def verify_order_panel():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        print("Navigating to home page...")
        page.goto("http://localhost:3000")

        # Wait for search input
        try:
            print("Looking for search input...")
            page.wait_for_selector("#stockSearch", timeout=10000)
            page.fill("#stockSearch", "AAPL")
            page.press("#stockSearch", "Enter")

            print("Searching for AAPL...")
            page.wait_for_selector("text=Apple Inc.", timeout=15000)

            print("AAPL loaded. Switching to Order tab...")
            # Use get_by_role with exact name to avoid "注文一覧"
            # Note: "注文" is the label.
            order_tab = page.get_by_role("button", name="注文", exact=True)
            order_tab.click()

            # Wait for Order Panel content
            print("Waiting for Order Panel...")
            page.wait_for_selector("text=リスク管理設定", timeout=10000)
            print("Order Panel found.")

            # Click to expand
            print("Expanding Risk Settings...")
            page.click("text=リスク管理設定")

            # Wait for animation
            time.sleep(1)

            # Take screenshot
            print("Taking screenshot...")
            page.screenshot(path="verification/order_panel.png")
            print("Screenshot saved to verification/order_panel.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_3.png")

        browser.close()

if __name__ == "__main__":
    verify_order_panel()
