const state = {
  dashboard: null,
  selectedRunId: null,
}

const knownChecks = [
  'materials_queried',
  'outline_locked',
  'draft_written',
  'qa_passed',
  'publish_assets_ready',
  'published',
  'retrospective_logged',
]

const elements = {
  activeTask: document.querySelector('#activeTask'),
  agentActivity: document.querySelector('#agentActivity'),
  agentTask: document.querySelector('#agentTask'),
  authToken: document.querySelector('#authToken'),
  baseUrl: document.querySelector('#baseUrl'),
  modelName: document.querySelector('#modelName'),
  apiKey: document.querySelector('#apiKey'),
  extensionState: document.querySelector('#extensionState'),
  pendingCount: document.querySelector('#pendingCount'),
  completedCount: document.querySelector('#completedCount'),
  runCount: document.querySelector('#runCount'),
  taskHeadingList: document.querySelector('#taskHeadingList'),
  progressList: document.querySelector('#progressList'),
  runTableBody: document.querySelector('#runTableBody'),
  runSummary: document.querySelector('#runSummary'),
  gateReport: document.querySelector('#gateReport'),
  runDetailHint: document.querySelector('#runDetailHint'),
  reportList: document.querySelector('#reportList'),
  previewPane: document.querySelector('#previewPane'),
  newRunStatus: document.querySelector('#newRunStatus'),
  setCheckForm: document.querySelector('#setCheckForm'),
  setCheckRunId: document.querySelector('#setCheckRunId'),
  checkName: document.querySelector('#checkName'),
}

for (const check of knownChecks) {
  const option = document.createElement('option')
  option.value = check
  option.textContent = check
  elements.checkName.append(option)
}

function agentSystemInstruction() {
  return [
    'You are operating the Redbook Page Agent Pilot, an internal dashboard for the redbook content workflow.',
    'Stay inside this page. Use visible controls instead of inventing actions.',
    'Primary goals on this page: inspect recent harness runs, inspect task board summary, preview research reports, create a new run, and set run checks.',
    'Do not attempt publishing or external site actions from this dashboard.',
    'When summarizing, prefer concise Chinese output in the activity log or task result.',
  ].join(' ')
}

function appendActivity(message) {
  const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  const nextText = `[${timestamp}] ${message}\n`
  elements.agentActivity.textContent =
    elements.agentActivity.textContent === 'No activity yet.'
      ? nextText
      : `${elements.agentActivity.textContent}${nextText}`
  elements.agentActivity.scrollTop = elements.agentActivity.scrollHeight
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`)
  }
  return payload
}

async function waitForExtension(timeout = 1200) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (window.PAGE_AGENT_EXT) {
      return true
    }
    await new Promise((resolve) => setTimeout(resolve, 120))
  }
  return false
}

function renderDashboard(dashboard) {
  state.dashboard = dashboard
  elements.pendingCount.textContent = dashboard.todo.pending_items
  elements.completedCount.textContent = dashboard.todo.completed_items
  elements.runCount.textContent = dashboard.runs.length
  elements.activeTask.textContent = dashboard.todo.active_task || 'No active task found.'

  elements.taskHeadingList.innerHTML = ''
  for (const heading of dashboard.todo.headings) {
    const item = document.createElement('li')
    item.textContent = heading
    elements.taskHeadingList.append(item)
  }

  elements.progressList.innerHTML = ''
  for (const entry of dashboard.progress) {
    const item = document.createElement('li')
    item.innerHTML = `<strong>${entry.date}</strong><span>${entry.highlights.join(' / ') || 'No bullet highlights parsed.'}</span>`
    elements.progressList.append(item)
  }

  elements.runTableBody.innerHTML = ''
  for (const run of dashboard.runs) {
    const row = document.createElement('tr')
    row.dataset.runId = run.run_id
    row.innerHTML = `
      <td><button class="table-button" data-run-id="${run.run_id}">${run.run_id}</button></td>
      <td>${run.topic}</td>
      <td>${run.current_stage}</td>
      <td>${run.status}</td>
      <td>${new Date(run.updated_at).toLocaleString('zh-CN')}</td>
    `
    elements.runTableBody.append(row)
  }

  elements.reportList.innerHTML = ''
  for (const report of dashboard.reports) {
    const item = document.createElement('li')
    item.innerHTML = `
      <button class="report-button" data-path="${report.path}">
        <span>${report.name}</span>
        <small>${new Date(report.updated_at).toLocaleString('zh-CN')}</small>
      </button>
    `
    elements.reportList.append(item)
  }
}

function renderRunDetail(payload) {
  const { run, gate_report: gateReport } = payload
  state.selectedRunId = run.run_id
  elements.runDetailHint.textContent = `Selected run: ${run.run_id}`
  elements.runSummary.innerHTML = `
    <div><dt>Topic</dt><dd>${run.topic}</dd></div>
    <div><dt>Stage</dt><dd>${run.current_stage}</dd></div>
    <div><dt>Status</dt><dd>${run.status}</dd></div>
    <div><dt>Source</dt><dd>${run.source}</dd></div>
    <div><dt>Owner</dt><dd>${run.owner}</dd></div>
    <div><dt>Priority</dt><dd>${run.priority}</dd></div>
  `
  elements.gateReport.textContent = JSON.stringify(gateReport, null, 2)
  elements.setCheckForm.classList.remove('hidden')
  elements.setCheckRunId.value = run.run_id
}

async function loadDashboard() {
  const dashboard = await fetchJson('/api/dashboard')
  renderDashboard(dashboard)
}

async function loadRun(runId) {
  const payload = await fetchJson(`/api/runs/${encodeURIComponent(runId)}`)
  renderRunDetail(payload)
}

async function loadPreview(pathValue) {
  const payload = await fetchJson(`/api/preview?path=${encodeURIComponent(pathValue)}`)
  elements.previewPane.textContent = payload.content
}

function persistAgentSettings() {
  localStorage.setItem('PageAgentExtUserAuthToken', elements.authToken.value.trim())
  localStorage.setItem('redbook.pageAgent.baseUrl', elements.baseUrl.value.trim())
  localStorage.setItem('redbook.pageAgent.modelName', elements.modelName.value.trim())
  localStorage.setItem('redbook.pageAgent.apiKey', elements.apiKey.value.trim())
}

function hydrateAgentSettings() {
  elements.authToken.value = localStorage.getItem('PageAgentExtUserAuthToken') || ''
  elements.baseUrl.value = localStorage.getItem('redbook.pageAgent.baseUrl') || elements.baseUrl.value
  elements.modelName.value = localStorage.getItem('redbook.pageAgent.modelName') || elements.modelName.value
  elements.apiKey.value = localStorage.getItem('redbook.pageAgent.apiKey') || ''
}

async function refreshExtensionState() {
  const ready = await waitForExtension(500)
  if (ready) {
    elements.extensionState.textContent = `Extension ready · ${window.PAGE_AGENT_EXT_VERSION || 'unknown'}`
    elements.extensionState.classList.add('ok')
    return
  }
  elements.extensionState.textContent = 'Extension not injected'
  elements.extensionState.classList.remove('ok')
}

document.querySelector('#refreshDashboardButton').addEventListener('click', async () => {
  appendActivity('Refreshing dashboard.')
  await loadDashboard()
})

document.querySelector('#newRunForm').addEventListener('submit', async (event) => {
  event.preventDefault()
  const formData = new FormData(event.currentTarget)
  const payload = Object.fromEntries(formData.entries())
  const run = await fetchJson('/api/runs', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  elements.newRunStatus.textContent = `Created run: ${run.run_id}`
  appendActivity(`Created run ${run.run_id}.`)
  event.currentTarget.reset()
  await loadDashboard()
})

elements.setCheckForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const formData = new FormData(event.currentTarget)
  const runId = formData.get('runId')
  const checkName = formData.get('checkName')
  const value = formData.get('checkValue') === 'true'
  await fetchJson(`/api/runs/${encodeURIComponent(runId)}/checks`, {
    method: 'POST',
    body: JSON.stringify({ name: checkName, value }),
  })
  appendActivity(`Set ${checkName}=${value} on ${runId}.`)
  await loadRun(runId)
  await loadDashboard()
})

document.querySelector('#runTableBody').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-run-id]')
  if (!button) {
    return
  }
  await loadRun(button.dataset.runId)
})

document.querySelector('#reportList').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-path]')
  if (!button) {
    return
  }
  await loadPreview(button.dataset.path)
})

document.querySelectorAll('.prompt-button').forEach((button) => {
  button.addEventListener('click', () => {
    elements.agentTask.value = button.dataset.prompt
  })
})

document.querySelector('#agentConfigForm').addEventListener('submit', async (event) => {
  event.preventDefault()
  persistAgentSettings()
  const ready = await waitForExtension()
  if (!ready) {
    appendActivity('Page Agent extension is not available in this page.')
    await refreshExtensionState()
    return
  }

  appendActivity(`Starting task: ${elements.agentTask.value.trim()}`)
  const result = await window.PAGE_AGENT_EXT.execute(elements.agentTask.value.trim(), {
    baseURL: elements.baseUrl.value.trim(),
    apiKey: elements.apiKey.value.trim(),
    model: elements.modelName.value.trim(),
    systemInstruction: agentSystemInstruction(),
    includeInitialTab: true,
    onStatusChange(status) {
      appendActivity(`status: ${status}`)
    },
    onActivity(activity) {
      appendActivity(`activity: ${activity.type}${activity.tool ? ` · ${activity.tool}` : ''}`)
    },
    onHistoryUpdate(history) {
      if (history.length > 0) {
        const latest = history.at(-1)
        appendActivity(`history: ${latest.type}`)
      }
    },
  })
  appendActivity(`task finished: ${result.success ? 'success' : 'failure'}`)
  appendActivity(result.data || 'No textual result returned.')
  await loadDashboard()
  if (state.selectedRunId) {
    await loadRun(state.selectedRunId)
  }
})

document.querySelector('#stopAgentButton').addEventListener('click', () => {
  if (window.PAGE_AGENT_EXT) {
    window.PAGE_AGENT_EXT.stop()
    appendActivity('Stop signal sent.')
  }
})

async function bootstrap() {
  hydrateAgentSettings()
  await Promise.all([loadDashboard(), refreshExtensionState()])
  if (state.dashboard?.reports?.[0]) {
    await loadPreview(state.dashboard.reports[0].path)
  }
}

bootstrap().catch((error) => {
  appendActivity(`bootstrap failed: ${error.message}`)
})
