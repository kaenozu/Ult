#!/usr/bin/env python3
"""
Chart performance optimization verification screenshot script
"""

from playwright.sync_api import sync_playwright
import time
import os

# Screenshot directory
SCREENSHOT_DIR = "screenshots"

def main():
    # Create screenshot directory
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    
    with sync_playwright() as p:
        # Launch browser (headless mode)
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            locale='ja-JP'
        )
        page = context.new_page()
        
        # Collect console logs
        console_logs = []
        errors = []
        
        def handle_console(msg):
            console_logs.append(f"[{msg.type}] {msg.text}")
            print(f"Console: [{msg.type}] {msg.text}")
        
        def handle_page_error(error):
            errors.append(str(error))
            print(f"Page Error: {error}")
        
        page.on("console", handle_console)
        page.on("pageerror", handle_page_error)
        
        print("Accessing main page...")
        page.goto('http://localhost:3000', timeout=60000)
        
        print("Waiting for network idle state...")
        page.wait_for_load_state('networkidle', timeout=30000)
        
        # Additional wait for chart rendering
        print("Waiting for chart rendering...")
        time.sleep(3)
        
        # Initial state screenshot
        screenshot_path_1 = os.path.join(SCREENSHOT_DIR, "chart-initial.png")
        page.screenshot(path=screenshot_path_1, full_page=True)
        print(f"Initial screenshot saved: {screenshot_path_1}")
        
        # Look for chart components
        chart_selectors = [
            'canvas',  # Chart.js uses canvas
            '[data-testid="chart"]',
            '.chart-container',
            '[class*="chart"]',
            '[class*="Chart"]',
        ]
        
        chart_found = False
        for selector in chart_selectors:
            try:
                elements = page.locator(selector).all()
                if elements:
                    print(f"Chart element found: {selector} ({len(elements)} elements)")
                    chart_found = True
                    break
            except Exception as e:
                continue
        
        if not chart_found:
            print("Warning: No chart element found")
        
        # Move mouse on chart (performance test)
        try:
            canvas = page.locator('canvas').first
            if canvas.count() > 0:
                box = canvas.bounding_box()
                if box:
                    print("Moving mouse on chart...")
                    # Move mouse near center of chart
                    center_x = box['x'] + box['width'] / 2
                    center_y = box['y'] + box['height'] / 2
                    
                    # Timestamp before mouse move
                    start_time = time.time()
                    
                    # Move mouse multiple times
                    for i in range(10):
                        offset = (i - 5) * 20
                        page.mouse.move(center_x + offset, center_y + offset)
                        time.sleep(0.05)
                    
                    # Timestamp after mouse move
                    end_time = time.time()
                    print(f"Mouse movement completed (duration: {end_time - start_time:.2f}s)")
                    
                    # Screenshot after mouse hover
                    time.sleep(1)  # Wait for UI update
                    screenshot_path_2 = os.path.join(SCREENSHOT_DIR, "chart-after-hover.png")
                    page.screenshot(path=screenshot_path_2, full_page=True)
                    print(f"Post-hover screenshot saved: {screenshot_path_2}")
        except Exception as e:
            print(f"Error during mouse operation: {e}")
        
        # Save page HTML structure (for debugging)
        page_content = page.content()
        with open(os.path.join(SCREENSHOT_DIR, "page-content.html"), "w", encoding="utf-8") as f:
            f.write(page_content)
        print("Page HTML content saved: screenshots/page-content.html")
        
        # Save error logs
        if errors:
            with open(os.path.join(SCREENSHOT_DIR, "errors.txt"), "w", encoding="utf-8") as f:
                f.write("\n".join(errors))
            print(f"Errors occurred: {len(errors)}")
        
        # Save console logs
        with open(os.path.join(SCREENSHOT_DIR, "console-logs.txt"), "w", encoding="utf-8") as f:
            f.write("\n".join(console_logs))
        print(f"Console logs saved: screenshots/console-logs.txt ({len(console_logs)} entries)")
        
        # Close browser
        browser.close()
        
        print("\n=== Test Complete ===")
        print(f"Screenshots saved to: {os.path.abspath(SCREENSHOT_DIR)}")
        
        # Result summary
        result = {
            "status": "success" if not errors else "has_errors",
            "errors_count": len(errors),
            "console_logs_count": len(console_logs),
            "chart_found": chart_found,
            "screenshots": [
                os.path.abspath(os.path.join(SCREENSHOT_DIR, "chart-initial.png")),
                os.path.abspath(os.path.join(SCREENSHOT_DIR, "chart-after-hover.png")),
            ]
        }
        
        print(f"\nResult: {result}")

if __name__ == '__main__':
    main()