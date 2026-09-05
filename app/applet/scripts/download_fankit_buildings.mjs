import { chromium } from 'playwright';

async function downloadAssets() {
  const url = "https://fankit.supercell.com/d/vkEdmkUCngKw/game-assets?asset-type97=Buildings";
  
  try {
    console.log("Starting browser...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });
    
    console.log("Scrolling to load all images...");
    let lastHeight = await page.evaluate("document.body.scrollHeight");
    while (true) {
      await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
      await page.waitForTimeout(1500);
      
      const newHeight = await page.evaluate("document.body.scrollHeight");
      if (newHeight === lastHeight) {
        console.log("Finished loading page.");
        break;
      }
      lastHeight = newHeight;
    }
    
    console.log("Selecting all images...");
    const checkboxes = page.locator('button[data-test-id="library-item-card-checkbox"]');
    await checkboxes.first().waitFor({ state: "attached" });
    
    const count = await checkboxes.count();
    console.log(`Found ${count} images.`);
    
    for (let i = 0; i < count; i++) {
      await checkboxes.nth(i).click({ force: true });
      await page.waitForTimeout(50);
    }
    
    console.log("Finished selecting images.");
    
    console.log("Preparing to download...");
    const downloadBtn = page.locator('button[data-test-id="bulk-assets-download-button"]');
    await downloadBtn.waitFor({ state: "visible" });
    
    console.log("Waiting for server to compress file (this may take a few minutes)...");
    const downloadPromise = page.waitForEvent('download', { timeout: 120000 });
    await downloadBtn.click();
    const download = await downloadPromise;
    
    await download.saveAs("ClashOfClans_Buildings.zip");
    console.log(`Download successful! Saved as: ClashOfClans_Buildings.zip`);
    
    await browser.close();
  } catch (e) {
    console.error(`Error occurred: ${e}`);
    process.exit(1);
  }
}

downloadAssets();
