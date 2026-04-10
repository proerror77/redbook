# OpenCLI Repo Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the local `opencli` fixes reproducible from this repo and expose a serialized wrapper for X, Xiaohongshu, and BOSS read flows.

**Architecture:** Store the patched `opencli 1.0.1` files inside `tools/opencli/vendor`, add an installer that syncs them into the global package, and funnel repo-side usage through a lock-protected wrapper. Verification stays serial and read-only.

**Tech Stack:** Node.js 24, filesystem copy/backup, child process spawn, file lock via `fs.open(..., 'wx')`

---

### Task 1: Add the repo-managed `tools/opencli` skeleton

**Files:**
- Create: `tools/opencli/package.json`
- Create: `tools/opencli/README.md`
- Create: `tools/opencli/data/.gitkeep`

**Step 1: Add a private package descriptor**

Create `tools/opencli/package.json` with:
- `type: "module"`
- `scripts.install-opencli`
- `scripts.patch-opencli`
- `scripts.verify-opencli`

**Step 2: Add the local README**

Document:
- scope
- prerequisites
- install/patch command
- serialized wrapper command
- verify command

**Step 3: Add the runtime data placeholder**

Create `tools/opencli/data/.gitkeep` so lock files and local runtime artifacts have a stable home.

### Task 2: Vendor the patched `opencli` files

**Files:**
- Create: `tools/opencli/vendor/@jackwener/opencli/src/clis/xiaohongshu/search.ts`
- Create: `tools/opencli/vendor/@jackwener/opencli/src/clis/xiaohongshu/creator-notes.ts`
- Create: `tools/opencli/vendor/@jackwener/opencli/src/clis/twitter/search.ts`
- Create: `tools/opencli/vendor/@jackwener/opencli/dist/clis/xiaohongshu/search.js`
- Create: `tools/opencli/vendor/@jackwener/opencli/dist/clis/xiaohongshu/creator-notes.js`
- Create: `tools/opencli/vendor/@jackwener/opencli/dist/clis/twitter/search.js`

**Step 1: Copy the already-verified source files**

Use the current local working versions as canonical repo copies.

**Step 2: Copy the already-verified dist files**

Store the matching built JS files so the installer does not rely on a local rebuild step.

**Step 3: Keep the patch surface minimal**

Do not vendor unrelated upstream files; only the 6 touched files belong here.

### Task 3: Implement install + patch automation

**Files:**
- Create: `tools/opencli/lib/runtime.js`
- Create: `tools/opencli/scripts/install.js`

**Step 1: Detect the global package**

Implement helpers to:
- locate the global npm root
- resolve `@jackwener/opencli`
- read package metadata

**Step 2: Install or pin the supported version**

If missing or not `1.0.1`, run:

```bash
npm install -g @jackwener/opencli@1.0.1
```

**Step 3: Backup and replace patched files**

Before overwriting each target:
- save the original under `.redbook-opencli-backup/...`
- copy the repo-managed replacement

**Step 4: Write a patch stamp**

Create `.redbook-opencli-patches.json` in the installed package so later runs can inspect what was applied.

### Task 4: Implement the serialized wrapper and smoke verifier

**Files:**
- Create: `tools/opencli/bin/redbook-opencli.js`
- Create: `tools/opencli/scripts/verify.js`

**Step 1: Add a file-lock helper**

In `runtime.js`, add a lock around browser commands using:
- `tools/opencli/data/browser.lock`
- stale lock recovery when the recorded pid is gone

**Step 2: Add the wrapper**

`redbook-opencli.js` should:
- dispatch `install` to `scripts/install.js`
- dispatch `verify` to `scripts/verify.js`
- otherwise run the installed `opencli` entrypoint under the browser lock

**Step 3: Add the verifier**

Run the validated commands serially:
- `doctor --live`
- `twitter search`
- `xiaohongshu search`
- `xiaohongshu creator-notes`
- follow-up `creator-note-detail`
- `boss search`
- follow-up `boss detail`

### Task 5: Update repo docs and verify behavior

**Files:**
- Modify: `tools/README.md`
- Modify: `tasks/todo.md`

**Step 1: Add `opencli` to the tool matrix**

Document it as:
- a read-only adapter
- secondary to existing publish skills
- serialized by design

**Step 2: Record the new execution block in `tasks/todo.md`**

Capture:
- design landed
- installer/wrapper added
- docs updated
- smoke commands run

**Step 3: Run focused verification**

Run:

```bash
node tools/opencli/scripts/install.js --skip-install
node tools/opencli/scripts/verify.js
```

Expected:
- patch application succeeds
- commands run serially without cross-page contamination
- dynamic follow-up commands get ids from the prior step
