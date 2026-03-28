#!/usr/bin/env bash
# ===== سكريبت بناء AppImage للينكس =====
set -e

echo "🐧 بناء تطبيق Matjari لنظام لينكس..."

# التحقق من Node.js
node_ver=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_ver" -lt 18 ]; then
  echo "❌ يحتاج Node.js 18 أو أحدث (الحالي: $(node --version))"
  exit 1
fi

# تثبيت الاعتمادية
echo "📦 تثبيت الاعتمادية..."
npm install

# بناء
echo "🔨 بناء..."
npm run package:linux

echo ""
echo "✅ تم البناء!"
ls dist_electron/*.AppImage 2>/dev/null || echo "ابحث عن ملف AppImage في dist_electron/"
echo ""
echo "لتشغيل التطبيق:"
echo "  chmod +x dist_electron/*.AppImage"
echo "  ./dist_electron/*.AppImage"
