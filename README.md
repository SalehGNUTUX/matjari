 متجري | MATJARI POS
### نظام إدارة المبيعات الذكي — v2.9.2 Beta

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://github.com/SalehGNUTUX/matjari/blob/main/LICENSE)
[![Release](https://img.shields.io/badge/Release-v2.9.2--beta-green)](https://github.com/SalehGNUTUX/matjari/releases/tag/Matjari-2.9.2-beta)

---

## ⬇️ التحميل المباشر

| المنصة | الملف | الحجم |
|--------|-------|-------|
| 📱 **Android APK** | [Matjari-app-2.9.2.apk](https://github.com/SalehGNUTUX/matjari/releases/download/Matjari-2.9.2-beta/Matjari-app-2.9.2.apk) | — |
| 🐧 **Linux AppImage (x86_64)** | [Matjari-2.9.2-x86_64.AppImage](https://github.com/SalehGNUTUX/matjari/releases/download/Matjari-2.9.2-beta/Matjari-2.9.2-x86_64.AppImage) | — |

> 📦 [جميع ملفات الإصدار](https://github.com/SalehGNUTUX/matjari/releases/tag/Matjari-2.9.2-beta)

---

## 🆕 مستجدات الإصدار 2.9.2

### 🔧 إصلاحات جوهرية

| # | المشكلة | الإصلاح |
|---|---------|---------|
| 1 | **نافذة الكاميرا شفافة** | خلفية سوداء صلبة (`#000000`) بدلاً من `bg-black/92` لضمان وضوح واجهة المسح |
| 2 | **رابط GitHub يفتح داخل التطبيق** | إضافة `import { openExternalLink }` المفقود في `Settings.tsx` لفتح الروابط في المتصفح الخارجي |
| 3 | **الآلة الحاسبة تكتب الرقم مرتين** | استبدال `onClick` + `onTouchStart` بـ `onPointerDown` مع `preventDefault()` لمنع التنفيذ المزدوج على شاشات اللمس |
| 4 | **حفظ الصورة لا يعمل على Android 10+** | استخدام `Directory.Cache` + `Share.share` بدلاً من `ExternalStorage` الذي أصبح مقيداً في الإصدارات الحديثة |
| 5 | **QR يحمل كامل بيانات الفاتورة** | استبدال QR Code بـ **باركود Code 128** يحمل الرقم التسلسلي فقط (`MTJR-XXXXXX`) لسهولة المسح والبحث |
| 6 | **معاينة الفاتورة** | استبدال `<QRCodeSVG>` بمكوّن `<InvoiceBarcode>` في كل من شاشة البيع و ReprintModal |
| 7 | **HTML المطبوع** | تضمين الباركود كـ SVG نصي مباشرة في HTML المُولَّد بدون الحاجة لالتقاط DOM |

### ✨ مزايا جديدة

| الميزة | التفاصيل |
|--------|---------|
| **مكوّن باركود مخصص** | إنشاء `InvoiceBarcode.tsx` لتوليد باركود **Code 128** أفقي خفيف الوزن بدون مكتبات خارجية |
| **رقم تسلسلي موحد** | توليد رقم تسلسلي للفاتورة بصيغة `MTJR-XXXXXX` يُستخدم كمعرّف فريد وللباركود |
| **بحث متوافق** | `SearchHub.handleQRScan` يتعامل مع الباركود الجديد: يبحث مباشرة عن الرقم التسلسلي عند المسح |
| **سكريبت بناء آلي** | إضافة `build-apk.sh` لبناء APK خطوة بخطوة مع التحقق من الأخطاء وتقرير مفصل |

---

## 📋 نظرة عامة

**متجري** نظام نقطة بيع (POS) مفتوح المصدر يعمل على **GNU/Linux** و**Android** — بدون اشتراك، بدون سحابة، بياناتك ملكك.

---

## ✨ المميزات الكاملة

| القسم | الوصف |
|-------|-------|
| 🛒 **نقطة البيع** | مسح باركود، سلة مبيعات، خصومات، طرق دفع متعددة، طباعة فاتورة + باركود |
| 📦 **المخزون** | إضافة/تعديل منتجات، جلب معلومات تلقائي عبر الباركود |
| 👥 **الزبائن** | نقاط الولاء، سجل المشتريات، القسائم |
| 🚚 **الموردون** | إدارة الموردين وربطهم بالمنتجات |
| 💳 **الديون** | تتبع ديون الزبائن، دفعات جزئية، تنبيهات التأخر |
| ⭐ **الزكاة** | حاسبة زكاة المال حسب المذاهب الأربعة |
| 📊 **لوحة التحكم** | إحصائيات المبيعات، رسوم بيانية، تقارير |
| 🔍 **البحث الشامل** | البحث في المبيعات، مسح باركود، إعادة طباعة، معالجة المرتجعات |
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

1. حمِّل ملف `Matjari-app-2.9.2.apk`
2. فعِّل **"تثبيت من مصادر غير معروفة"** في إعدادات الهاتف
3. افتح الملف وثبِّته

---

## 🐧 تشغيل Linux AppImage

```bash
chmod +x Matjari-2.9.2-x86_64.AppImage
./Matjari-2.9.2-x86_64.AppImage
```

---

## ⚠️ حالة الإصدار التجريبي

| المشكلة | المنصة | الحالة |
|---------|--------|--------|
| صلاحيات الكاميرا والتخزين في إعدادات النظام | Android | 🔧 قيد التحسين |
| مسح الباركود مباشرة من كاميرا Android | Android | ✅ يعمل عبر التقاط الصورة وتحليلها |

---

## 🛠️ البناء من المصدر

### الطريقة اليدوية:
```bash
npm install
npx cap add android
npm run patch-android
node scripts/generate-android-icons.js
npm run build:web
npx cap sync android
cd android && ./gradlew assembleDebug
```

### الطريقة الآلية (موصى بها):
```bash
chmod +x build-apk.sh
./build-apk.sh
```

السكريبت الآلي يقوم ببناء التطبيق خطوة بخطوة مع:
- التحقق من نجاح كل أمر قبل الانتقال للتالي
- عرض تقرير مفصل بالألوان
- إيقاف العمل فور حدوث أي خطأ مع توضيح سببه

---

## 🏗️ التقنيات

`React 18` · `TypeScript` · `Vite 5` · `Tailwind CSS` · `Electron 28` · `Capacitor 6` · `Recharts` · `jsbarcode` · `jsqr` · `html2canvas`

---

## 📄 الترخيص

[GNU General Public License v3.0](https://github.com/SalehGNUTUX/matjari/blob/main/LICENSE)

---

صُنع بـ ❤️ بواسطة **[@SalehGNUTUX](https://github.com/SalehGNUTUX)**
