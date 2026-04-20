#!/bin/bash
# ============================================================
#  build-all.sh — متجري | MATJARI POS
#  يبني حزمة APK (Android) + AppImage (Linux) معاً
#  الاستخدام:
#    ./build-all.sh          # بناء كليهما
#    ./build-all.sh apk      # APK فقط
#    ./build-all.sh appimage # AppImage فقط
# ============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
TARGET="${1:-all}"
ERRORS=0
STEP=0

print_header() {
  echo -e "\n${BLUE}${BOLD}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}${BOLD}║   متجري | MATJARI POS — Build All v${VERSION}   ║${NC}"
  echo -e "${BLUE}${BOLD}╚══════════════════════════════════════════════╝${NC}\n"
  echo -e "  الهدف: ${CYAN}${BOLD}${TARGET}${NC}"
  echo -e "  البيئة: Node $(node --version) | npm $(npm --version)\n"
}

step() {
  STEP=$((STEP+1))
  echo -e "\n${BLUE}━━━ [${STEP}] $1 ━━━${NC}"
}

ok()  { echo -e "${GREEN}  ✓ $1${NC}"; }
err() { echo -e "${RED}  ✗ $1${NC}"; ERRORS=$((ERRORS+1)); }
warn(){ echo -e "${YELLOW}  ⚠ $1${NC}"; }
info(){ echo -e "  → $1"; }

require_cmd() {
  if ! command -v "$1" &>/dev/null; then
    err "أمر غير موجود: $1"
    if [ -n "${2:-}" ]; then info "تثبيت: $2"; fi
    exit 1
  fi
}

check_env() {
  step "التحقق من البيئة"
  require_cmd node
  require_cmd npm
  local node_major
  node_major=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
  if [ "$node_major" -lt 18 ]; then
    err "يحتاج Node.js 18+ (الحالي: $(node --version))"
    exit 1
  fi
  ok "Node.js $(node --version)"

  if [ "$TARGET" = "all" ] || [ "$TARGET" = "apk" ]; then
    if [ -z "${JAVA_HOME:-}" ] && ! command -v java &>/dev/null; then
      warn "Java غير موجود — قد يفشل بناء APK"
    else
      ok "Java: $(java -version 2>&1 | head -1)"
    fi
  fi
}

install_deps() {
  step "تثبيت الاعتمادية (npm install)"
  if npm install --prefer-offline 2>&1 | tail -3; then ok "npm install"; else err "npm install فشل"; exit 1; fi
}

build_web() {
  step "بناء واجهة الويب (build:web)"
  if npm run build:web 2>&1 | tail -5; then ok "build:web"; else err "build:web فشل"; exit 1; fi
}

# ─── Android APK ────────────────────────────────────────────────
build_apk() {
  step "إعداد منصة Android"

  info "حذف android القديم..."
  rm -rf android

  info "إضافة منصة Android..."
  npx cap add android 2>&1 | tail -3 || { err "cap add android فشل"; return 1; }

  info "تطبيق التصحيحات..."
  npm run patch-android 2>&1 | tail -3 || warn "patch-android: أكمل مع تحذيرات"

  info "توليد الأيقونات..."
  node scripts/generate-android-icons.js 2>&1 | tail -3 || warn "generate-icons: تحذير"

  step "مزامنة Capacitor"
  npx cap sync android 2>&1 | tail -3 || { err "cap sync فشل"; return 1; }
  ok "cap sync android"

  step "بناء APK باستخدام Gradle"
  cd android
  chmod +x gradlew
  ./gradlew assembleDebug 2>&1 | tail -10
  local result=$?
  cd ..

  if [ $result -eq 0 ]; then
    local APK="android/app/build/outputs/apk/debug/app-debug.apk"
    if [ -f "$APK" ]; then
      local SIZE
      SIZE=$(du -sh "$APK" | cut -f1)
      # نسخ باسم الإصدار
      local OUT="matjari-${VERSION}.apk"
      cp "$APK" "$OUT"
      ok "APK: ${OUT} (${SIZE})"
    fi
  else
    err "Gradle assembleDebug فشل"
    return 1
  fi
}

# ─── Linux AppImage ──────────────────────────────────────────────
build_appimage() {
  step "بناء AppImage (Electron)"
  if npm run package:linux 2>&1 | tail -10; then
    local IMG
    IMG=$(find dist_electron -name "*.AppImage" 2>/dev/null | head -1)
    if [ -n "$IMG" ]; then
      local SIZE
      SIZE=$(du -sh "$IMG" | cut -f1)
      local OUT="Matjari-${VERSION}-x86_64.AppImage"
      cp "$IMG" "$OUT"
      chmod +x "$OUT"
      ok "AppImage: ${OUT} (${SIZE})"
    else
      err "لم يُعثر على ملف AppImage في dist_electron/"
      return 1
    fi
  else
    err "package:linux فشل"
    return 1
  fi
}

# ─── تقرير نهائي ────────────────────────────────────────────────
final_report() {
  echo ""
  echo -e "${BLUE}${BOLD}══════════════════ تقرير البناء ══════════════════${NC}"

  local apk_file="matjari-${VERSION}.apk"
  local img_file="Matjari-${VERSION}-x86_64.AppImage"

  if [ -f "$apk_file" ]; then
    echo -e "  ${GREEN}✓ APK:${NC}      ${apk_file} ($(du -sh "$apk_file" | cut -f1))"
    echo -e "        ${CYAN}sha256: $(sha256sum "$apk_file" | cut -d' ' -f1)${NC}"
  fi
  if [ -f "$img_file" ]; then
    echo -e "  ${GREEN}✓ AppImage:${NC} ${img_file} ($(du -sh "$img_file" | cut -f1))"
    echo -e "        ${CYAN}sha256: $(sha256sum "$img_file" | cut -d' ' -f1)${NC}"
  fi

  echo ""
  if [ "$ERRORS" -eq 0 ]; then
    echo -e "  ${GREEN}${BOLD}✓ البناء اكتمل بنجاح!${NC}"
  else
    echo -e "  ${RED}${BOLD}✗ اكتمل مع ${ERRORS} خطأ${NC}"
  fi
  echo -e "${BLUE}${BOLD}══════════════════════════════════════════════════${NC}\n"
}

# ─── تنفيذ ───────────────────────────────────────────────────────
print_header
check_env
install_deps
build_web

case "$TARGET" in
  apk)      build_apk ;;
  appimage) build_appimage ;;
  all)      build_apk; build_appimage ;;
  *)
    echo -e "${RED}هدف غير معروف: $TARGET${NC}"
    echo "الاستخدام: $0 [all|apk|appimage]"
    exit 1
    ;;
esac

final_report
exit $ERRORS
