from playwright.sync_api import sync_playwright
import os

def run_cuj(page):
    # Print console messages
    page.on("console", lambda msg: print(f"CONSOLE: {msg.type}: {msg.text}"))
    page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

    # Navigate to the static file
    page.goto("file:///app/index.html")
    page.wait_for_timeout(5000) # Wait for default image to load and process

    # Take screenshot of the mapped image and zoom controls
    print("Taking screenshot...")
    page.screenshot(path="/home/jules/verification/screenshots/verification.png")
    print("Screenshot saved!")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
