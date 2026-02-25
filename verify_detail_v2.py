from playwright.sync_api import sync_playwright, expect
import time

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to login...")
        page.goto("http://127.0.0.1:3000/login.html")

        # Login
        page.fill("#username", "admin")
        page.fill("#password", "admin123")
        page.click("button[type='submit']")

        # Wait for dashboard
        page.wait_for_url("**/")
        print("Logged in successfully")

        # Go to Personal
        page.goto("http://127.0.0.1:3000/personal.html")
        page.wait_for_selector("#lista-personal tr")
        print("Personal page loaded")

        # Find the eye button for Juan Auxiliar (AUX001) if it exists, or just the first one
        # Juan has AUX001
        juan_row = page.locator("tr", has_text="AUX001")
        if juan_row.count() > 0:
            print("Found Juan Auxiliar row")
            eye_button = juan_row.locator("button[title='Ver Detalle']")
        else:
            print("Juan not found, using first row")
            eye_button = page.locator("#lista-personal tr").first.locator("button[title='Ver Detalle']")

        eye_button.click()
        print("Clicked Ver Detalle")

        # Wait for modal
        modal = page.locator("#modal-detalle")
        expect(modal).to_be_visible()
        print("Detail modal visible")

        # Wait a bit for data to load
        time.sleep(2)

        # Take screenshot
        page.screenshot(path="verification_detail.png", full_page=False)
        print("Screenshot saved to verification_detail.png")

        browser.close()

if __name__ == "__main__":
    run_verification()
