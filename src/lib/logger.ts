/**
 * Structured application logger.
 *
 * In development  → all levels forwarded to console with a [PlayHub] tag.
 * In production   → only warn/error are forwarded; log/info are silenced.
 */

const PREFIX = '[PlayHub]';
const IS_DEV = import.meta.env.DEV;

export const logger = {
  log:   (...args: unknown[]) => { if (IS_DEV) console.log(PREFIX, ...args); },
  info:  (...args: unknown[]) => { if (IS_DEV) console.info(PREFIX, ...args); },
  warn:  (...args: unknown[]) => console.warn(PREFIX, ...args),
  error: (...args: unknown[]) => console.error(PREFIX, ...args),
} as const;
