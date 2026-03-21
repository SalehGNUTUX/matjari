#!/usr/bin/env bash
# ===== سكريبت بناء APK الأندرويد =====
set -e

echo "🔨 بناء تطبيق Matjari للأندرويد..."

# 1. بناء الويب
echo "📦 بناء الواجهة..."
npm run build:web

# 2. مزامنة Capacitor
echo "🔄 مزامنة Capacitor..."
npx cap sync android

# 3. بناء APK
echo "🤖 بناء APK..."
cd android
if [ "$1" = "release" ]; then
  ./gradlew assembleRelease
  echo "✅ APK جاهز: android/app/build/outputs/apk/release/"
else
  ./gradlew assembleDebug
  echo "✅ APK جاهز: android/app/build/outputs/apk/debug/app-debug.apk"
fi
