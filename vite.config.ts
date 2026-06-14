import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // The app is wrapped in Capacitor (Android). A precaching service worker
      // caches index.html + hashed bundles in the WebView's storage, which
      // survives APK reinstalls and keeps serving the OLD UI after every build.
      // selfDestroying ships a SW that unregisters itself and clears all caches,
      // so the app always loads the freshly-built assets from disk.
      selfDestroying: true,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'PlayHub Booking',
        short_name: 'PlayHub',
        description: 'Book premium Pickleball and Box Cricket courts.',
        theme_color: '#00342b',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          }
        ]
      }
    })
  ],
  server: {
    port: 5001,
  },
});
