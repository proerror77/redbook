export function isTransientBridgeError(message = '') {
  const text = String(message || '');
  return text.includes('Inspected target navigated or closed')
    || isBridgeUnavailableError(text);
}

export function isBridgeUnavailableError(message = '') {
  const text = String(message || '');
  return text.includes('Browser Bridge not connected')
    || text.includes('Extension not connected')
    || text.includes('Extension ✗ not connected')
    || text.includes('[MISSING] Extension: not connected');
}

export function parseDoctorOutput(raw = '') {
  const text = String(raw || '');
  const daemonOk = text.includes('[OK] Daemon:');
  const extensionOk = text.includes('[OK] Extension:');
  const connectivityOk = text.includes('[OK] Connectivity:');

  return {
    daemonOk,
    extensionOk,
    connectivityOk,
    healthy: daemonOk && extensionOk && connectivityOk,
    text,
  };
}

export function summarizeDoctorFailure(raw = '', exitCode = 0) {
  const parsed = parseDoctorOutput(raw);
  if (parsed.healthy && exitCode === 0) {
    return 'doctor reported healthy';
  }

  if (isBridgeUnavailableError(parsed.text)) {
    return 'Browser Bridge 未连接。请先在主 Chrome 加载并启用 opencli Browser Bridge 扩展，然后再重跑 verify。';
  }

  const trimmed = parsed.text.trim();
  if (trimmed) {
    return trimmed;
  }

  return exitCode === 0 ? 'doctor returned exit 0 but did not report healthy connectivity' : `exit ${exitCode}`;
}
