import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.svg': 'image/svg+xml'
};

const server = createServer((req, res) => {
    let filePath = join('./dist', req.url === '/' ? 'index.html' : req.url);
    if (!existsSync(filePath)) {
      filePath = join('./dist', 'index.html');
    }
    const ext = extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    try {
        const content = readFileSync(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
    } catch (error) {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(5555, async () => {
    console.log("Server listening on 5555");
    
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    let hasError = false;
    page.on('pageerror', exception => {
      console.error(`Uncaught exception: "${exception}"`);
      hasError = true;
    });
    
    try {
      await page.goto('http://localhost:5555', { waitUntil: 'networkidle' });
      console.log("Page loaded successfully.");
    } catch (e) {
      console.error("Failed to load page:", e);
    }
    
    server.close();
    await browser.close();
    
    if (hasError) {
      process.exit(1);
    } else {
      process.exit(0);
    }
});
