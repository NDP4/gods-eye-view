#!/usr/bin/env node
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({
  headless: true,
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1920, height: 1080 });
const xhrLog = [];
page.on('request', (req) => {
  const u = req.url();
  if (u.includes('.m3u8') || u.includes('livepantau') || u.includes('pantausemar')) {
    xhrLog.push({ method: req.method(), url: u.slice(0, 200) });
  }
});
page.on('response', async (resp) => {
  const u = resp.url();
  if (u.includes('.m3u8')) {
    try {
      const text = await resp.text();
      xhrLog.push({ kind: 'response', status: resp.status(), url: u.slice(0, 200), body: text.slice(0, 200) });
    } catch {}
  }
});
await page.goto('https://pantausemar.semarangkota.go.id', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 3000));

// Get all CCTV markers
const markers = await page.evaluate(() => {
  const els = document.querySelectorAll('.custom-cctv-marker');
  return els.length;
});
console.log('CCTV markers:', markers);

// Get window.cctvs
const cctvs = await page.evaluate(() => {
  if (!window.cctvs) return null;
  return JSON.stringify(window.cctvs);
});

if (cctvs) {
  const parsed = JSON.parse(cctvs);
  console.log('cctvs count:', parsed.length);
  const fs = require('fs');
  fs.writeFileSync('/tmp/cctvs2.json', JSON.stringify(parsed, null, 2));
  console.log('Saved to /tmp/cctvs2.json');
  
  // Show first 3 IDs
  for (let i = 0; i < Math.min(5, parsed.length); i++) {
    const c = parsed[i];
    const link = c.links?.[0];
    console.log(`  ID:${link?.id} name:${c.owner_name} lat:${c.lat} lng:${c.lng}`);
    if (link) console.log(`    URL: ${link.url}`);
  }
} else {
  console.log('No window.cctvs found');
}

// XHR log
console.log('XHR m3u8 requests:');
for (const x of xhrLog) {
  console.log(`  ${x.method || x.kind} ${x.status || ''} ${x.url}`);
}

await browser.close();
