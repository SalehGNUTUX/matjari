#!/usr/bin/env node
/**
 * patch-android-manifest.js
 * شغّله بعد "npx cap add android" مباشرةً لإضافة الصلاحيات
 * الاستخدام: node scripts/patch-android-manifest.js
 */
const fs   = require('fs');
const path = require('path');

const MANIFEST = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');

if (!fs.existsSync(MANIFEST)) {
  console.error('❌ AndroidManifest.xml غير موجود — شغّل أولاً: npx cap add android');
  process.exit(1);
}

let xml = fs.readFileSync(MANIFEST, 'utf-8');

// الصلاحيات المطلوبة
const PERMISSIONS = [
  '    <uses-permission android:name="android.permission.INTERNET" />',
  '    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
  '    <uses-permission android:name="android.permission.CAMERA" />',
  '    <uses-feature android:name="android.hardware.camera" android:required="false" />',
  '    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />',
  '    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />',
  '    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />',
  '    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />',
  '    <uses-permission android:name="android.permission.VIBRATE" />',
];

// أضف الصلاحيات غير الموجودة فقط (لا تكرار)
let added = 0;
for (const perm of PERMISSIONS) {
  const name = perm.match(/android:name="([^"]+)"/)?.[1];
  if (name && !xml.includes(name)) {
    xml = xml.replace('</manifest>', `${perm}\n</manifest>`);
    added++;
    console.log(`  ✅ أُضيف: ${name}`);
  } else {
    console.log(`  ⏭️  موجود: ${name}`);
  }
}

// أضف requestLegacyExternalStorage للـ application tag
if (!xml.includes('requestLegacyExternalStorage')) {
  xml = xml.replace(
    '<application',
    '<application\n        android:requestLegacyExternalStorage="true"'
  );
  console.log('  ✅ أُضيف: requestLegacyExternalStorage');
}

fs.writeFileSync(MANIFEST, xml, 'utf-8');
console.log(`\n🎉 تم تحديث AndroidManifest.xml — أُضيف ${added} صلاحية جديدة`);
console.log('الخطوة التالية: npx cap sync android && cd android && ./gradlew assembleDebug');

// ── إضافة intent-filter لفتح ملفات JSON (النسخ الاحتياطية) ──
let xml2 = fs.readFileSync(MANIFEST, 'utf-8');
const JSON_INTENT = `
        <intent-filter>
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:mimeType="application/json" />
            <data android:mimeType="text/plain" />
            <data android:scheme="file" />
            <data android:scheme="content" />
        </intent-filter>`;

if (!xml2.includes('application/json')) {
  // أضف intent-filter داخل أول <activity> بعد الـ intent-filter الموجود
  xml2 = xml2.replace(
    /<\/intent-filter>(\s*<\/activity>)/,
    `</intent-filter>${JSON_INTENT}$1`
  );
  fs.writeFileSync(MANIFEST, xml2, 'utf-8');
  console.log('  ✅ أُضيف: intent-filter لملفات JSON (النسخ الاحتياطية)');
} else {
  console.log('  ⏭️  موجود: intent-filter للـ JSON');
}
