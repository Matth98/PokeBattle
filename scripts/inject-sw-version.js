// scripts/inject-sw-version.js
// Remplace __BUILD_ID__ dans build/service-worker.js par un timestamp unique.
// Appelé automatiquement après chaque `npm run build`.

const fs   = require('fs');
const path = require('path');

const swPath  = path.join(__dirname, '..', 'build', 'service-worker.js');
const buildId = Date.now().toString(36); // ex: "lzxk4g2" — court et unique

if (!fs.existsSync(swPath)) {
  console.error('inject-sw-version: build/service-worker.js introuvable.');
  process.exit(1);
}

const content = fs.readFileSync(swPath, 'utf8');
const updated = content.replace(/__BUILD_ID__/g, buildId);
fs.writeFileSync(swPath, updated, 'utf8');

console.log(`inject-sw-version: CACHE_NAME → pokescores-${buildId}`);
