import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App.tsx'

// Lets CSS target the APK (`native:` variant) — e.g. to drop backdrop-blur,
// which the Android WebView re-renders on every scroll frame.
if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('platform-native')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
