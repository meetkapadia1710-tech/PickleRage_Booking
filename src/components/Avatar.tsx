import { useState } from 'react';

const PALETTE = [
  ['#00342b', '#0a6b58'],
  ['#4a2b8f', '#7c5cc4'],
  ['#8f4a2b', '#c47c5c'],
  ['#2b5e8f', '#5c9ac4'],
  ['#7a2b50', '#b85c86'],
  ['#5e6e1f', '#93a548'],
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join('');
}

function paletteFor(seed: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length] as [string, string];
}

/**
 * User avatar that falls back to deterministic initials when the photo is
 * missing or fails to load (e.g. expired Google photo URLs).
 */
export default function Avatar({
  name,
  photoURL,
  size = 40,
  className = '',
}: {
  name: string;
  photoURL?: string;
  size?: number;
  className?: string;
}) {
  // Track which URL failed so a changed photoURL automatically retries.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const showImage = !!photoURL && failedSrc !== photoURL;
  const [from, to] = paletteFor(name);

  if (showImage) {
    return (
      <img
        src={photoURL}
        alt={name}
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(photoURL ?? null)}
        className={`rounded-full object-cover bg-surface-container shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={`rounded-full flex items-center justify-center shrink-0 text-white font-bold select-none ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
    >
      {initialsOf(name)}
    </div>
  );
}
