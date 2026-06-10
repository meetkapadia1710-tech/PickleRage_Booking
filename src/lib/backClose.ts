/**
 * Registry of currently-open overlays (bottom sheets, dialogs, panels) so the
 * Android back gesture closes the top-most one instead of navigating the page
 * behind it. Platform-neutral: registering is harmless on the website — only
 * the APK's back handler (src/native/androidBack.ts) ever consumes the stack.
 */
import { useEffect, useRef } from 'react';

type Closer = () => void;

const stack: Closer[] = [];

function pushBackCloser(close: Closer): () => void {
  stack.push(close);
  return () => {
    const i = stack.lastIndexOf(close);
    if (i !== -1) stack.splice(i, 1);
  };
}

/** Closes the top-most open overlay. Returns false if none is open. */
export function closeTopOverlay(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top();
  return true;
}

/**
 * Call from any dismissible overlay. While `open` is true, the Android back
 * gesture calls `onClose` (top-most overlay first) instead of navigating.
 *
 *   useAndroidBackClose(open, onClose);
 */
export function useAndroidBackClose(open: boolean, onClose: Closer): void {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    return pushBackCloser(() => onCloseRef.current());
  }, [open]);
}
