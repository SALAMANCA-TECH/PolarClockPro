import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        file_path = os.path.abspath('index.html')
        await page.goto(f'file://{file_path}')

        # 1. Go to tools and then countdown tab
        await page.click('#goToToolsBtn')
        await page.click('#countdownTab')
        await page.wait_for_selector('#countdownPanel', state='visible')

        # 2. Enter time
        await page.fill('#countdownMonths', '1')
        await page.fill('#countdownSeconds', '5')

        # 3. Finalize input and take screenshot
        await page.press('#countdownSeconds', 'Tab')
        await asyncio.sleep(1) # Wait for UI to update
        await page.screenshot(path='jules-scratch/verification/v2_before_start.png')

        # 4. Start countdown
        await page.click('#toggleCountdownBtn')
        await asyncio.sleep(2)
        await page.screenshot(path='jules-scratch/verification/v2_after_start.png')

        # 5. Pause countdown
        await page.click('#toggleCountdownBtn')
        await asyncio.sleep(1)
        await page.screenshot(path='jules-scratch/verification/v2_paused.png')

        # 6. Reset countdown
        await page.click('#resetCountdownBtn')
        await asyncio.sleep(1)
        await page.screenshot(path='jules-scratch/verification/v2_reset.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
