import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const expectedOpencliVersion = '1.6.8';
export const opencliToolsDir = path.resolve(__dirname, '..');
export const repoRoot = path.resolve(opencliToolsDir, '..', '..');
export const dataDir = path.join(opencliToolsDir, 'data');
export const browserBridgeDataDir = path.join(dataDir, 'browser-bridge');
export const lockFilePath = path.join(dataDir, 'browser.lock');
export const patchStampFileName = '.redbook-opencli-patches.json';
export const backupDirName = '.redbook-opencli-backup';
export const manifestPatchEntriesPath = path.join(
  opencliToolsDir,
  'vendor/@jackwener/opencli/dist/cli-manifest.redbook.json'
);
export const opencliReleaseBaseUrl = 'https://github.com/jackwener/opencli/releases/download';

export const replacementFiles = [
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/src/clis/boss/_helpers.ts'
    ),
    target: 'src/clis/boss/_helpers.ts',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/src/clis/boss/apply.ts'
    ),
    target: 'src/clis/boss/apply.ts',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/src/clis/boss/chat-list.ts'
    ),
    target: 'src/clis/boss/chat-list.ts',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/src/clis/boss/chat-thread.ts'
    ),
    target: 'src/clis/boss/chat-thread.ts',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/src/clis/boss/send-message.ts'
    ),
    target: 'src/clis/boss/send-message.ts',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/src/clis/boss/send-resume.ts'
    ),
    target: 'src/clis/boss/send-resume.ts',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/src/clis/xiaohongshu/search.ts'
    ),
    target: 'src/clis/xiaohongshu/search.ts',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/src/clis/xiaohongshu/creator-notes.ts'
    ),
    target: 'src/clis/xiaohongshu/creator-notes.ts',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/src/clis/twitter/search.ts'
    ),
    target: 'src/clis/twitter/search.ts',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/dist/clis/xiaohongshu/search.js'
    ),
    target: 'dist/clis/xiaohongshu/search.js',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/dist/clis/xiaohongshu/creator-notes.js'
    ),
    target: 'dist/clis/xiaohongshu/creator-notes.js',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/dist/clis/twitter/search.js'
    ),
    target: 'dist/clis/twitter/search.js',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/dist/shared/boss/common.cjs'
    ),
    target: 'dist/shared/boss/common.cjs',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/dist/shared/boss/site-health.cjs'
    ),
    target: 'dist/shared/boss/site-health.cjs',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/dist/shared/boss/apply-flow.cjs'
    ),
    target: 'dist/shared/boss/apply-flow.cjs',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/dist/shared/boss/hooks.cjs'
    ),
    target: 'dist/shared/boss/hooks.cjs',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/dist/shared/boss/result-model.cjs'
    ),
    target: 'dist/shared/boss/result-model.cjs',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/dist/shared/boss/chat-history.cjs'
    ),
    target: 'dist/shared/boss/chat-history.cjs',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/dist/shared/boss/chat-core.cjs'
    ),
    target: 'dist/shared/boss/chat-core.cjs',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/dist/shared/boss/chat-browser.cjs'
    ),
    target: 'dist/shared/boss/chat-browser.cjs',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/dist/shared/boss/job-browser.cjs'
    ),
    target: 'dist/shared/boss/job-browser.cjs',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/dist/clis/boss/_helpers.js'
    ),
    target: 'dist/clis/boss/_helpers.js',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/dist/clis/boss/apply.js'
    ),
    target: 'dist/clis/boss/apply.js',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/dist/clis/boss/chat-list.js'
    ),
    target: 'dist/clis/boss/chat-list.js',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/dist/clis/boss/chat-thread.js'
    ),
    target: 'dist/clis/boss/chat-thread.js',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/dist/clis/boss/send-message.js'
    ),
    target: 'dist/clis/boss/send-message.js',
  },
  {
    source: path.join(
      opencliToolsDir,
      'vendor/@jackwener/opencli/dist/clis/boss/send-resume.js'
    ),
    target: 'dist/clis/boss/send-resume.js',
  },
];

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function runCommandSync(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    cwd: repoRoot,
    ...options,
  });
  if (result.error) {
    throw result.error;
  }
  return result;
}

export function resolveGlobalOpencliPackageDir() {
  if (process.env.OPENCLI_PACKAGE_DIR) {
    return process.env.OPENCLI_PACKAGE_DIR;
  }

  const result = runCommandSync('npm', ['root', '-g']);
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || 'Failed to run `npm root -g`.');
  }

  return path.join(result.stdout.trim(), '@jackwener/opencli');
}

export async function readInstalledOpencliMetadata(packageDir = resolveGlobalOpencliPackageDir()) {
  const packageJsonPath = path.join(packageDir, 'package.json');
  const raw = await fsp.readFile(packageJsonPath, 'utf8');
  const pkg = JSON.parse(raw);
  return {
    dir: packageDir,
    packageJsonPath,
    name: pkg.name,
    version: pkg.version,
    bin: pkg.bin,
    extensionDir: path.join(packageDir, 'extension'),
    patchStampPath: path.join(packageDir, patchStampFileName),
    backupDir: path.join(packageDir, backupDirName),
  };
}

export async function ensureDir(dirPath) {
  await fsp.mkdir(dirPath, { recursive: true });
}

export function resolvePackageExtensionDir(packageDir) {
  return path.join(packageDir, 'extension');
}

export function resolveCachedExtensionDir(version = expectedOpencliVersion) {
  return path.join(browserBridgeDataDir, `opencli-extension-v${version}`);
}

export function resolveCachedExtensionZipPath(version = expectedOpencliVersion) {
  return path.join(browserBridgeDataDir, `opencli-extension-v${version}.zip`);
}

function browserBridgeReleaseUrl(version = expectedOpencliVersion) {
  return `${opencliReleaseBaseUrl}/v${version}/opencli-extension.zip`;
}

async function pathExists(targetPath) {
  try {
    await fsp.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function hasExtensionManifest(extensionDir) {
  return pathExists(path.join(extensionDir, 'manifest.json'));
}

async function downloadBrowserBridgeZip(version = expectedOpencliVersion) {
  const zipPath = resolveCachedExtensionZipPath(version);
  const url = browserBridgeReleaseUrl(version);

  await ensureDir(path.dirname(zipPath));
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Failed to download Browser Bridge ${version}: HTTP ${response.status}`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await fsp.writeFile(zipPath, bytes);
  return zipPath;
}

async function extractBrowserBridgeZip(zipPath, extensionDir) {
  await fsp.rm(extensionDir, { recursive: true, force: true });
  await ensureDir(path.dirname(extensionDir));

  const unzipResult = runCommandSync('unzip', ['-o', zipPath, '-d', extensionDir]);
  if (unzipResult.status !== 0) {
    throw new Error(unzipResult.stderr?.trim() || `Failed to unzip ${zipPath}`);
  }

  if (!(await hasExtensionManifest(extensionDir))) {
    throw new Error(`Downloaded Browser Bridge is missing manifest.json: ${extensionDir}`);
  }
}

async function ensurePackageExtensionLink(packageDir, sourceDir) {
  const packageExtensionDir = resolvePackageExtensionDir(packageDir);

  if (await hasExtensionManifest(packageExtensionDir)) {
    return packageExtensionDir;
  }

  const stat = await fsp.lstat(packageExtensionDir).catch(() => null);
  if (stat) {
    await fsp.rm(packageExtensionDir, { recursive: true, force: true });
  }

  await fsp.symlink(sourceDir, packageExtensionDir);
  return packageExtensionDir;
}

export async function ensureBrowserBridgeExtension(
  packageDir,
  version = expectedOpencliVersion
) {
  const packageExtensionDir = resolvePackageExtensionDir(packageDir);
  if (await hasExtensionManifest(packageExtensionDir)) {
    return packageExtensionDir;
  }

  const cachedExtensionDir = resolveCachedExtensionDir(version);
  if (!(await hasExtensionManifest(cachedExtensionDir))) {
    const zipPath = await downloadBrowserBridgeZip(version);
    await extractBrowserBridgeZip(zipPath, cachedExtensionDir);
  }

  return ensurePackageExtensionLink(packageDir, cachedExtensionDir);
}

export async function copyReplacementFiles(packageDir) {
  const backupRoot = path.join(packageDir, backupDirName);
  await ensureDir(backupRoot);

  const copied = [];
  for (const file of replacementFiles) {
    const targetPath = path.join(packageDir, file.target);
    const backupPath = path.join(backupRoot, file.target);
    await ensureDir(path.dirname(targetPath));
    await ensureDir(path.dirname(backupPath));

    if (fs.existsSync(targetPath) && !fs.existsSync(backupPath)) {
      await fsp.copyFile(targetPath, backupPath);
    }

    await fsp.copyFile(file.source, targetPath);
    copied.push({ ...file, targetPath, backupPath });
  }

  return copied;
}

async function backupIfNeeded(packageDir, targetPath) {
  const backupRoot = path.join(packageDir, backupDirName);
  const relativeTargetPath = path.relative(packageDir, targetPath);
  const backupPath = path.join(backupRoot, relativeTargetPath);
  await ensureDir(path.dirname(backupPath));

  if (fs.existsSync(targetPath) && !fs.existsSync(backupPath)) {
    await fsp.copyFile(targetPath, backupPath);
  }

  return backupPath;
}

export async function loadManifestPatchEntries() {
  const raw = await fsp.readFile(manifestPatchEntriesPath, 'utf8');
  const entries = JSON.parse(raw);
  if (!Array.isArray(entries)) {
    throw new Error(`Manifest patch file is not an array: ${manifestPatchEntriesPath}`);
  }
  return entries;
}

export async function patchCliManifest(packageDir) {
  const manifestPath = path.join(packageDir, 'dist', 'cli-manifest.json');
  const backupPath = await backupIfNeeded(packageDir, manifestPath);
  let installedManifest = [];
  try {
    installedManifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
  const patchEntries = await loadManifestPatchEntries();
  const patchedKeys = new Set(
    patchEntries.map((entry) => `${entry.site}/${entry.name}`)
  );

  const mergedManifest = [
    ...installedManifest.filter(
      (entry) => !patchedKeys.has(`${entry.site}/${entry.name}`)
    ),
    ...patchEntries,
  ].sort((left, right) => {
    const leftKey = `${left.site}/${left.name}`;
    const rightKey = `${right.site}/${right.name}`;
    return leftKey.localeCompare(rightKey);
  });

  await fsp.writeFile(
    manifestPath,
    `${JSON.stringify(mergedManifest, null, 2)}\n`,
    'utf8'
  );

  return {
    manifestPath,
    backupPath,
    patchedCommandCount: patchEntries.length,
  };
}

export async function writePatchStamp(packageDir, metadata, copiedFiles) {
  const stampPath = path.join(packageDir, patchStampFileName);
  const payload = {
    sourceRepo: repoRoot,
    packageDir,
    packageName: metadata.name,
    packageVersion: metadata.version,
    appliedAt: new Date().toISOString(),
    copiedFiles: copiedFiles.map((file) => ({
      target: file.target,
      source: path.relative(repoRoot, file.source),
      backupPath: path.relative(packageDir, file.backupPath),
    })),
  };
  await fsp.writeFile(stampPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return stampPath;
}

function resolveOpencliEntryPoint(metadata) {
  if (typeof metadata.bin === 'string') {
    return path.join(metadata.dir, metadata.bin);
  }

  if (metadata.bin?.opencli) {
    return path.join(metadata.dir, metadata.bin.opencli);
  }

  throw new Error('Could not resolve opencli entrypoint from package metadata.');
}

export function spawnProcess(command, args, options = {}) {
  const { capture = false, cwd = repoRoot, env = process.env } = options;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });

    let stdout = '';
    let stderr = '';

    if (capture) {
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on('error', reject);
    child.on('close', (code) => {
      resolve({
        code: code ?? 0,
        stdout,
        stderr,
      });
    });
  });
}

export async function runInstalledOpencli(args, options = {}) {
  const metadata = await readInstalledOpencliMetadata();
  const entryPoint = resolveOpencliEntryPoint(metadata);
  return spawnProcess(process.execPath, [entryPoint, ...args], options);
}

async function readLockState() {
  try {
    const raw = await fsp.readFile(lockFilePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

async function maybeClearStaleLock() {
  if (!fs.existsSync(lockFilePath)) {
    return false;
  }

  const state = await readLockState();
  if (state?.pid && isPidAlive(state.pid)) {
    return false;
  }

  await fsp.rm(lockFilePath, { force: true });
  return true;
}

export async function withBrowserLock(task, options = {}) {
  const {
    label = 'opencli',
    timeoutMs = Number(process.env.OPENCLI_LOCK_TIMEOUT_MS || 10 * 60 * 1000),
    pollMs = 500,
  } = options;

  await ensureDir(dataDir);
  const start = Date.now();

  while (true) {
    try {
      const handle = await fsp.open(lockFilePath, 'wx');
      await handle.writeFile(
        `${JSON.stringify(
          {
            pid: process.pid,
            label,
            acquiredAt: new Date().toISOString(),
          },
          null,
          2
        )}\n`,
        'utf8'
      );

      try {
        return await task();
      } finally {
        await handle.close().catch(() => {});
        await fsp.rm(lockFilePath, { force: true }).catch(() => {});
      }
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }

      await maybeClearStaleLock();

      if (Date.now() - start >= timeoutMs) {
        const state = await readLockState();
        const holder = state?.label ? ` Current holder: ${state.label}` : '';
        throw new Error(
          `Timed out waiting for opencli browser lock at ${lockFilePath}.${holder}`
        );
      }

      await sleep(pollMs);
    }
  }
}

export function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
