from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 720})

        try:
            # 1. Go to the app
            print("Navigating to app...")
            page.goto("http://localhost:3000")

            # 2. Search for AAPL
            print("Searching for AAPL...")
            search_input = page.get_by_placeholder("銘柄名、コードで検索")
            search_input.fill("AAPL")

            # 3. Wait for results and click
            print("Selecting AAPL...")
            page.wait_for_selector("text=Apple Inc.")
            page.get_by_text("Apple Inc.").click()

            # 4. Verify StockTable has AAPL
            print("Verifying StockTable...")
            watchlist_aside = page.locator("aside").nth(0)
            aapl_row = watchlist_aside.locator("tr", has_text="AAPL")
            expect(aapl_row).to_be_visible(timeout=10000)

            # 5. Verify OrderPanel has AAPL
            print("Verifying OrderPanel...")
            # Click the Order Panel tab
            page.get_by_role("button", name="注文パネル").click()

            # Now verify heading
            expect(page.get_by_role("heading", name="AAPL を取引")).to_be_visible()

            # 6. Take screenshot
            print("Taking screenshot...")
            page.screenshot(path="/home/jules/verification/verification.png")
            print("Done.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
            raise
        finally:
            browser.close()

if __name__ == "__main__":
    run()
