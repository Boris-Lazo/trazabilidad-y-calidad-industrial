from playwright.sync_api import sync_playwright, expect
import time

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # 1. Bootstrap
        page.goto("http://localhost:3000/bootstrap.html")
        page.fill("#nombre", "Admin")
        page.fill("#apellido", "User")
        page.fill("#codigo_interno", "ADMIN01")
        page.fill("#email", "admin@example.com")
        page.fill("#telefono", "1234567890")

        # Wait for areas to load
        page.wait_for_selector("#area_id option:not([value=''])")
        page.select_option("#area_id", label="Administración")

        page.fill("#password", "admin123")
        page.click("button[type='submit']")

        page.wait_for_timeout(1000)
        print("Bootstrap submitted")

        # 2. Login
        page.goto("http://localhost:3000/login.html")
        page.fill("#username", "ADMIN01") # Login uses codigo_interno
        page.fill("#password", "admin123")
        page.click("button[type='submit']")

        # Wait for navigation to dashboard or home
        page.wait_for_timeout(2000)
        print(f"URL after login: {page.url}")

        # 3. Go to Personal
        page.goto("http://localhost:3000/personal.html")
        page.wait_for_selector("#btn-nuevo-personal")
        print("Personal page loaded")

        # 4. Trigger assignment modal
        page.evaluate("document.getElementById('modal-asignacion').style.display = 'flex'")
        page.wait_for_timeout(2000) # Wait for /api/bitacora/procesos

        # 5. Screenshot
        page.screenshot(path="./verification/personal_assignment.png")
        print("Screenshot taken")

        # Check if dropdown has options
        options_count = page.evaluate("document.querySelectorAll('#a-proceso option').length")
        print(f"Process options count: {options_count}")

        browser.close()

if __name__ == "__main__":
    verify_frontend()
