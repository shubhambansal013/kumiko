from playwright.sync_api import sync_playwright
import subprocess
import time
import os

def run_cuj(page):
    page.on("console", lambda msg: print(f"CONSOLE: {msg.type}: {msg.text}"))
    page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

    page.goto("http://localhost:5173/")
    page.wait_for_timeout(5000)

    print("Taking screenshot...")
    page.screenshot(path="verification/screenshots/verification.png")
    print("Screenshot saved!")

if __name__ == "__main__":
    os.makedirs("verification/screenshots", exist_ok=True)
    os.makedirs("verification/videos", exist_ok=True)

    server = subprocess.Popen(
        ["npx", "vite", "--host"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    time.sleep(3)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(record_video_dir="verification/videos")
            page = context.new_page()
            try:
                run_cuj(page)
            finally:
                context.close()
                browser.close()
    finally:
        server.terminate()
        server.wait()
