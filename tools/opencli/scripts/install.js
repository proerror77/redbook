#!/usr/bin/env node

import path from 'node:path';
import {
  copyReplacementFiles,
  expectedOpencliVersion,
  patchCliManifest,
  readInstalledOpencliMetadata,
  resolveGlobalOpencliPackageDir,
  runCommandSync,
  writePatchStamp,
} from '../lib/runtime.js';

const args = new Set(process.argv.slice(2));
const skipInstall = args.has('--skip-install');
const packageDir = resolveGlobalOpencliPackageDir();

async function main() {
  let metadata = null;
  let packageMissing = false;

  try {
    metadata = await readInstalledOpencliMetadata(packageDir);
  } catch {
    packageMissing = true;
  }

  const needsInstall =
    packageMissing || metadata?.version !== expectedOpencliVersion;

  if (needsInstall && skipInstall) {
    throw new Error(
      `Global @jackwener/opencli is ${
        packageMissing ? 'missing' : `version ${metadata?.version}`
      }. Run without --skip-install to install ${expectedOpencliVersion}.`
    );
  }

  if (needsInstall) {
    console.log(
      `[install] Installing @jackwener/opencli@${expectedOpencliVersion} globally...`
    );
    const installResult = runCommandSync(
      'npm',
      ['install', '-g', `@jackwener/opencli@${expectedOpencliVersion}`],
      {
        stdio: 'inherit',
      }
    );

    if (installResult.status !== 0) {
      throw new Error('npm install -g failed.');
    }
  }

  metadata = await readInstalledOpencliMetadata(packageDir);
  if (metadata.version !== expectedOpencliVersion) {
    throw new Error(
      `Expected @jackwener/opencli@${expectedOpencliVersion}, got ${metadata.version}.`
    );
  }

  const copiedFiles = await copyReplacementFiles(packageDir);
  const manifestPatch = await patchCliManifest(packageDir);
  const stampPath = await writePatchStamp(packageDir, metadata, copiedFiles);

  console.log(`[install] Package dir: ${metadata.dir}`);
  console.log(`[install] Version: ${metadata.version}`);
  console.log(`[install] Patched files: ${copiedFiles.length}`);
  for (const file of copiedFiles) {
    console.log(
      `  - ${file.target} <= ${path.relative(process.cwd(), file.source)}`
    );
  }
  console.log(`[install] Backup dir: ${metadata.backupDir}`);
  console.log(
    `[install] Manifest patch: ${manifestPatch.manifestPath} (${manifestPatch.patchedCommandCount} commands)`
  );
  console.log(`[install] Patch stamp: ${stampPath}`);
  console.log(`[install] Browser Bridge extension dir: ${metadata.extensionDir}`);
  console.log('[install] Next: node tools/opencli/scripts/verify.js');
}

main().catch((error) => {
  console.error(`[install] ${error.message}`);
  process.exit(1);
});
