#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { chromium } from 'playwright';

// Get the directory of the current file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testSogsVitePlaywright() {
    console.log('🧪 Testing SOGS export with Vite dev server and Playwright...');

    let viteProcess = null;

    try {
        // Start Vite dev server
        console.log('🚀 Starting Vite dev server...');
        viteProcess = spawn('npm', ['run', 'dev'], {
            cwd: join(__dirname, '..'),
            stdio: 'pipe'
        });

                // Wait for Vite to start
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Vite server timeout'));
            }, 30000);

            const handleData = (data) => {
                const output = data.toString();
                console.log('Vite:', output.trim());
                if (output.includes('Local:') || output.includes('localhost:')) {
                    clearTimeout(timeout);
                    resolve();
                }
            };

            const handleError = (data) => {
                console.error('Vite error:', data.toString());
            };

            const handleProcessError = (error) => {
                clearTimeout(timeout);
                reject(error);
            };

            viteProcess.stdout.on('data', handleData);
            viteProcess.stderr.on('data', handleError);
            viteProcess.on('error', handleProcessError);
        });

        // Wait a bit more for the server to be fully ready
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('✅ Vite dev server started');

        // Launch browser
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();

        // Listen to console messages
        page.on('console', msg => console.log('Browser console:', msg.text()));
        page.on('pageerror', error => console.error('Browser error:', error.message));

        // Navigate to the Vite dev server
        console.log('🌐 Navigating to Vite dev server...');
        await page.goto('http://localhost:3000');

        // Wait for the page to load
        await page.waitForSelector('#uploadArea', { timeout: 10000 });
        console.log('✅ Page loaded successfully');

        // Set SOGS as the output format
        console.log('📝 Setting output format to SOGS...');
        await page.selectOption('#outputFormat', 'json');

                // Upload the file
        console.log('📁 Uploading example/couch.ply...');
        const filePath = join(__dirname, '../example/couch.ply');
        const fileInput = await page.$('#fileInput');
        await fileInput.setInputFiles(filePath);

        // Wait for the process button to be enabled
        console.log('⏳ Waiting for process button to be enabled...');
        await page.waitForFunction(() => {
            const processBtn = document.querySelector('#processBtn');
            return processBtn && !processBtn.disabled;
        }, { timeout: 10000 });

        // Click the process button
        console.log('🔄 Clicking process button...');
        await page.click('#processBtn');

        // Wait for file processing to start
        console.log('🔄 Waiting for file processing...');
        await page.waitForFunction(() => {
            const status = document.querySelector('#status');
            return status && status.textContent.includes('Processing');
        }, { timeout: 30000 });

                // Wait for processing to complete
        console.log('⏳ Waiting for processing to complete...');

        // First, wait for any download links to appear (this is the most reliable indicator)
        await page.waitForFunction(() => {
            const downloadLinks = document.querySelectorAll('a[download]');
            return downloadLinks.length > 0;
        }, { timeout: 300000 }); // 5 minutes timeout

        console.log('✅ Download links found, processing appears complete');

        console.log('✅ Processing completed');

        // Get the results
        const outputText = await page.$eval('#status', el => el.textContent);
        console.log('📊 Output:', outputText);

        // Check if we have download links
        const downloadLinks = await page.$$('a[download]');
        console.log(`📁 Found ${downloadLinks.length} download links`);

                // Download the files
        console.log('💾 Downloading files...');
        const downloadPromises = downloadLinks.map(async (link) => {
            const href = await link.getAttribute('href');
            const download = await link.getAttribute('download');

            if (href && download) {
                console.log(`  📥 Downloading: ${download}`);

                // Get the file data
                const response = await page.goto(href);
                const buffer = await response.body();

                // Save to output directory
                const outputPath = join(__dirname, `../output/${download}`);
                writeFileSync(outputPath, buffer);
                console.log(`  ✅ Saved: ${outputPath}`);
            }
        });

        await Promise.all(downloadPromises);

        // Check if there's a meta.json file
        const metaLink = await page.$('a[download*="meta.json"]');
        if (metaLink) {
            const href = await metaLink.getAttribute('href');
            const response = await page.goto(href);
            const buffer = await response.body();
            const metaPath = join(__dirname, '../output/meta.json');
            writeFileSync(metaPath, buffer);
            console.log(`  ✅ Saved: ${metaPath}`);
        }

        console.log('🎯 Test completed successfully!');
        console.log('📝 Note: This test used the actual Vite dev server and web interface.');

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    } finally {
        // Clean up
        if (viteProcess) {
            console.log('🛑 Stopping Vite dev server...');
            viteProcess.kill('SIGTERM');
        }
    }
}

// Run the test
testSogsVitePlaywright();
