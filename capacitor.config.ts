
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.matjari.pos',
  appName: 'MATJARI',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
