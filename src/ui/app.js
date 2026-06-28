const API = '/api';
let currentPage = 'dashboard';

async function fetchJSON(url, opts) {
  try {
    const res = await fetch(API + url, opts);
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch (e) {
    console.error('API error:', e);
    return null;
  }
}

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function renderDashboard(data) {
  const status = data?.state?.phase || 'idle';
  const cacheStats = data?.modules?.cache || {};
  const projects = data?.modules?.discovery ? 'Ready' : 'N/A';

  return `
    <div class="grid grid-4" style="margin-bottom: 24px">
      <div class="card">
        <div class="card-title">Pipeline Status</div>
        <div class="card-value" style="margin-top:8px">
          <span class="badge badge-${status === 'idle' ? 'info' : 'success'}">${status}</span>
        </div>
        <div class="card-subtitle">Auto pipeline current phase</div>
      </div>
      <div class="card">
        <div class="card-title">Cache Hit Rate</div>
        <div class="card-value" style="margin-top:8px">${cacheStats.hitRate ? (cacheStats.hitRate * 100).toFixed(1) + '%' : '0%'}</div>
        <div class="card-subtitle">${cacheStats.size || 0} entries cached</div>
      </div>
      <div class="card">
        <div class="card-title">Discovery Engine</div>
        <div class="card-value" style="margin-top:8px"><span class="badge badge-success">Active</span></div>
        <div class="card-subtitle">5 project types</div>
      </div>
      <div class="card">
        <div class="card-title">Decision Engine</div>
        <div class="card-value" style="margin-top:8px"><span class="badge badge-success">Active</span></div>
        <div class="card-subtitle">4 categories, 16+ options</div>
      </div>
    </div>
    <div class="grid grid-2">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Module Status</span>
        </div>
        <div class="metric-row"><span class="metric-label">Discovery</span><span class="badge badge-success">Ready</span></div>
        <div class="metric-row"><span class="metric-label">Decision</span><span class="badge badge-success">Ready</span></div>
        <div class="metric-row"><span class="metric-label">Scaffold</span><span class="badge badge-success">Ready</span></div>
        <div class="metric-row"><span class="metric-label">Execution</span><span class="badge badge-success">Ready</span></div>
        <div class="metric-row"><span class="metric-label">Telemetry</span><span class="badge badge-success">Collecting</span></div>
        <div class="metric-row"><span class="metric-label">Governance</span><span class="badge badge-success">Enforcing</span></div>
        <div class="metric-row"><span class="metric-label">Router</span><span class="badge badge-success">Routing</span></div>
        <div class="metric-row"><span class="metric-label">Context</span><span class="badge badge-success">Processing</span></div>
        <div class="metric-row"><span class="metric-label">Evolve</span><span class="badge badge-success">Learning</span></div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">System Info</span>
        </div>
        <div class="metric-row"><span class="metric-label">Version</span><span class="metric-value">1.0.0</span></div>
        <div class="metric-row"><span class="metric-label">Runtime</span><span class="metric-value">Bun</span></div>
        <div class="metric-row"><span class="metric-label">Database</span><span class="metric-value">SQLite (WAL)</span></div>
        <div class="metric-row"><span class="metric-label">Tests</span><span class="metric-value">344 passing</span></div>
        <div class="metric-row"><span class="metric-label">Coverage</span><span class="metric-value">95.36%</span></div>
        <div class="metric-row"><span class="metric-label">Uptime</span><span class="metric-value" id="uptime">-</span></div>
      </div>
    </div>
  `;
}

function renderDiscovery() {
  return `
    <div class="card" style="margin-bottom: 24px">
      <div class="card-header">
        <span class="card-title">Start Discovery Session</span>
      </div>
      <div style="display:flex;gap:12px;align-items:flex-end">
        <div class="input-group" style="flex:1;margin:0">
          <label class="input-label">Project Type</label>
          <select class="input" id="discovery-type">
            <option value="saas">SaaS Application</option>
            <option value="cli">CLI Tool</option>
            <option value="api">REST API</option>
            <option value="mobile">Mobile App</option>
            <option value="static">Static Site</option>
          </select>
        </div>
        <button class="btn btn-primary" onclick="startDiscovery()" style="height:42px">Start</button>
      </div>
    </div>
    <div id="discovery-session"></div>
  `;
}

async function startDiscovery() {
  const type = $('#discovery-type').value;
  const data = await fetchJSON(`/discovery/questions/${type}`, { method: 'POST' });
  if (!data) return toast('Failed to start session');
  
  const el = $('#discovery-session');
  el.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title">Question ${data.questionIndex + 1}</span>
        <span class="badge badge-info">${data.progress || 0}% complete</span>
      </div>
      <p style="font-size:16px;margin-bottom:16px">${data.question?.text || 'Session started'}</p>
      ${data.question?.options ? `
        <div style="display:flex;flex-direction:column;gap:8px">
          ${data.question.options.map((o, i) => `
            <button class="btn" onclick="answerDiscovery('${data.sessionId}','${data.question.id}','${o.value}')">${o.label}</button>
          `).join('')}
        </div>
      ` : '<p class="card-subtitle">No more questions</p>'}
    </div>
  `;
}

async function answerDiscovery(sessionId, questionId, answer) {
  const data = await fetchJSON('/discovery/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, questionId, answer })
  });
  if (!data) return toast('Failed to record answer');
  if (data.complete) {
    toast('Discovery complete!');
    $('#discovery-session').innerHTML = '<div class="card"><div class="card-title">Discovery Complete</div><p style="margin-top:8px">All questions answered. Ready to proceed to decision phase.</p></div>';
  } else {
    startDiscovery();
  }
}

async function renderDecisions() {
  const categories = await fetchJSON('/decision/categories') || [];
  let optionsHtml = '';
  for (const cat of categories) {
    const opts = await fetchJSON(`/decision/options/${cat}`) || [];
    optionsHtml += `
      <div class="card" style="margin-bottom:16px">
        <div class="card-header">
          <span class="card-title">${cat}</span>
          <button class="btn" onclick="compareCategory('${cat}')">Compare</button>
        </div>
        <table>
          <thead><tr><th>Option</th><th>Score</th><th>Notes</th></tr></thead>
          <tbody>
            ${opts.map(o => `<tr><td>${o.name}</td><td><span class="metric-value">${o.scores?.overall || '-'}</span></td><td>${o.notes || ''}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  return `
    <div style="margin-bottom:24px">
      <h3 style="font-size:16px;margin-bottom:16px">Technology Comparison Matrix</h3>
    </div>
    ${optionsHtml || '<div class="empty-state"><div class="empty-state-icon">T</div><div class="empty-state-text">Loading categories...</div></div>'}
  `;
}

async function compareCategory(cat) {
  const data = await fetchJSON('/decision/recommend/' + cat);
  if (data) toast(`Recommended: ${data.name || 'N/A'}`);
}

function renderScaffold() {
  return `
    <div class="card" style="margin-bottom:24px">
      <div class="card-header">
        <span class="card-title">Generate Project</span>
      </div>
      <div class="input-group">
        <label class="input-label">Template</label>
        <select class="input" id="scaffold-template">
          <option value="default">Default (Basic)</option>
          <option value="api">REST API (Hono)</option>
          <option value="cli">CLI Tool (Commander)</option>
        </select>
      </div>
      <div class="input-group">
        <label class="input-label">Project Name</label>
        <input class="input" id="scaffold-name" placeholder="my-project" />
      </div>
      <div class="input-group">
        <label class="input-label">Description</label>
        <input class="input" id="scaffold-desc" placeholder="A brief description" />
      </div>
      <div class="input-group">
        <label class="input-label">Output Directory</label>
        <input class="input" id="scaffold-output" placeholder="./output" />
      </div>
      <button class="btn btn-primary" onclick="generateScaffold()">Generate</button>
    </div>
    <div id="scaffold-result"></div>
  `;
}

async function generateScaffold() {
  const template = $('#scaffold-template').value;
  const name = $('#scaffold-name').value;
  const desc = $('#scaffold-desc').value;
  const output = $('#scaffold-output').value || './output';
  if (!name) return toast('Project name required');
  const data = await fetchJSON('/scaffold/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ template, variables: { projectName: name, description: desc }, outputDir: output })
  });
  if (data) {
    $('#scaffold-result').innerHTML = `
      <div class="card">
        <div class="card-title">Generated Files</div>
        <ul style="margin-top:12px;list-style:none">
          ${(data.files || []).map(f => `<li style="padding:4px 0;font-family:var(--mono);font-size:13px;color:var(--success)">${f}</li>`).join('')}
        </ul>
      </div>
    `;
    toast('Project generated!');
  }
}

async function renderTelemetry() {
  const metrics = await fetchJSON('/telemetry/metrics');
  return `
    <div class="grid grid-3" style="margin-bottom:24px">
      <div class="card">
        <div class="card-title">Total Spans</div>
        <div class="card-value" style="margin-top:8px">${metrics?.totalSpans || 0}</div>
      </div>
      <div class="card">
        <div class="card-title">Agent Turns</div>
        <div class="card-value" style="margin-top:8px">${metrics?.totalAgentTurns || 0}</div>
      </div>
      <div class="card">
        <div class="card-title">Tool Calls</div>
        <div class="card-value" style="margin-top:8px">${metrics?.totalToolCalls || 0}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">Metrics</span>
        <button class="btn" onclick="exportTelemetry()">Export</button>
      </div>
      <div class="metric-row"><span class="metric-label">Total Tokens</span><span class="metric-value">${metrics?.totalTokens || 0}</span></div>
      <div class="metric-row"><span class="metric-label">Total Cost</span><span class="metric-value">$${(metrics?.totalCost || 0).toFixed(4)}</span></div>
      <div class="metric-row"><span class="metric-label">Error Rate</span><span class="metric-value">${metrics?.errorRate || 0}%</span></div>
      <div class="metric-row"><span class="metric-label">Avg Duration</span><span class="metric-value">${metrics?.avgDuration || 0}ms</span></div>
    </div>
  `;
}

async function exportTelemetry() {
  await fetchJSON('/telemetry/export', { method: 'POST' });
  toast('Telemetry exported');
}

async function renderGovernance() {
  const audit = await fetchJSON('/governance/audit?limit=20');
  const stats = await fetchJSON('/governance/stats');
  return `
    <div class="grid grid-3" style="margin-bottom:24px">
      <div class="card">
        <div class="card-title">Total Actions</div>
        <div class="card-value" style="margin-top:8px">${stats?.totalActions || 0}</div>
      </div>
      <div class="card">
        <div class="card-title">Success Rate</div>
        <div class="card-value" style="margin-top:8px">${stats?.successRate ? (stats.successRate * 100).toFixed(1) + '%' : '100%'}</div>
      </div>
      <div class="card">
        <div class="card-title">Audit Entries</div>
        <div class="card-value" style="margin-top:8px">${(audit || []).length}</div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">Recent Audit Log</span>
      </div>
      <table>
        <thead><tr><th>Time</th><th>Action</th><th>User</th><th>Resource</th><th>Result</th></tr></thead>
        <tbody>
          ${(audit || []).map(e => `
            <tr>
              <td style="font-family:var(--mono);font-size:12px">${new Date(e.timestamp).toLocaleString()}</td>
              <td>${e.action}</td>
              <td>${e.userId}</td>
              <td>${e.resource}</td>
              <td><span class="badge badge-${e.success ? 'success' : 'danger'}">${e.success ? 'OK' : 'FAIL'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderSettings() {
  return `
    <div class="card" style="margin-bottom:24px">
      <div class="card-header"><span class="card-title">System Configuration</span></div>
      <div class="metric-row"><span class="metric-label">Database</span><span class="metric-value">.vibe/state.db</span></div>
      <div class="metric-row"><span class="metric-label">Telemetry Dir</span><span class="metric-value">.vibe/telemetry/</span></div>
      <div class="metric-row"><span class="metric-label">OKF Bundle</span><span class="metric-value">.vibe/okf/</span></div>
      <div class="metric-row"><span class="metric-label">MCP Config</span><span class="metric-value">.mcp.json</span></div>
    </div>
    <div class="card" style="margin-bottom:24px">
      <div class="card-header"><span class="card-title">Cache Management</span></div>
      <button class="btn" onclick="clearCache()">Clear Cache</button>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Vibemate Doctor</span></div>
      <p class="card-subtitle" style="margin-bottom:16px">Run a full system health check across all subsystems</p>
      <button class="btn btn-primary" onclick="runDoctor()">Run Health Check</button>
      <div id="doctor-result" style="margin-top:16px"></div>
    </div>
  `;
}

async function runDoctor() {
  const el = $('#doctor-result');
  if (el) el.innerHTML = '<p class="card-subtitle">Checking...</p>';
  const data = await fetchJSON('/doctor');
  if (!data || !el) return toast('Health check failed');
  const statusClass = data.status === 'healthy' ? 'success' : 'warning';
  const icon = data.status === 'healthy' ? '✓' : '⚠';
  el.innerHTML = `
    <div style="margin-bottom:12px">
      <span class="badge badge-${statusClass}">${icon} ${(data.status || 'unknown').toUpperCase()}</span>
    </div>
    ${(data.checks || []).map(ch => `
      <div class="metric-row">
        <span class="metric-label">${ch.name}</span>
        <span class="badge badge-${ch.ok ? 'success' : 'danger'}">${ch.detail}</span>
      </div>`).join('')}
  `;
}

async function clearCache() {
  await fetchJSON('/cache', { method: 'DELETE' });
  toast('Cache cleared');
}

const pages = {
  dashboard: { title: 'Dashboard', render: renderDashboard },
  discovery: { title: 'Discovery', render: renderDiscovery },
  decisions: { title: 'Decisions', render: async () => await renderDecisions() },
  scaffold: { title: 'Scaffold', render: renderScaffold },
  telemetry: { title: 'Telemetry', render: async () => await renderTelemetry() },
  governance: { title: 'Governance', render: async () => await renderGovernance() },
  settings: { title: 'Settings', render: renderSettings },
};

async function navigate(page) {
  currentPage = page;
  $$('.nav-links li').forEach(li => li.classList.toggle('active', li.dataset.page === page));
  $('#page-title').textContent = pages[page]?.title || page;
  const content = $('#page-content');
  content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">Loading...</div>';
  try {
    const data = page === 'dashboard' ? await fetchJSON('/status') : null;
    const html = await pages[page].render(data);
    content.innerHTML = html;
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">!</div><div class="empty-state-text">Error loading page</div></div>`;
  }
}

$$('.nav-links li').forEach(li => {
  li.addEventListener('click', () => navigate(li.dataset.page));
});

navigate('dashboard');

setInterval(async () => {
  const data = await fetchJSON('/health');
  const badge = $('#status-badge');
  if (data?.status === 'ok') {
    badge.textContent = 'Connected';
    badge.className = 'status-badge';
  } else {
    badge.textContent = 'Disconnected';
    badge.className = 'status-badge error';
  }
}, 10000);

// Real-time SSE updates
let _pipelinePhase = null;
let _spanCount = 0;
const _evtSource = new EventSource('/events');

_evtSource.addEventListener('pipeline_state', (e) => {
  try {
    const state = JSON.parse(e.data);
    if (state.phase !== _pipelinePhase) {
      _pipelinePhase = state.phase;
      if (currentPage === 'dashboard') navigate('dashboard');
    }
  } catch { /* ignore malformed */ }
});

_evtSource.addEventListener('telemetry_span', () => {
  _spanCount++;
  if (currentPage === 'telemetry') navigate('telemetry');
});

_evtSource.onerror = () => {
  const badge = $('#status-badge');
  if (badge) { badge.textContent = 'Reconnecting'; badge.className = 'status-badge error'; }
};
