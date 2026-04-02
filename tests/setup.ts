// Jest setup for browser-like APIs used in stores/helpers.
if (typeof globalThis.atob !== 'function') {
  globalThis.atob = (b64) => Buffer.from(String(b64), 'base64').toString('binary');
}

if (typeof globalThis.btoa !== 'function') {
  globalThis.btoa = (bin) => Buffer.from(String(bin), 'binary').toString('base64');
}

// Avoid "not implemented" errors when tests touch window.open.
if (typeof window !== 'undefined' && typeof window.open !== 'function') {
  window.open = () => null;
}

