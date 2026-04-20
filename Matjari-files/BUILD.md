# دليل بناء وتحزيم Matjari | متجري

## المتطلبات

### لبناء AppImage (لينكس)
```bash
# Node.js 18+ و npm 9+
node --version  # >= 18
npm --version   # >= 9

# تثبيت الاعتمادية
npm install

# بناء AppImage
npm run package:linux
# المخرج: dist_electron/Matjari-2.0.0-x64.AppImage
```

### تشغيل الـ AppImage
```bash
chmod +x Matjari-*.AppImage
./Matjari-*.AppImage
```

---

## بناء APK للأندرويد

### المتطلبات
- Java JDK 17+
- Android Studio أو Android SDK (مع build-tools 34+)
- متغير البيئة `ANDROID_HOME` أو `ANDROID_SDK_ROOT`

### الخطوات

```bash
# 1. تثبيت الاعتمادية
npm install

# 2. بناء الويب
npm run build:web

# 3. مزامنة Capacitor
npx cap sync android

# 4a. فتح Android Studio وبناء من هناك (الأسهل)
npx cap open android

# 4b. أو بناء من سطر الأوامر
cd android
./gradlew assembleDebug
# المخرج: android/app/build/outputs/apk/debug/app-debug.apk

# للنسخة الإصدارية (Release APK)
./gradlew assembleRelease
```

### توقيع APK للنشر
```bash
# إنشاء keystore
keytool -genkey -v -keystore matjari.keystore -alias matjari -keyalg RSA -keysize 2048 -validity 10000

# بناء موقّع
cd android
./gradlew bundleRelease
# أو
./gradlew assembleRelease -Pandroid.injected.signing.store.file=../matjari.keystore \
  -Pandroid.injected.signing.store.password=YOUR_PASS \
  -Pandroid.injected.signing.key.alias=matjari \
  -Pandroid.injected.signing.key.password=YOUR_PASS
```

---

## البناء للويب (PWA)

```bash
npm run build:web
# المخرج في: dist/
# يمكن نشره على أي خادم HTTP
# يعمل بدون إنترنت بفضل Service Worker
```

---

## هيكل المشروع

```
Matjari/
├── main.js              # Electron main process
├── preload.js           # Electron preload script
├── index.html           # نقطة دخول HTML
├── index.tsx            # نقطة دخول React
├── App.tsx              # المكون الجذري
├── types.ts             # أنواع TypeScript
├── i18n.ts              # ملفات الترجمة
├── vite.config.ts       # إعداد Vite
├── tailwind.config.js   # إعداد Tailwind CSS
├── capacitor.config.ts  # إعداد Capacitor (Android)
├── package.json         # الاعتمادية وسكريبتات البناء
├── public/
│   ├── fonts/           # خطوط Ubuntu Arabic (محلي - بدون إنترنت)
│   ├── sw.js            # Service Worker للعمل بدون إنترنت
│   ├── manifest.json    # PWA manifest
│   └── icon.png         # أيقونة التطبيق
├── components/
│   ├── POS.tsx          # نقطة البيع
│   ├── Dashboard.tsx    # لوحة التحكم
│   ├── Inventory.tsx    # إدارة المخزون
│   ├── Customers.tsx    # إدارة الزبائن
│   ├── Suppliers.tsx    # إدارة الموردين
│   ├── Debts.tsx        # إدارة الديون ✨جديد
│   ├── Zakat.tsx        # حاسبة الزكاة ✨جديد
│   ├── Calculator.tsx   # آلة حاسبة ✨جديد
│   ├── BarcodeScanner.tsx # ماسح الباركود ✨جديد
│   ├── SearchHub.tsx    # البحث الشامل + المرتجعات
│   ├── Settings.tsx     # الإعدادات
│   ├── Login.tsx        # تسجيل الدخول
│   └── Layout.tsx       # التخطيط (متوافق مع الهاتف)
└── src/
    └── capacitor-bridge.ts  # جسر Android/Electron
```

---

## الميزات الجديدة في النسخة 2.0

| الميزة | الوصف |
|--------|-------|
| 📱 **توافقية الهاتف** | تشريط سفلي، تصميم متجاوب كامل |
| 💳 **إدارة الديون** | تتبع ديون الزبائن، مدفوعات جزئية |
| ⭐ **حاسبة الزكاة** | المذاهب الأربعة، تذكير بالحول |
| 🧮 **آلة حاسبة** | دعم اللمس، ذاكرة، تكامل مع المبيعات |
| 📷 **ماسح محسّن** | كاميرا الهاتف، تبديل الكاميرات، إدخال يدوي |
| 🔄 **مرتجعات** | مسح QR الفاتورة أو بحث يدوي |
| 👥 **تتبع الموظفين** | وقت تسجيل الدخول، الإنتاجية اليومية |
| 🖨️ **طباعة محسّنة** | دعم الطابعات الحرارية 58/80mm |
| 📴 **بدون إنترنت** | Service Worker، خطوط محلية |
| 📱 **AppImage + APK** | جاهز للتحزيم لأنظمة لينكس وأندرويد |
