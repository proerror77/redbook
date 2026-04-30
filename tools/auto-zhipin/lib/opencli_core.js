const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const moduleCache = new Map();
const APPLY_BUTTON_TEXTS = ['立即沟通', '立即投递', '投递简历', '立即申请', '聊一聊'];

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
    resolveVendorOpencliPackageDir(),
    resolveGlobalOpencliPackageDir(),
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

function parseJsonResult(raw, fallback = {}) {
  if (raw && typeof raw === 'object') {
    return raw;
  }
  try {
    return JSON.parse(String(raw || ''));
  } catch {
    return fallback;
  }
}

function buildProbeApplyButtonScript(buttonTextCandidates = APPLY_BUTTON_TEXTS) {
  return `(() => {
    function normalize(value) {
      return String(value || '')
        .replace(/[\\u200B-\\u200D\\uFEFF\\u2060]/g, '')
        .replace(/\\s+/g, ' ')
        .trim();
    }
    function compact(value) {
      return normalize(value).replace(/\\s+/g, '');
    }
    function isVisible(node) {
      if (!node) {
        return false;
      }
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
        return false;
      }
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }
    function matchesLabel(node, label) {
      const text = normalize(node.innerText || node.textContent || node.getAttribute('aria-label') || '');
      if (!text) {
        return false;
      }
      const normalizedLabel = normalize(label);
      if (!normalizedLabel) {
        return false;
      }
      return text.includes(normalizedLabel) || compact(text).includes(compact(normalizedLabel));
    }
    function isEnabled(node) {
      return !node.disabled && node.getAttribute('aria-disabled') !== 'true';
    }
    function findPreferredButton(label) {
      const preferredSelectors = [
        { selector: '.job-op .btn-startchat', requiresLabel: false },
        { selector: '.job-op .btn-container .btn-startchat', requiresLabel: false },
        { selector: '.btn-startchat-wrap .btn-startchat', requiresLabel: false },
        { selector: 'a.btn.btn-startchat', requiresLabel: false },
        { selector: 'a.op-btn.op-btn-chat', requiresLabel: false },
        { selector: '[class*="op-btn-chat"]', requiresLabel: false },
        { selector: 'a[ka*="chat"]', requiresLabel: false },
        { selector: 'a[data-url*="/friend/add"]', requiresLabel: false },
        { selector: 'a[redirect-url*="/web/geek/chat"]', requiresLabel: false },
        { selector: '.job-op .btn-container a.btn', requiresLabel: true },
      ];

      for (const preferred of preferredSelectors) {
        const nodes = Array.from(document.querySelectorAll(preferred.selector));
        const matched = nodes.find((node) => {
          if (!isVisible(node) || !isEnabled(node)) {
            return false;
          }
          if (!preferred.requiresLabel) {
            return true;
          }
          return matchesLabel(node, label);
        });
        if (matched) {
          return { node: matched, selector: preferred.selector };
        }
      }

      const genericNodes = Array.from(document.querySelectorAll('a, button, [role="button"]'));
      const matched = genericNodes.find((node) => isVisible(node) && isEnabled(node) && matchesLabel(node, label));
      if (matched) {
        return { node: matched, selector: 'generic-actionable' };
      }

      return null;
    }

    const labels = ${JSON.stringify(buttonTextCandidates || APPLY_BUTTON_TEXTS)};
    for (const label of labels) {
      const match = findPreferredButton(label);
      if (!match?.node) {
        continue;
      }
      return JSON.stringify({
        ok: true,
        text: normalize(match.node.innerText || match.node.textContent || label),
        selector: match.selector,
      });
    }
    return JSON.stringify({ ok: false, reason: 'apply_button_not_found' });
  })()`;
}

async function probeApplyButton(adapter, buttonTextCandidates = APPLY_BUTTON_TEXTS) {
  return parseJsonResult(
    await adapter.evaluate(buildProbeApplyButtonScript(buttonTextCandidates)),
    { ok: false, reason: 'apply_button_probe_failed' }
  );
}

function patchJobBrowserCore(core) {
  if (!core || core.__redbookSafeDryRunPatched) {
    return core;
  }

  const originalApplyOnActiveJobDetail = core.applyOnActiveJobDetail;
  const { runActionHooks } = require(resolveBossCoreModulePath('hooks'));
  const { buildActionResult } = require(resolveBossCoreModulePath('result-model'));

  core.buildProbeApplyButtonScript = buildProbeApplyButtonScript;
  core.probeApplyButton = probeApplyButton;
  core.applyOnActiveJobDetail = async function applyOnActiveJobDetail(adapter, options = {}) {
    if (!options.dryRun) {
      return originalApplyOnActiveJobDetail(adapter, options);
    }

    const buttonTextCandidates = options.buttonTextCandidates || APPLY_BUTTON_TEXTS;
    const greeting = String(options.greeting || '').trim();
    const initialMeta = await core.extractJobDetailMeta(adapter);
    const context = {
      url: initialMeta.url || '',
      greeting,
      dryRun: true,
    };

    return runActionHooks(options.hooks, 'apply', context, async () => {
      if (String(initialMeta.bodyText || '').includes('继续沟通')) {
        return buildActionResult({
          ok: false,
          action: 'apply',
          status: 'skipped',
          reason: 'already_continuing',
          evidence: {
            initialMeta,
            mode: 'already_continuing',
            dryRun: true,
          },
          normalized: {
            url: initialMeta.url || '',
          },
          dryRun: true,
          mode: 'already_continuing',
          url: initialMeta.url || '',
        });
      }

      const probeResult = await probeApplyButton(adapter, buttonTextCandidates);
      return buildActionResult({
        ok: probeResult.ok,
        action: 'apply',
        status: probeResult.ok ? 'success' : 'not_found',
        reason: probeResult.ok ? null : (probeResult.reason || 'apply_button_not_found'),
        evidence: {
          initialMeta,
          probeResult,
          dryRun: true,
        },
        normalized: probeResult.ok ? {
          url: initialMeta.url || '',
          button: probeResult.text || '',
        } : null,
        dryRun: true,
        mode: 'dry_run_preflight',
        button: probeResult.text || '',
        url: initialMeta.url || '',
      });
    });
  };
  core.__redbookSafeDryRunPatched = true;
  return core;
}

function requireBossCoreModule(moduleName) {
  const modulePath = resolveBossCoreModulePath(moduleName);
  if (!moduleCache.has(modulePath)) {
    const loaded = require(modulePath);
    moduleCache.set(modulePath, moduleName === 'job-browser' ? patchJobBrowserCore(loaded) : loaded);
  }
  return moduleCache.get(modulePath);
}

module.exports = {
  requireBossCoreModule,
  resolveBossCoreModulePath,
  resolveGlobalOpencliPackageDir,
  resolveVendorOpencliPackageDir,
};
