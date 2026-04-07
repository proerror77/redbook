import { spawn } from 'node:child_process'
import http from 'node:http'
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', '..')
const PUBLIC_DIR = path.join(__dirname, 'public')
const HOST = '127.0.0.1'
const PORT = Number(process.env.PORT || 4318)

const TEXT_CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

const ALLOWED_PREVIEW_PREFIXES = [
  '01-内容生产',
  '05-选题研究',
  'tasks',
  'wiki',
  'docs',
]

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload, null, 2))
}

function sendText(response, statusCode, payload, contentType = 'text/plain; charset=utf-8') {
  response.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  })
  response.end(payload)
}

async function readJsonBody(request) {
  const chunks = []
  for await (const chunk of request) {
    chunks.push(chunk)
  }

  if (chunks.length === 0) {
    return {}
  }

  const raw = Buffer.concat(chunks).toString('utf8')
  return JSON.parse(raw)
}

function normalizeRelativePath(relativePath) {
  const cleaned = String(relativePath || '').replace(/^\/+/, '')
  const absolutePath = path.resolve(ROOT, cleaned)
  const relativeToRoot = path.relative(ROOT, absolutePath)
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error('Path is outside repository root.')
  }
  return { absolutePath, relativeToRoot }
}

function isPreviewPathAllowed(relativeToRoot) {
  return ALLOWED_PREVIEW_PREFIXES.some((prefix) => {
    return relativeToRoot === prefix || relativeToRoot.startsWith(`${prefix}${path.sep}`)
  })
}

async function runHarnessCommand(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'python3',
      ['-m', 'tools.redbook_harness.cli', ...args],
      {
        cwd: ROOT,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8')
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || stdout.trim() || `Harness command failed with exit ${code}`))
        return
      }

      try {
        resolve(JSON.parse(stdout))
      } catch (error) {
        reject(new Error(`Failed to parse harness output: ${error.message}`))
      }
    })
  })
}

function parseTodoBoard(markdown) {
  const taskHeadings = Array.from(markdown.matchAll(/^##\s+(.+)$/gm)).map((match) => match[1])
  const checked = (markdown.match(/^- \[x\]/gim) || []).length
  const pending = (markdown.match(/^- \[ \]/gim) || []).length

  return {
    active_task: taskHeadings[0] || null,
    headings: taskHeadings.slice(0, 6),
    completed_items: checked,
    pending_items: pending,
  }
}

function parseProgressEntries(markdown) {
  const headingMatches = Array.from(markdown.matchAll(/^##\s+\[(.+?)\]\s+会话摘要$/gm))
  return headingMatches.slice(0, 6).map((match, index) => {
    const start = match.index
    const end = headingMatches[index + 1]?.index ?? markdown.length
    const block = markdown.slice(start, end)
    const highlights = Array.from(block.matchAll(/^- (.+)$/gm)).slice(0, 4).map((item) => item[1])
    return {
      date: match[1],
      highlights,
    }
  })
}

async function listLatestReports(limit = 8) {
  const reportDir = path.join(ROOT, '05-选题研究')
  const entries = await readdir(reportDir, { withFileTypes: true })
  const reports = []

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue
    }

    const absolutePath = path.join(reportDir, entry.name)
    const info = await stat(absolutePath)
    reports.push({
      name: entry.name,
      path: path.relative(ROOT, absolutePath),
      updated_at: info.mtime.toISOString(),
    })
  }

  reports.sort((left, right) => right.updated_at.localeCompare(left.updated_at))
  return reports.slice(0, limit)
}

async function buildDashboardPayload() {
  const [todoMarkdown, progressMarkdown, runs, reports] = await Promise.all([
    readFile(path.join(ROOT, 'tasks', 'todo.md'), 'utf8'),
    readFile(path.join(ROOT, 'tasks', 'progress.md'), 'utf8'),
    runHarnessCommand(['list-runs', '--limit', '8']),
    listLatestReports(),
  ])

  return {
    generated_at: new Date().toISOString(),
    repo_root: ROOT,
    todo: parseTodoBoard(todoMarkdown),
    progress: parseProgressEntries(progressMarkdown),
    runs,
    reports,
  }
}

async function serveStaticAsset(response, requestPath) {
  const assetPath = requestPath === '/' ? '/index.html' : requestPath
  const normalizedPath = path
    .normalize(assetPath)
    .replace(/^(\.\.[/\\])+/, '')
    .replace(/^[/\\]+/, '')
  const absolutePath = path.join(PUBLIC_DIR, normalizedPath)

  if (!absolutePath.startsWith(PUBLIC_DIR)) {
    sendText(response, 403, 'Forbidden')
    return
  }

  try {
    const content = await readFile(absolutePath)
    const extname = path.extname(absolutePath)
    sendText(response, 200, content, TEXT_CONTENT_TYPES[extname] || 'application/octet-stream')
  } catch (error) {
    if (error.code === 'ENOENT') {
      sendText(response, 404, 'Not found')
      return
    }
    throw error
  }
}

async function handleApi(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/api/dashboard') {
    sendJson(response, 200, await buildDashboardPayload())
    return
  }

  if (request.method === 'GET' && url.pathname.startsWith('/api/runs/')) {
    const runId = decodeURIComponent(url.pathname.slice('/api/runs/'.length))
    const [run, gateReport] = await Promise.all([
      runHarnessCommand(['show-run', '--run-id', runId]),
      runHarnessCommand(['check-gates', '--run-id', runId]),
    ])
    sendJson(response, 200, { run, gate_report: gateReport })
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/runs') {
    const body = await readJsonBody(request)
    const requiredKeys = ['topic', 'source']
    for (const key of requiredKeys) {
      if (!body[key]) {
        sendJson(response, 400, { error: `Missing required field: ${key}` })
        return
      }
    }

    const run = await runHarnessCommand([
      'new-run',
      '--topic',
      body.topic,
      '--source',
      body.source,
      '--summary',
      body.summary || '',
      '--priority',
      body.priority || 'P1',
      '--owner',
      body.owner || 'Codex',
    ])
    sendJson(response, 201, run)
    return
  }

  if (request.method === 'POST' && /^\/api\/runs\/[^/]+\/checks$/.test(url.pathname)) {
    const runId = decodeURIComponent(url.pathname.split('/')[3])
    const body = await readJsonBody(request)
    if (!body.name || typeof body.value !== 'boolean') {
      sendJson(response, 400, { error: 'Body must include check name and boolean value.' })
      return
    }

    const result = await runHarnessCommand([
      'set-check',
      '--run-id',
      runId,
      '--name',
      body.name,
      '--value',
      body.value ? 'true' : 'false',
    ])
    sendJson(response, 200, result)
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/preview') {
    const requestedPath = url.searchParams.get('path')
    if (!requestedPath) {
      sendJson(response, 400, { error: 'Missing path query parameter.' })
      return
    }

    const { absolutePath, relativeToRoot } = normalizeRelativePath(requestedPath)
    if (!isPreviewPathAllowed(relativeToRoot)) {
      sendJson(response, 403, { error: 'Preview path is not allowed.' })
      return
    }

    const fileContent = await readFile(absolutePath, 'utf8')
    sendJson(response, 200, {
      path: relativeToRoot,
      content: fileContent.slice(0, 24000),
      truncated: fileContent.length > 24000,
    })
    return
  }

  sendJson(response, 404, { error: 'API route not found.' })
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || `${HOST}:${PORT}`}`)

  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url)
      return
    }

    await serveStaticAsset(response, url.pathname)
  } catch (error) {
    sendJson(response, 500, { error: error.message || 'Internal server error.' })
  }
})

server.listen(PORT, HOST, () => {
  console.log(`Redbook Page Agent Console running at http://${HOST}:${PORT}`)
})
