<div align="center">
  <img src="https://github.com/SalehGNUTUX/matjari/blob/main/Matjari-icon.png?raw=true" alt="Matjari POS Logo" width="256" height="256">
</div>

# متجري | MATJARI POS
### نظام إدارة المبيعات الذكي — v2.9.5 Beta

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://github.com/SalehGNUTUX/matjari/blob/main/LICENSE)
[![Release](https://img.shields.io/badge/Release-v2.9.5--beta-green)](https://github.com/SalehGNUTUX/matjari/releases/tag/matjari-2.9.5-beta)

---

## ⬇️ التحميل المباشر

| المنصة | الملف | SHA-256 | الحجم | الرابط |
|--------|-------|---------|-------|--------|
| 🌐 **Web / PWA** | تشغيل فوري | – | – | [النسخة المباشرة](https://salehgnutux.github.io/matjari/web/) |
| 📱 **Android APK** | `matjari-2.9.5-beta.apk` | `18831b958b0082d5078f8acd7aca8b009900ce4e4a9413e80295048f5ef566f9` | 12.8 MB | [تحميل APK](https://github.com/SalehGNUTUX/matjari/releases/download/matjari-2.9.5-beta/matjari-2.9.5-beta.apk) |
| 🐧 **Linux AppImage (x86_64)** | `Matjari-2.9.5-x86_64.AppImage` | `ff86c427fa6f50a5de618e9e44b1d2015e400ca358effa55d5c79cac51efd13e` | 119 MB | [تحميل AppImage](https://github.com/SalehGNUTUX/matjari/releases/download/matjari-2.9.5-beta/Matjari-2.9.5-x86_64.AppImage) |

> 📦 [جميع ملفات الإصدار](https://github.com/SalehGNUTUX/matjari/releases/tag/matjari-2.9.5-beta)

<details>
<summary>🔐 التحقق من SHA-256</summary>

```
matjari-2.9.5-beta.apk:
18831b958b0082d5078f8acd7aca8b009900ce4e4a9413e80295048f5ef566f9

Matjari-2.9.5-x86_64.AppImage:
ff86c427fa6f50a5de618e9e44b1d2015e400ca358effa55d5c79cac51efd13e
```

```bash
sha256sum matjari-2.9.5-beta.apk
sha256sum Matjari-2.9.5-x86_64.AppImage
```
</details>

---

## 🆕 مستجدات الإصدار 2.9.5

### ✨ مزايا جديدة

| الميزة | التفاصيل |
|--------|---------|
| **أسعار متعددة لكل منتج** | دعم أربعة أنواع من البيع: **تجزئة، جملة، نصف جملة، تقسيط**. يمكن تفعيل أي منها من الإعدادات. |
| **QR مخصص للمنتجات المحلية** | توليد رمز QR خاص بكل منتج، مع إمكانية طباعته ولصقه على المنتج لتسريع البيع لاحقاً. |
| **شعار المتجر في الفواتير** | رفع شعار المتجر (صورة) ليظهر تلقائياً في رأس الفاتورة المطبوعة. |
| **دعم أجهزة المسح الخارجية (HID)** | توافق كامل مع ماسحات الباركود السلكية واللاسلكية (USB/Bluetooth) بدون أي تأخير. |

### 🔧 إصلاحات وتحسينات

| # | المشكلة | الإصلاح |
|---|---------|---------|
| 1 | **توليد QR المنتج لا يعمل في بعض البيئات** | إعادة كتابة دالة `generateProductQR` لتعمل على جميع المنصات (ويب، أندرويد، لينكس). |
| 2 | **اختفاء السلة بعد إتمام البيع** | إعادة تعيين `cart` بشكل صحيح بعد حفظ الفاتورة. |
| 3 | **إظهار أنواع البيع حسب الإعدادات فقط** | تصفية أزرار أنواع البيع في شاشة POS بناءً على `settings.enabledSaleTypes`. |

---

## 📋 نظرة عامة

**متجري** هو نظام نقاط بيع (POS) مفتوح المصدر يعمل على **GNU/Linux** و **Android** و **الويب** — بدون اشتراك، بدون سحابة، بياناتك ملكك.

---

## ✨ المميزات الكاملة

| القسم | الوصف |
|-------|-------|
| 🛒 **نقطة البيع** | مسح باركود (كاميرا + HID خارجي)، سلة مبيعات مع زر نقص سريع، خصومات، طرق دفع متعددة، طباعة فاتورة مع QR تسلسلي. |
| 📦 **المخزون** | بحث محلي ثم خارجي، إضافة مورد سريع، تصوير المنتج، **توليد وطباعة QR للمنتج**، أسعار متعددة (تجزئة/جملة/نصف جملة/تقسيط). |
| 👥 **الزبائن** | نقاط الولاء، سجل المشتريات، القسائم. |
| 🚚 **الموردون** | إدارة الموردين وربطهم بالمنتجات، إضافة سريعة من قسم المخزون. |
| 💳 **الديون** | تتبع ديون الزبائن، تعديل الديون، دفعات جزئية، تنبيهات التأخر. |
| ⭐ **الزكاة** | حاسبة زكاة المال حسب المذاهب الأربعة مع ترتيب صحيح لحقول الثروة. |
| 📊 **لوحة التحكم** | إحصائيات المبيعات، رسوم بيانية، تقارير، تصدير نسخة احتياطية شامل. |
| 🔍 **البحث الشامل** | مسح QR الفاتورة، إعادة طباعة، نظام مرتجعات شامل مع حساب المبلغ المسترد. |
| ⚙️ **الإعدادات** | موظفون، صلاحيات، طابعة حرارية، **شعار المتجر**، لغة، نسخ احتياطي يعمل على Android والحاسوب. |

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

1. حمِّل ملف `matjari-2.9.5-beta.apk`.
2. فعِّل **"تثبيت من مصادر غير معروفة"** في إعدادات الهاتف.
3. افتح الملف وثبِّته.

---

## 🐧 تشغيل Linux AppImage

```bash
chmod +x Matjari-2.9.5-x86_64.AppImage
./Matjari-2.9.5-x86_64.AppImage
```

---

## 🌐 تشغيل النسخة المباشرة (Web)

يمكنك استخدام التطبيق مباشرة من المتصفح دون تثبيت:
👉 [https://salehgnutux.github.io/matjari/web/](https://salehgnutux.github.io/matjari/web/)

> ملاحظة: النسخة المباشرة لا تدعم الطباعة عبر الطابعات الحرارية بشكل كامل مثل التطبيقات الأصلية، لكنها مثالية للتجربة أو الاستخدام الخفيف.

---

## ⚠️ ملاحظات الإصدار التجريبي

| الملاحظة | المنصة | الحالة |
|---------|--------|--------|
| عند أول تشغيل يطلب التطبيق إذن الكاميرا — يجب الموافقة | Android | ✅ تلقائي |
| مسح الباركود مستمر وتلقائي (QR · Code 128 · EAN-13 · وغيرها) | Android | ✅ يعمل |
| حفظ الفاتورة والنسخ الاحتياطية عبر Share sheet | Android | ✅ يعمل |
| دعم أجهزة المسح الخارجية (HID) | جميع المنصات | ✅ يعمل (منذ v2.9.5) |
| طباعة QR المنتج عبر طابعة حرارية | Android / Linux | ✅ يعمل |

---

## 🛠️ البناء من المصدر

### الطريقة الآلية (موصى بها):
```bash
chmod +x build-apk.sh
./build-apk.sh
```

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

---

## 🏗️ التقنيات

`React 18` · `TypeScript` · `Vite 5` · `Tailwind CSS` · `Electron 28` · `Capacitor 6` · `Recharts` · `qrcode.react` · `html5-qrcode` · `jsqr` · `html2canvas`

---

## 📄 الترخيص

[GNU General Public License v3.0](https://github.com/SalehGNUTUX/matjari/blob/main/LICENSE)

---

صُنع بـ ❤️ بواسطة **[@SalehGNUTUX](https://github.com/SalehGNUTUX)**
