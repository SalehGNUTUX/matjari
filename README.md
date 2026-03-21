# متجري | MATJARI POS
### نظام إدارة المبيعات الذكي — v2.9.0 Beta

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://github.com/SalehGNUTUX/matjari/blob/main/LICENSE)
[![Release](https://img.shields.io/badge/Release-v2.9.0--beta-green)](https://github.com/SalehGNUTUX/matjari/releases/tag/Matjari-2.9.0)

---

## ⬇️ التحميل المباشر

| المنصة | الملف | الحجم |
|--------|-------|-------|
| 📱 **Android APK** | [Matjari-2.9.0-beta.apk](https://github.com/SalehGNUTUX/matjari/releases/download/Matjari-2.9.0/Matjari-2.9.0-beta.apk) | 7.5 MB |
| 🐧 **Linux AppImage (x86_64)** | [Matjari-2.9.0-beta-x86_64.AppImage](https://github.com/SalehGNUTUX/matjari/releases/download/Matjari-2.9.0/Matjari-2.9.0-beta-x86_64.AppImage) | 109.6 MB |

> 📦 [جميع ملفات الإصدار](https://github.com/SalehGNUTUX/matjari/releases/tag/Matjari-2.9.0)

---

## 📋 نظرة عامة

**متجري** نظام نقطة بيع (POS) مفتوح المصدر، مبني بـ React + TypeScript، يعمل على:
- 🖥️ **سطح المكتب** — Linux AppImage
- 📱 **Android** — APK
- 🌐 **المتصفح / PWA** — بدون تثبيت

البيانات تُحفظ محلياً — **لا سحابة، لا إنترنت مطلوب للعمل**.

---

## ✨ المميزات

| القسم | الوصف |
|-------|-------|
| 🛒 **نقطة البيع** | مسح باركود، سلة مبيعات، خصومات، طباعة فاتورة + QR |
| 📦 **المخزون** | إضافة/تعديل منتجات، جلب معلومات تلقائي عبر الباركود |
| 👥 **الزبائن** | نقاط الولاء، سجل المشتريات، القسائم |
| 🚚 **الموردون** | إدارة الموردين وربطهم بالمنتجات |
| 💳 **الديون** | تتبع ديون الزبائن، دفعات جزئية، تنبيهات التأخر |
| ⭐ **الزكاة** | حاسبة زكاة المال حسب المذاهب الأربعة |
| 📊 **لوحة التحكم** | إحصائيات المبيعات، رسوم بيانية، تقارير |
| 🔍 **البحث الشامل** | البحث في المبيعات، مسح QR، معالجة المرتجعات |
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

1. حمِّل ملف `Matjari-2.9.0-beta.apk`
2. فعِّل **"تثبيت من مصادر غير معروفة"** في إعدادات الهاتف
3. افتح الملف وثبِّته

---

## 🐧 تشغيل Linux AppImage

```bash
chmod +x Matjari-2.9.0-beta-x86_64.AppImage
./Matjari-2.9.0-beta-x86_64.AppImage
```

---

## ⚠️ حالة الإصدار التجريبي

الميزات الأساسية تعمل بشكل مستقر. المشاكل التالية قيد الحل:

| المشكلة | المنصة | الحالة |
|---------|--------|--------|
| صلاحيات الكاميرا والتخزين في إعدادات النظام | Android | 🔧 قيد الحل |
| الطباعة المباشرة لتطبيقات الطابعة | Android | 🔧 قيد الحل — يعمل عبر المشاركة حالياً |
| انهيار البرنامج عند الطباعة | Linux AppImage | ✅ مُصلَح |

---

## 🛠️ البناء من المصدر

```bash
npm install
npm run dev                    # وضع التطوير

# AppImage
npm run build:web && npm run package:linux

# APK
node scripts/generate-android-icons.js
npm run build:web && npx cap sync android
cd android && ./gradlew assembleDebug
```

---

## 🏗️ التقنيات

`React 18` · `TypeScript` · `Vite 5` · `Tailwind CSS` · `Electron 28` · `Capacitor 6` · `Recharts` · `html5-qrcode`

---

## 📄 الترخيص

[GNU General Public License v3.0](https://github.com/SalehGNUTUX/matjari/blob/main/LICENSE)

---

صُنع بـ ❤️ بواسطة **[@SalehGNUTUX](https://github.com/SalehGNUTUX)**
