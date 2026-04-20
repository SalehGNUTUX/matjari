#!/usr/bin/env bash
# ===== سكريبت بناء AppImage لينكس — متجري v2.9.5 =====
set -e

VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "2.9.5")

echo "🐧 بناء Matjari AppImage v${VERSION}..."

# التحقق من Node.js
node_ver=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_ver" -lt 18 ]; then
  echo "❌ يحتاج Node.js 18+ (الحالي: $(node --version))"
  exit 1
fi

# تثبيت الاعتمادية
echo "📦 تثبيت الاعتمادية..."
npm install

# بناء
echo "🔨 بناء AppImage..."
npm run package:linux

# نسخ باسم الإصدار
IMG=$(find dist_electron -name "*.AppImage" 2>/dev/null | head -1)
if [ -n "$IMG" ]; then
  OUT="Matjari-${VERSION}-x86_64.AppImage"
  cp "$IMG" "$OUT"
  chmod +x "$OUT"
  echo ""
  echo "✅ AppImage جاهز: ${OUT}"
  echo "   الحجم: $(du -sh "${OUT}" | cut -f1)"
  echo "   sha256: $(sha256sum "${OUT}" | cut -d' ' -f1)"
  echo ""
  echo "للتشغيل:"
  echo "  ./${OUT}"
else
  echo "ابحث عن ملف AppImage في dist_electron/"
fi
