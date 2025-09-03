import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Get the absolute path to the index.html file
        file_path = os.path.abspath('index.html')
        await page.goto(f'file://{file_path}')

        # Wait for the page and JavaScript to load
        await page.wait_for_load_state('networkidle')

        # Wait for animations to settle
        await page.wait_for_timeout(1000)

        # Take a screenshot of the clock
        clock_element = await page.query_selector('.canvas-container')
        if clock_element:
            await clock_element.screenshot(path='jules-scratch/verification/verification.png')
        else:
            await page.screenshot(path='jules-scratch/verification/verification.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
