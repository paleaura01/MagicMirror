# agent1.py

from flask import Flask, jsonify
from flask_cors import CORS
import asyncio
import threading
import os
from playwright.async_api import async_playwright
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)  # Enable CORS if needed

# Load environment variables
load_dotenv()

# Directory to save screenshots
screenshot_dir = "./screenshots"
os.makedirs(screenshot_dir, exist_ok=True)

# Credentials (use environment variables or secure storage)
USERNAME = os.environ.get('USPS_USERNAME')
PASSWORD = os.environ.get('USPS_PASSWORD')

if not USERNAME or not PASSWORD:
    print("Error: USPS_USERNAME and USPS_PASSWORD environment variables not set.")
    exit(1)

async def login_and_capture():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        # Go to the login page
        await page.goto("https://reg.usps.com/informeddelivery/login")

        # Fill in the username and password
        await page.fill('input[name="username"]', USERNAME)
        await page.fill('input[name="password"]', PASSWORD)

        # Click the login button
        await page.click('button[type="submit"]')

        # Wait for navigation after login
        await page.wait_for_load_state('networkidle')

        # Take a screenshot
        screenshot_path = os.path.join(screenshot_dir, "usps_dashboard.png")
        await page.screenshot(path=screenshot_path)

        await browser.close()

    return {
        "screenshot_path": screenshot_path,
        "description": "Screenshot taken successfully."
    }

@app.route('/api/usps_login', methods=['GET'])
def usps_login():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    result = loop.run_until_complete(login_and_capture())
    return jsonify(result)

def run_app():
    app.run(host='0.0.0.0', port=5001)

if __name__ == '__main__':
    threading.Thread(target=run_app).start()
