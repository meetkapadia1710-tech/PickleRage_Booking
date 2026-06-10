import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.playhub.app',
  appName: 'playhub',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      backgroundColor: '#00342b',
      style: 'DARK'
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '21785967034-v32c2s1gdnvnm9j8clnc2utg8gbd8ahn.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
