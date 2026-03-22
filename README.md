# متجري | MATJARI POS
### نظام إدارة المبيعات الذكي — v2.9.1 Beta

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://github.com/SalehGNUTUX/matjari/blob/main/LICENSE)
[![Release](https://img.shields.io/badge/Release-v2.9.1--beta-green)](https://github.com/SalehGNUTUX/matjari/releases/tag/Matjari-2.9.1)

---

## ⬇️ التحميل المباشر

| المنصة | الملف | الحجم |
|--------|-------|-------|
| 📱 **Android APK** | [Matjari-app-2.9.1.apk](https://github.com/SalehGNUTUX/matjari/releases/download/Matjari-2.9.1/Matjari-app-2.9.1.apk) | — |
| 🐧 **Linux AppImage (x86_64)** | [Matjari-2.9.1-x86_64.AppImage](https://github.com/SalehGNUTUX/matjari/releases/download/Matjari-2.9.1/Matjari-2.9.1-x86_64.AppImage) | — |

> 📦 [جميع ملفات الإصدار](https://github.com/SalehGNUTUX/matjari/releases/tag/Matjari-2.9.1)

---

## 🆕 مستجدات الإصدار 2.9.1

### ✅ إصلاحات جذرية
- **تعطل التطبيق عند الفتح** — إصلاح `loadFromStorage` و `INITIAL_SETTINGS` المحذوفَين خطأً
- **Rules of Hooks** — نقل `useEffect` زر الرجوع قبل الـ conditional return منعاً لتعطل React
- **أيقونة Printer** — إضافة الاستيراد الناقص في قسم البحث الشامل

### 🆕 مزايا جديدة

| الميزة | التفاصيل |
|--------|---------|
| **مسح الباركود بالكاميرا** | يفتح كاميرا النظام مباشرة على Android عبر `@capacitor/camera`، يلتقط الصورة ثم `jsqr` يحلل الرمز |
| **مسح الباركود من صورة** | اختيار صورة من المعرض وقراءة الرمز منها — يعمل على Android والمتصفح |
| **إدخال الباركود يدوياً** | نافذة المسح توفر 3 أوضاع: كاميرا / صورة / يدوي |
| **طباعة الفاتورة على Android** | الفاتورة تتحول إلى صورة PNG بدقة عالية ثم تُشارك مع تطبيقات الطباعة وGoogle Drive وWhatsApp |
| **إعادة طباعة الفواتير** | زر "طباعة" في كل فاتورة بقائمة المبيعات يفتح معاينة كاملة مع خياري طباعة وحفظ PNG |
| **ErrorBoundary** | عند حدوث أي خطأ تظهر شاشة واضحة مع زر "إنعاش التطبيق" |
| **زر الرجوع Android** | زر الرجوع يتنقل بين الأقسام بدلاً من إغلاق التطبيق |
| **روابط خارجية** | الروابط تفتح في المتصفح الخارجي لا داخل التطبيق |
| **أيقونة كاميرا في المخزون** | إضافة زر مسح باركود في خانة بحث المخزون |
| **الشريط العلوي للهاتف** | تقليص ارتفاعه لتوفير مساحة أكبر للمحتوى |

---

## 📋 نظرة عامة

**متجري** نظام نقطة بيع (POS) مفتوح المصدر يعمل على **GNU/Linux** و**Android** — بدون اشتراك، بدون سحابة، بياناتك ملكك.

---

## ✨ المميزات الكاملة

| القسم | الوصف |
|-------|-------|
| 🛒 **نقطة البيع** | مسح باركود، سلة مبيعات، خصومات، طرق دفع متعددة، طباعة فاتورة + QR |
| 📦 **المخزون** | إضافة/تعديل منتجات، جلب معلومات تلقائي عبر الباركود |
| 👥 **الزبائن** | نقاط الولاء، سجل المشتريات، القسائم |
| 🚚 **الموردون** | إدارة الموردين وربطهم بالمنتجات |
| 💳 **الديون** | تتبع ديون الزبائن، دفعات جزئية، تنبيهات التأخر |
| ⭐ **الزكاة** | حاسبة زكاة المال حسب المذاهب الأربعة |
| 📊 **لوحة التحكم** | إحصائيات المبيعات، رسوم بيانية، تقارير |
| 🔍 **البحث الشامل** | البحث في المبيعات، مسح QR، إعادة طباعة، معالجة المرتجعات |
| ⚙️ **الإعدادات** | موظفون، صلاحيات، طابعة حرارية، لغة |

**اللغات:** العربية 🇲🇦 · English · Français

---

## 🔑 بيانات الدخول الافتراضية

```
المستخدم : admin
كلمة المرور : admin
```
> ⚠️ غيِّر كلمة المرور فور التثبيت من **الإعدادات ← إدارة الطاقم**.

---

## 📲 تثبيت Android APK

1. حمِّل ملف `Matjari-app-2.9.1.apk`
2. فعِّل **"تثبيت من مصادر غير معروفة"** في إعدادات الهاتف
3. افتح الملف وثبِّته

---

## 🐧 تشغيل Linux AppImage

```bash
chmod +x Matjari-2.9.1-x86_64.AppImage
./Matjari-2.9.1-x86_64.AppImage
```

---

## ⚠️ حالة الإصدار التجريبي

| المشكلة | المنصة | الحالة |
|---------|--------|--------|
| صلاحيات الكاميرا والتخزين في إعدادات النظام | Android | 🔧 قيد الحل |
| مسح الباركود مباشرة بكاميرا Android | Android | 🔧 جزئي — يعمل عبر التقاط صورة |

---

## 🛠️ البناء من المصدر

```bash
npm install
npx cap add android
npm run patch-android
node scripts/generate-android-icons.js
npm run build:web
npx cap sync android
cd android && ./gradlew assembleDebug
```

---

## 🏗️ التقنيات

`React 18` · `TypeScript` · `Vite 5` · `Tailwind CSS` · `Electron 28` · `Capacitor 6` · `Recharts` · `html5-qrcode` · `jsqr` · `html2canvas`

---

## 📄 الترخيص

[GNU General Public License v3.0](https://github.com/SalehGNUTUX/matjari/blob/main/LICENSE)

---

صُنع بـ ❤️ بواسطة **[@SalehGNUTUX](https://github.com/SalehGNUTUX)**
