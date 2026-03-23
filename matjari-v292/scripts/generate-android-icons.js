#!/usr/bin/env node
/**
 * Matjari Android Icon Generator
 * Run: node scripts/generate-android-icons.js
 */
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC  = path.join(__dirname, '..', 'public', 'icon.png');
const RES  = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const BG   = '#0a0f1a';

const DENSITIES = {
  'mipmap-mdpi':    { size: 48,  fg: 108 },
  'mipmap-hdpi':    { size: 72,  fg: 162 },
  'mipmap-xhdpi':   { size: 96,  fg: 216 },
  'mipmap-xxhdpi':  { size: 144, fg: 324 },
  'mipmap-xxxhdpi': { size: 192, fg: 432 },
};

if (!fs.existsSync(SRC)) { console.error(`❌ ${SRC} not found`); process.exit(1); }
if (!fs.existsSync(RES))  { console.error(`❌ ${RES} not found\nRun: npx cap add android`); process.exit(1); }

async function run() {
  let sharp;
  try { sharp = require('sharp'); }
  catch {
    console.log('📦 Installing sharp...');
    execSync('npm install sharp --save-dev', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    sharp = require('sharp');
  }

  console.log('🎨 Generating Android icons...\n');

  for (const [folder, { size, fg }] of Object.entries(DENSITIES)) {
    const dir = path.join(RES, folder);
    fs.mkdirSync(dir, { recursive: true });

    // Square launcher icon
    await sharp(SRC)
      .resize(size, size, { fit: 'contain', background: BG })
      .flatten({ background: BG })
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    // Round launcher icon (circle mask)
    const mask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="white"/></svg>`
    );
    await sharp(SRC)
      .resize(size, size, { fit: 'contain', background: BG })
      .flatten({ background: BG })
      .composite([{ input: mask, blend: 'dest-in' }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // Foreground for adaptive icon (transparent bg, safe zone padding 25%)
    const pad  = Math.round(fg * 0.25);
    const inner = fg - pad * 2;
    await sharp(SRC)
      .resize(inner, inner, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } })
      .extend({ top:pad, bottom:pad, left:pad, right:pad, background:{r:0,g:0,b:0,alpha:0} })
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    console.log(`  ✅ ${folder.padEnd(22)} ${size}×${size}px`);
  }

  // Adaptive icon XML (Android 8+)
  const v26 = path.join(RES, 'mipmap-anydpi-v26');
  fs.mkdirSync(v26, { recursive: true });
  const xml = (name) =>
`<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/${name}"/>
</adaptive-icon>`;
  fs.writeFileSync(path.join(v26, 'ic_launcher.xml'),       xml('ic_launcher_foreground'));
  fs.writeFileSync(path.join(v26, 'ic_launcher_round.xml'), xml('ic_launcher_foreground'));
  console.log(`  ✅ mipmap-anydpi-v26   Adaptive Icon XML`);

  // Background color — only write if not already defined by Capacitor
  const valDir   = path.join(RES, 'values');
  const bgFile   = path.join(valDir, 'ic_launcher_background.xml');
  const clrFile  = path.join(valDir, 'colors_launcher.xml');
  // Remove our duplicate file if it exists
  if (fs.existsSync(clrFile)) { fs.unlinkSync(clrFile); console.log(`  🗑️  Removed duplicate colors_launcher.xml`); }
  // Update the existing ic_launcher_background.xml with our color
  if (fs.existsSync(bgFile)) {
    fs.writeFileSync(bgFile,
`<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${BG}</color>
</resources>`);
    console.log(`  ✅ values/ic_launcher_background.xml updated to ${BG}`);
  } else {
    fs.mkdirSync(valDir, { recursive: true });
    fs.writeFileSync(bgFile,
`<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${BG}</color>
</resources>`);
    console.log(`  ✅ values/ic_launcher_background.xml created`);
  }

  console.log(`\n🎉 Done! Run: npx cap sync android && cd android && ./gradlew assembleDebug`);
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
