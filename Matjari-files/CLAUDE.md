# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Matjari (متجري)** is an Arabic-first POS (Point of Sale) system built with React + TypeScript + Vite. It runs on three platforms from the same codebase:
- **Web/PWA** — browser-based with Service Worker offline support
- **Linux AppImage** — via Electron (`main.js` + `preload.js`)
- **Android APK** — via Capacitor (`src/capacitor-bridge.ts`)

## Build Commands

```bash
# Development server
npm run dev

# Type-check only (known pre-existing TS errors in Settings.tsx, Suppliers.tsx, App.tsx — ignore them)
npx tsc --noEmit --skipLibCheck

# Web build (skips TS errors) — use this for quick iteration
npm run build:web          # → dist/

# Full build with type check + web
npm run build              # tsc --noEmit --skipLibCheck && vite build

# Android APK (all-in-one script)
bash build-apk.sh          # → android/app/build/outputs/apk/debug/app-debug.apk

# Manual Android steps
npm run build:web && npx cap sync android
cd android && ./gradlew assembleDebug

# Linux AppImage
npm run package:linux      # → dist_electron/

# Electron dev mode
npm run electron:dev
```

## Architecture

### Data Flow
All state lives in `App.tsx` and is persisted to `localStorage`. There is **no backend or database** — everything is client-side only. State is loaded on startup via `loadFromStorage()` and auto-saved via `useEffect` hooks watching each state slice.

Key state slices: `products`, `sales`, `customers`, `suppliers`, `debts`, `zakatRecords`, `settings`, `users`, `cart`, `employeeSessions`.

### Platform Abstraction Layer
`src/capacitor-bridge.ts` is the single file that handles platform differences. It exports `printOrShare()`, `saveImage()`, `requestCameraPermission()`, `openExternalLink()`. Platform detection uses `window.Capacitor` (Android) and `window.electronAPI` (Electron). All components import only from this bridge, never from Capacitor/Electron directly.

On Android, `printOrShare()` converts the receipt DOM element to PNG via `html2canvas` then shares via `@capacitor/share`. On Electron, it sends HTML to `main.js` via IPC. On web/PWA it opens a Blob URL in a new window.

### Translations (`i18n.ts`)
Three languages: `Language.AR` (Arabic, RTL), `Language.EN`, `Language.FR`. The `translations` object is keyed by `Language` enum. Components receive the current language's translation object as prop `t`. The active translation is resolved in `App.tsx` as `translations[settings.interfaceLanguage]` and passed down.

**Critical:** All translation keys for a language must be inside their `[Language.XX]: { ... }` block. Keys placed outside these blocks appear as top-level properties of `translations` and are never resolved via `t.key`. All new string props use inline fallbacks (`t.my_key || 'Arabic fallback'`) so `i18n.ts` edits are optional.

### Routing
No router library. Navigation is a single `activeTab` string in `App.tsx`. The `Layout` component renders the nav and passes `setActiveTab`. Each page component is rendered conditionally based on `activeTab`.

### Sale Types (`SaleTypeKey`)
Products have four optional price fields: `price` (retail — always required), `priceWholesale?`, `priceHalfWholesale?`, `priceInstallment?`. The POS selects which price to use when adding to cart based on the current `saleType` state. `settings.enabledSaleTypes` controls which types are shown in POS.

**Price validation:** `addToCart()` and the HID scanner both check that the product has the corresponding price field set before adding to cart; if not, they show a `localError` and return without adding. This prevents cart items with `price = undefined` or price fallen back to retail when the user explicitly chose a non-retail type.

### CartItem Identity
Cart items are identified by `cartKey = "${product.id}_${saleType}"`, not just `id`. This enables mixed-type carts (same product at retail and wholesale simultaneously). All cart operations (`removeFromCart`, `removeOneFromCart`, quantity updates, price edits) must use `cartKey`, not `id`.

### Cart Price Editing
When `settings.allowCartPriceEdit` is `true` and `currentUser.role === 'admin'`, an ✏️ icon appears next to each cart item's price. Clicking it shows an inline `<input>` that updates the cart price live on every keystroke (so totals recalculate in real-time). `onBlur`/Enter confirms, Escape reverts. The setting is toggled in Settings → أنواع البيع section.

### HID Barcode Scanner
`POS.tsx` has a `keydown` listener for USB/Bluetooth external scanners. It uses refs (`hidProductsRef`, `hidSaleTypeRef`, `hidSetCartRef`) to avoid stale closures — the effect has **empty deps** and reads all mutable values through refs. The scanner detects rapid key sequences (< 200ms between chars) as barcode input and handles both `Enter`/`Tab` terminators and no-terminator scanners (auto-processes after 100ms silence for codes ≥ 8 chars). The price-validation logic is duplicated inside the HID handler (same rules as `addToCart`).

### Receipt System
`generateReceiptHTML()` in `POS.tsx` produces size-aware HTML for printing. Four sizes are supported via `settings.receiptSize: ReceiptSize`:

| Value | Paper | Layout |
|---|---|---|
| `'thermal'` | 80mm roll | Compact 3-col table; sale type under product name |
| `'thermal58'` | 58mm roll | Same but tighter fonts/truncation |
| `'A5'` | A5 sheet | 5-col table with sale type badge column, info grid, totals block aligned right |
| `'A4'` | A4 sheet | Same as A5 but larger fonts and totals block |

The React receipt preview modal adapts its width (`max-w-sm` for thermal, `max-w-xl`/`max-w-2xl` for A5/A4) and renders the same data using JSX. For Android, `printOrShare()` screenshots the preview DOM — so the JSX preview and the HTML must stay in sync visually.

The QR code (`QRCodeSVG`, id `receipt-qr-svg`) is always centered at the bottom. `captureQRDataUrl()` serializes the SVG to a base64 data URL for embedding in the print HTML.

### Android-specific
- `android-patches/MainActivity.java` replaces the generated file after `cap sync` — `build-apk.sh` handles this automatically.
- The camera scanner (`BarcodeScanner.tsx`) uses `Html5Qrcode.start()` which correctly handles Capacitor WebView camera permissions.

### Electron-specific
`main.js` handles IPC for print (writes HTML to temp file, opens with `xdg-open`/system browser) and file save dialogs. The preload script (`preload.js`) exposes `window.electronAPI`. Linux builds use SwiftShader to avoid GPU issues in AppImage.

## Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Root component: all state, persistence, auth, sale completion logic |
| `types.ts` | All TypeScript interfaces — source of truth for data shapes |
| `i18n.ts` | All UI strings for AR/EN/FR |
| `components/POS.tsx` | POS screen: cart, sale types, HID scanner, checkout, receipt generation & preview |
| `components/Settings.tsx` | All settings including sale type toggles and `allowCartPriceEdit` toggle |
| `src/capacitor-bridge.ts` | Platform abstraction (Android/Electron/Web) |
| `build-apk.sh` | Full Android build script with patch application |
| `android-patches/` | Post-`cap sync` patches (MainActivity.java) |

## AppSettings Notable Fields

Fields that are not obvious from their name:
- `enabledSaleTypes` — which of the 4 sale type buttons appear in POS
- `allowCartPriceEdit` — enables admin inline price editing per cart item
- `receiptSize` — `'thermal' | 'thermal58' | 'A5' | 'A4'`; drives both print HTML layout and preview modal width
- `interfaceLanguage` — drives `isRTL` flag in components (separate from `receiptLanguage`)
- `loyaltyRate` — points earned per 100 currency units spent

## Known Pre-existing TypeScript Errors

Always use `npm run build:web` (skips TS check) for verification:
- `App.tsx` — `INITIAL_SETTINGS` shape mismatch with `AppSettings` interface
- `components/Settings.tsx` — `UserRole` narrowing issues
- `components/Suppliers.tsx` — `Supplier` type missing optional fields
- `components/BarcodeScanner.tsx` — `formatsToSupport` not in html5-qrcode types
- `components/fonts.ts` — missing font asset type declarations
