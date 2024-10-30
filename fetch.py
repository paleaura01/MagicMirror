import os
import json
import random
import time
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
import tempfile
import shutil

# Load environment variables
load_dotenv()

screenshot_dir = "./screenshots"
os.makedirs(screenshot_dir, exist_ok=True)

USERNAME = os.environ.get('USPS_USERNAME')
PASSWORD = os.environ.get('USPS_PASSWORD')

# List of different user-agent strings for randomization
user_agents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:89.0) Gecko/20100101 Firefox/89.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15A372 Safari/604.1"
]

# Randomized viewport sizes
viewports = [
    {"width": 1280, "height": 800},
    {"width": 1440, "height": 900},
    {"width": 1920, "height": 1080},
    {"width": 1366, "height": 768}
]

def login_and_capture():
    with sync_playwright() as p:
        # Use a unique temporary directory for user data
        user_data_dir = tempfile.mkdtemp()
        user_agent = random.choice(user_agents)
        viewport = random.choice(viewports)
        
        # Set the path to Brave
        brave_path = "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe"

        try:
            # Launch Brave with randomized settings
            browser = p.chromium.launch_persistent_context(
                user_data_dir=user_data_dir,
                executable_path=brave_path,
                headless=False,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-features=IsolateOrigins,site-per-process",
                    "--disable-webgl",
                    "--disable-webrtc",
                    "--no-sandbox"
                ],
                user_agent=user_agent,
                viewport=viewport,
                locale="en-US",
                timezone_id="America/New_York"
            )

            page = browser.pages[0]

            if not USERNAME or not PASSWORD:
                print(json.dumps({"error": "USPS_USERNAME and USPS_PASSWORD environment variables not set."}))
                return

            # Navigate to login page with random delay
            page.goto("https://reg.usps.com/informeddelivery/login")
            time.sleep(random.uniform(2, 5))

            # Additional anti-bot evasions
            page.evaluate("""() => {
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                window.navigator.chrome = { runtime: {} };
                Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            }""")

            # Fill in the username and password fields with random pauses
            page.fill('input[name="username"]', USERNAME)
            time.sleep(random.uniform(0.5, 1.5))
            page.fill('input[name="password"]', PASSWORD)
            time.sleep(random.uniform(1, 3))

            # Hover over and click the sign-in button
            sign_in_button = page.locator('button[type="submit"]')
            sign_in_button.hover()
            time.sleep(random.uniform(0.5, 2))
            sign_in_button.click()

            # Wait for the dashboard to load
            page.wait_for_selector("div#dashboardContent", timeout=30000)

            # Capture screenshot after successful login
            screenshot_path = os.path.join(screenshot_dir, "usps_dashboard.png")
            page.screenshot(path=screenshot_path)

            print(json.dumps({
                "screenshot_path": screenshot_path,
                "message": "Screenshot taken successfully. Dashboard loaded."
            }))

        except Exception as e:
            print(json.dumps({"error": f"An error occurred: {str(e)}"}))

        finally:
            # Clean up the temporary directory and close the browser
            browser.close()
            shutil.rmtree(user_data_dir, ignore_errors=True)

if __name__ == '__main__':
    login_and_capture()
