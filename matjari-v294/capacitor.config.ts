import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.matjari.pos',
  appName: 'Matjari',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // فقط النطاقات المعتمدة للبحث عن المنتجات وخدمات Capacitor
    allowNavigation: [
      'world.openfoodfacts.org',
      'world.openbeautyfacts.org',
      'world.openproductsfacts.org',
      'world.openpetfoodfacts.org',
      'api.allorigins.win',
      'go-upc.com',
    ]
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0f1a',
    minWebViewVersion: 60
  },
  plugins: {
    Camera: { permissions: ['camera'] },
    Filesystem: { permissions: ['publicStorage'] },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#0a0f1a',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0a0f1a'
    }
  }
};

export default config;
