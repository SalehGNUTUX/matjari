#!/bin/bash

# ============================================
# سكريبت بناء APK لمشروع متجري (Matjari)
# يقوم ببناء التطبيق خطوة بخطوة مع التحقق من الأخطاء
# ============================================

# الألوان لجعل المخرجات أكثر وضوحاً
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# متغير لتتبع الخطأ
ERROR_OCCURRED=0
CURRENT_STEP=0
TOTAL_STEPS=9

# دالة لعرض الخطوات
print_step() {
    CURRENT_STEP=$((CURRENT_STEP + 1))
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}[$CURRENT_STEP/$TOTAL_STEPS] $1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# دالة لعرض النجاح
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# دالة لعرض الفشل
print_error() {
    echo -e "${RED}✗ فشل: $1${NC}"
}

# دالة للتحقق من نتيجة الأمر
check_result() {
    if [ $? -eq 0 ]; then
        print_success "$1"
        return 0
    else
        print_error "$1"
        ERROR_OCCURRED=1
        return 1
    fi
}

# دالة لعرض التقرير النهائي
print_final_report() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}تقرير البناء النهائي${NC}"
    echo -e "${BLUE}========================================${NC}"

    if [ $ERROR_OCCURRED -eq 0 ]; then
        echo -e "${GREEN}✓ تم بناء APK بنجاح!${NC}"
        echo -e "${GREEN}✓ موقع الملف: android/app/build/outputs/apk/debug/${NC}"
        echo ""
        echo -e "${YELLOW}للتثبيت على الجهاز:${NC}"
        echo "  adb install android/app/build/outputs/apk/debug/app-debug.apk"
    else
        echo -e "${RED}✗ فشل البناء في الخطوة $CURRENT_STEP${NC}"
        echo -e "${RED}يرجى مراجعة الأخطاء أعلاه وإصلاحها ثم إعادة المحاولة.${NC}"
    fi
    echo -e "${BLUE}========================================${NC}"
}

# ============================================
# بدء عملية البناء
# ============================================

echo -e "${GREEN}"
echo "╔═══════════════════════════════════════╗"
echo "║   بناء APK - نظام متجري (Matjari)    ║"
echo "║   Matjari POS Build Script           ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"

# التحقق من وجود ملف package.json
if [ ! -f "package.json" ]; then
    print_error "لم يتم العثور على ملف package.json. تأكد من أنك في المجلد الصحيح."
    exit 1
fi

# ============================================
# الخطوة 1: تثبيت الاعتماديات
# ============================================
print_step "تثبيت الاعتماديات (npm install)"
npm install
check_result "تثبيت الاعتماديات"
if [ $ERROR_OCCURRED -eq 1 ]; then exit 1; fi

# ============================================
# الخطوة 2: حذف مجلد android القديم
# ============================================
print_step "حذف مجلد android القديم"
rm -rf android
check_result "حذف مجلد android"
if [ $ERROR_OCCURRED -eq 1 ]; then exit 1; fi

# ============================================
# الخطوة 3: إضافة منصة Android
# ============================================
print_step "إضافة منصة Android عبر Capacitor"
npx cap add android
check_result "إضافة منصة Android"
if [ $ERROR_OCCURRED -eq 1 ]; then exit 1; fi

# ============================================
# الخطوة 4: تطبيق التصحيحات على Android
# ============================================
print_step "تطبيق التصحيحات (patch-android)"
npm run patch-android
check_result "تطبيق التصحيحات"
if [ $ERROR_OCCURRED -eq 1 ]; then exit 1; fi

# ============================================
# الخطوة 5: إنشاء أيقونات Android
# ============================================
print_step "إنشاء أيقونات Android"
node scripts/generate-android-icons.js
check_result "إنشاء الأيقونات"
if [ $ERROR_OCCURRED -eq 1 ]; then exit 1; fi

# ============================================
# الخطوة 6: بناء الويب
# ============================================
print_step "بناء تطبيق الويب (build:web)"
npm run build:web
check_result "بناء الويب"
if [ $ERROR_OCCURRED -eq 1 ]; then exit 1; fi

# ============================================
# الخطوة 7: مزامنة مع Capacitor
# ============================================
print_step "مزامنة مع Capacitor"
npx cap sync android
check_result "المزامنة مع Capacitor"
if [ $ERROR_OCCURRED -eq 1 ]; then exit 1; fi

# ============================================
# الخطوة 8: بناء APK باستخدام Gradle
# ============================================
print_step "بناء APK باستخدام Gradle"
cd android
if [ $? -ne 0 ]; then
    print_error "لا يمكن الدخول إلى مجلد android"
    ERROR_OCCURRED=1
    exit 1
fi

./gradlew assembleDebug
check_result "بناء APK"
if [ $ERROR_OCCURRED -eq 1 ]; then
    cd ..
    exit 1
fi
cd ..

# ============================================
# الخطوة 9: التحقق من وجود ملف APK
# ============================================
print_step "التحقق من وجود ملف APK"
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    print_success "تم إنشاء الملف بنجاح: $APK_PATH (الحجم: $APK_SIZE)"
else
    print_error "لم يتم العثور على ملف APK في المسار المتوقع"
    ERROR_OCCURRED=1
fi

# ============================================
# التقرير النهائي
# ============================================
print_final_report

# الخروج مع الكود المناسب
if [ $ERROR_OCCURRED -eq 0 ]; then
    exit 0
else
    exit 1
fi
