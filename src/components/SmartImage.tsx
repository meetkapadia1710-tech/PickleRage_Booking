import { useState } from 'react';
import type { ReactNode } from 'react';

type LoadState = 'loading' | 'loaded' | 'error';

/**
 * Banner image that adapts its own height to the image's natural aspect ratio,
 * so the whole picture is always visible — swap the image URL and the banner
 * re-measures automatically.
 *
 * Ratios beyond [minRatio, maxRatio] are letterboxed against a blurred copy of
 * the same image instead of cropping, keeping cards from growing absurdly tall
 * or short while still showing the full photo.
 */
export default function SmartImage({
  src,
  alt,
  className = '',
  minRatio = 4 / 5,
  maxRatio = 21 / 9,
  fallbackRatio = 16 / 9,
  children,
}: {
  src?: string;
  alt: string;
  className?: string;
  /** Tallest allowed banner (width / height). */
  minRatio?: number;
  /** Widest allowed banner (width / height). */
  maxRatio?: number;
  /** Ratio used while loading or when the image fails. */
  fallbackRatio?: number;
  /** Overlays (gradients, chips) rendered above the image. */
  children?: ReactNode;
}) {
  const [state, setState] = useState<LoadState>(src ? 'loading' : 'error');
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);

  // Re-measure whenever the image source changes (e.g. edited in the admin panel).
  const [prevSrc, setPrevSrc] = useState(src);
  if (prevSrc !== src) {
    setPrevSrc(src);
    setState(src ? 'loading' : 'error');
    setNaturalRatio(null);
  }

  const displayRatio =
    naturalRatio !== null
      ? Math.min(Math.max(naturalRatio, minRatio), maxRatio)
      : fallbackRatio;
  const letterboxed =
    naturalRatio !== null && (naturalRatio < minRatio || naturalRatio > maxRatio);

  return (
    <div
      className={`relative w-full overflow-hidden bg-surface-container ${className}`}
      style={{ aspectRatio: `${displayRatio}` }}
    >
      {state === 'error' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-outline bg-surface-container-low">
          <span className="material-symbols-outlined text-[40px]">image_not_supported</span>
          <span className="text-[12px] font-medium">Image unavailable</span>
        </div>
      ) : (
        <>
          {state === 'loading' && (
            <div className="absolute inset-0 animate-pulse bg-surface-container-high" />
          )}
          {letterboxed && state === 'loaded' && (
            <img
              src={src}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-50"
            />
          )}
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onLoad={e => {
              const img = e.currentTarget;
              if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                setNaturalRatio(img.naturalWidth / img.naturalHeight);
              }
              setState('loaded');
            }}
            onError={() => setState('error')}
            className={`relative w-full h-full ${letterboxed ? 'object-contain' : 'object-cover'} transition-opacity duration-500 ${state === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
          />
        </>
      )}
      {children}
    </div>
  );
}
