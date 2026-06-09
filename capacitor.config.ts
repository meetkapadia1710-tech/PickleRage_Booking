import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.playhub.app',
  appName: 'playhub',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      backgroundColor: '#00342b',
      style: 'DARK'
    }
  }
};

export default config;
