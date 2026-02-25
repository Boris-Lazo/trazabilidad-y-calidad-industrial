from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Check bootstrap page first
            page.goto("http://localhost:3000/bootstrap.html")
            page.screenshot(path="verification/bootstrap_page.png")
            print("Bootstrap page screenshot taken")

            # Try to log in if already bootstrapped (maybe from previous run)
            page.goto("http://localhost:3000/login.html")
            page.fill("#username", "ADMIN01")
            page.fill("#password", "admin123")
            page.click("button[type='submit']")
            page.wait_for_timeout(2000)
            page.screenshot(path="verification/after_login.png")
            print("After login screenshot taken")

        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_frontend()
