const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const moduleCache = new Map();

function resolveGlobalOpencliPackageDir() {
  if (process.env.OPENCLI_PACKAGE_DIR) {
    return process.env.OPENCLI_PACKAGE_DIR;
  }

  const result = spawnSync('npm', ['root', '-g'], {
    encoding: 'utf8',
  });
  if (result.error || result.status !== 0) {
    return null;
  }

  return path.join(result.stdout.trim(), '@jackwener/opencli');
}

function resolveVendorOpencliPackageDir() {
  return path.resolve(
    __dirname,
    '..',
    '..',
    'opencli',
    'vendor',
    '@jackwener',
    'opencli'
  );
}

function resolveBossCoreModulePath(moduleName) {
  const relativePath = path.join('dist', 'shared', 'boss', `${moduleName}.cjs`);
  const candidates = [
    resolveGlobalOpencliPackageDir(),
    resolveVendorOpencliPackageDir(),
  ].filter(Boolean);

  for (const packageDir of candidates) {
    const modulePath = path.join(packageDir, relativePath);
    if (fs.existsSync(modulePath)) {
      return modulePath;
    }
  }

  throw new Error(
    `Could not resolve opencli boss core module "${moduleName}". ` +
      'Run `node tools/opencli/scripts/install.js` or ensure vendor patches are present.'
  );
}

function requireBossCoreModule(moduleName) {
  const modulePath = resolveBossCoreModulePath(moduleName);
  if (!moduleCache.has(modulePath)) {
    moduleCache.set(modulePath, require(modulePath));
  }
  return moduleCache.get(modulePath);
}

module.exports = {
  requireBossCoreModule,
  resolveBossCoreModulePath,
  resolveGlobalOpencliPackageDir,
  resolveVendorOpencliPackageDir,
};
