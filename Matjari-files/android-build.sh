#!/usr/bin/env bash
# ===== سكريبت بناء APK الأندرويد — متجري v2.9.5 =====
# الاستخدام: ./android-build.sh [release]
set -e

VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "2.9.5")

echo "🔨 بناء Matjari APK v${VERSION}..."

# 1. بناء الويب
echo "📦 بناء الواجهة..."
npm run build:web

# 2. مزامنة Capacitor
echo "🔄 مزامنة Capacitor..."
npx cap sync android

# 3. بناء APK
echo "🤖 بناء APK..."
cd android
if [ "${1:-}" = "release" ]; then
  ./gradlew assembleRelease
  APK=$(find app/build/outputs/apk/release -name "*.apk" | head -1)
else
  ./gradlew assembleDebug
  APK="app/build/outputs/apk/debug/app-debug.apk"
fi
cd ..

# 4. نسخ باسم الإصدار
if [ -f "android/$APK" ] || [ -f "$APK" ]; then
  OUT="matjari-${VERSION}.apk"
  cp "${APK/#android\/}" "$OUT" 2>/dev/null || cp "android/$APK" "$OUT" 2>/dev/null || true
  echo ""
  echo "✅ APK جاهز: ${OUT}"
  echo "   الحجم: $(du -sh "${OUT}" 2>/dev/null | cut -f1)"
  echo "   sha256: $(sha256sum "${OUT}" 2>/dev/null | cut -d' ' -f1)"
else
  echo "✅ APK في: android/app/build/outputs/apk/"
fi
