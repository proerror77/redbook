#!/usr/bin/env node

import {
  runInstalledOpencli,
  safeJsonParse,
  sleep,
  withBrowserLock,
} from '../lib/runtime.js';
import { isTransientBridgeError } from '../lib/verify_helpers.js';

async function reconnectBridge(label) {
  process.stdout.write(`[verify] reconnect bridge for ${label}\n`);
  const doctorResult = await runInstalledOpencli(['doctor', '--live'], { capture: true });
  if (doctorResult.code !== 0) {
    const doctorMessage =
      doctorResult.stderr.trim() || doctorResult.stdout.trim() || `exit ${doctorResult.code}`;
    throw new Error(`bridge reconnect failed for ${label}: ${doctorMessage}`);
  }
  await sleep(1200);
}

async function runStep(label, args, options = {}) {
  const maxAttempts = Math.max(1, Number(options.maxAttempts || 1));

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    process.stdout.write(`[verify] ${label}\n`);
    const result = await runInstalledOpencli(args, { capture: true });

    if (result.code === 0) {
      process.stdout.write(`[verify] ok: ${label}\n`);
      return result.stdout.trim();
    }

    const message = result.stderr.trim() || result.stdout.trim() || `exit ${result.code}`;
    if (attempt < maxAttempts && isTransientBridgeError(message)) {
      await reconnectBridge(label);
      continue;
    }

    throw new Error(`${label} failed: ${message}`);
  }

  throw new Error(`${label} failed after ${maxAttempts} attempts`);
}

async function main() {
  const summary = [];

  await withBrowserLock(
    async () => {
      const listOutput = await runStep('list', ['list']);
      const requiredBossCommands = [
        'apply [cookie]',
        'chat-list [cookie]',
        'chat-thread [cookie]',
        'send-message [cookie]',
        'send-resume [cookie]',
      ];
      for (const commandLabel of requiredBossCommands) {
        if (!listOutput.includes(commandLabel)) {
          throw new Error(`list missing boss command: ${commandLabel}`);
        }
      }
      summary.push('list');

      await runStep('doctor', ['doctor']);
      summary.push('doctor');

      await runStep('twitter search', [
        'twitter',
        'search',
        'AI',
        '--limit',
        '1',
        '-f',
        'json',
      ], { maxAttempts: 3 });
      summary.push('twitter search');

      await runStep('xiaohongshu search', [
        'xiaohongshu',
        'search',
        'AI',
        '--limit',
        '1',
        '-f',
        'json',
      ], { maxAttempts: 3 });
      summary.push('xiaohongshu search');

      const notesRaw = await runStep('xiaohongshu creator-notes', [
        'xiaohongshu',
        'creator-notes',
        '--limit',
        '1',
        '-f',
        'json',
      ], { maxAttempts: 3 });
      summary.push('xiaohongshu creator-notes');

      const notes = safeJsonParse(notesRaw);
      const noteId = Array.isArray(notes) ? notes[0]?.id : null;
      if (noteId) {
        await runStep('xiaohongshu creator-note-detail', [
          'xiaohongshu',
          'creator-note-detail',
          String(noteId),
          '-f',
          'json',
        ], { maxAttempts: 3 });
        summary.push('xiaohongshu creator-note-detail');
      }

      const jobsRaw = await runStep('boss search', [
        'boss',
        'search',
        'AI Agent',
        '--city',
        '上海',
        '--limit',
        '1',
        '-f',
        'json',
      ], { maxAttempts: 3 });
      summary.push('boss search');

      const jobs = safeJsonParse(jobsRaw);
      const securityId = Array.isArray(jobs) ? jobs[0]?.security_id : null;
      if (securityId) {
        await runStep('boss detail', [
          'boss',
          'detail',
          String(securityId),
          '-f',
          'json',
        ], { maxAttempts: 3 });
        summary.push('boss detail');
      }

      const conversationsRaw = await runStep('boss chat-list', [
        'boss',
        'chat-list',
        '--limit',
        '1',
        '-f',
        'json',
      ], { maxAttempts: 3 });
      summary.push('boss chat-list');

      const conversations = safeJsonParse(conversationsRaw);
      const conversation = Array.isArray(conversations) ? conversations[0] : null;
      if (conversation?.id || conversation?.title) {
        const threadArgs = [
          'boss',
          'chat-thread',
          '--limit',
          '1',
          '-f',
          'json',
        ];
        if (conversation.id) {
          threadArgs.push('--conversation_id', String(conversation.id));
        } else if (conversation.title) {
          threadArgs.push('--title', String(conversation.title));
        }
        await runStep('boss chat-thread', threadArgs, { maxAttempts: 3 });
        summary.push('boss chat-thread');
      }
    },
    { label: 'verify-opencli' }
  );

  process.stdout.write(
    `[verify] Completed serial smoke: ${summary.join(', ')}\n`
  );
}

main().catch((error) => {
  console.error(`[verify] ${error.message}`);
  process.exit(1);
});
