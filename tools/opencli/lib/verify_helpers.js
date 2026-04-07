export function isTransientBridgeError(message = '') {
  const text = String(message || '');
  return text.includes('Extension not connected')
    || text.includes('Inspected target navigated or closed');
}
