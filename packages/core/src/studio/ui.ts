export function getStudioHtml(initialData: any): string {
  const jsonData = JSON.stringify(initialData);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ARCHON STUDIO 🛡️ AI Architectural Cockpit</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #07090e;
      --card-bg: rgba(13, 18, 30, 0.78);
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover-border: rgba(0, 240, 255, 0.3);
      --primary: #00f0ff;
      --primary-glow: rgba(0, 240, 255, 0.25);
      --secondary: #a855f7;
      --secondary-glow: rgba(168, 85, 247, 0.25);
      --accent: #10b981;
      --accent-glow: rgba(16, 185, 129, 0.25);
      --warning: #f59e0b;
      --danger: #ef4444;
      --danger-glow: rgba(239, 68, 68, 0.35);
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --surface: #0f1524;
      --surface-light: #162035;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      background: var(--bg);
      background-image: 
        radial-gradient(circle at 10% 15%, rgba(0, 240, 255, 0.07) 0%, transparent 45%),
        radial-gradient(circle at 90% 85%, rgba(168, 85, 247, 0.07) 0%, transparent 45%),
        radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.04) 0%, transparent 60%);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }

    /* Scrollbars */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: rgba(0, 240, 255, 0.4); }

    /* Header */
    header {
      border-bottom: 1px solid var(--card-border);
      padding: 0.85rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(7, 9, 14, 0.85);
      backdrop-filter: blur(16px);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 1.2rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .brand-badge {
      background: linear-gradient(135deg, #00f0ff 0%, #a855f7 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .cockpit-tag {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      background: rgba(0, 240, 255, 0.12);
      color: var(--primary);
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      border: 1px solid rgba(0, 240, 255, 0.3);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .live-pulse {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--accent);
      background: rgba(16, 185, 129, 0.08);
      padding: 0.3rem 0.7rem;
      border-radius: 9999px;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--accent);
      box-shadow: 0 0 10px var(--accent);
      animation: pulse 1.8s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    .btn {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--card-border);
      color: var(--text);
      font-family: inherit;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.45rem 0.9rem;
      border-radius: 0.5rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      transition: all 0.2s ease;
    }
    .btn:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: var(--primary);
      color: var(--primary);
    }
    .btn.active {
      background: rgba(0, 240, 255, 0.15);
      border-color: var(--primary);
      color: var(--primary);
    }
    .btn-primary {
      background: linear-gradient(135deg, #00f0ff 0%, #0284c7 100%);
      color: #000;
      border: none;
      font-weight: 700;
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #38bdf8 0%, #00f0ff 100%);
      box-shadow: 0 0 15px var(--primary-glow);
      color: #000;
    }

    /* Main Container */
    main {
      padding: 2rem;
      max-width: 1480px;
      margin: 0 auto;
      width: 100%;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1.8rem;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;
    }

    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 1rem;
      padding: 1.4rem;
      backdrop-filter: blur(16px);
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      position: relative;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    }
    .stat-card::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; height: 2px;
      background: linear-gradient(90deg, transparent, var(--primary), transparent);
      opacity: 0.5;
    }

    .stat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .stat-label {
      font-size: 0.8rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .stat-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
    }
    .stat-badge-healthy {
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent);
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .stat-badge-danger {
      background: rgba(239, 68, 68, 0.15);
      color: var(--danger);
      border: 1px solid rgba(239, 68, 68, 0.3);
    }

    .stat-value {
      font-size: 2.3rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.1;
    }
    .health-score {
      color: var(--accent);
      text-shadow: 0 0 25px rgba(16, 185, 129, 0.35);
    }
    .health-warning {
      color: var(--warning);
      text-shadow: 0 0 25px rgba(245, 158, 11, 0.35);
    }
    .health-danger {
      color: var(--danger);
      text-shadow: 0 0 25px rgba(239, 68, 68, 0.35);
    }

    .stat-sub {
      font-size: 0.82rem;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .progress-track {
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 9999px;
      overflow: hidden;
      margin: 0.3rem 0;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary), var(--accent));
      border-radius: 9999px;
      transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Tabs Bar */
    .tabs-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 0.75rem;
      overflow-x: auto;
    }
    .tab-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-family: inherit;
      font-size: 0.9rem;
      font-weight: 600;
      padding: 0.6rem 1.1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .tab-btn:hover {
      color: var(--text);
      background: rgba(255, 255, 255, 0.05);
    }
    .tab-btn.active {
      color: #fff;
      background: rgba(0, 240, 255, 0.12);
      border: 1px solid rgba(0, 240, 255, 0.25);
    }
    .tab-badge {
      font-size: 0.7rem;
      padding: 0.1rem 0.45rem;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.1);
      color: var(--text);
    }
    .tab-badge-error {
      background: var(--danger);
      color: #fff;
      font-weight: 700;
    }

    /* Tab Content Views */
    .tab-view {
      display: none;
      flex-direction: column;
      gap: 1.5rem;
    }
    .tab-view.active {
      display: flex;
    }

    /* GRAPH VIEW (Encore Flow style) */
    .graph-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 1rem;
      padding: 1.5rem;
      backdrop-filter: blur(16px);
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      min-height: 540px;
      position: relative;
    }
    .graph-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .filter-pills {
      display: flex;
      gap: 0.4rem;
    }
    .filter-pill {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.3rem 0.7rem;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.2s;
    }
    .filter-pill:hover, .filter-pill.active {
      color: var(--primary);
      border-color: var(--primary);
      background: rgba(0, 240, 255, 0.1);
    }

    .graph-canvas-container {
      position: relative;
      width: 100%;
      height: 480px;
      background: rgba(5, 7, 12, 0.75);
      border-radius: 0.75rem;
      border: 1px solid rgba(255, 255, 255, 0.05);
      overflow: hidden;
      display: flex;
    }
    .graph-svg {
      width: 100%;
      height: 100%;
    }

    /* Module Nodes in Graph */
    .node-group {
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    .node-group:hover {
      transform: scale(1.02);
    }
    .node-rect {
      fill: rgba(14, 20, 32, 0.92);
      stroke: rgba(255, 255, 255, 0.12);
      stroke-width: 1.5;
      rx: 10;
      filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.6));
      transition: all 0.2s;
    }
    .node-client .node-rect {
      stroke: rgba(0, 240, 255, 0.4);
    }
    .node-server .node-rect {
      stroke: rgba(168, 85, 247, 0.4);
    }
    .node-cycle .node-rect {
      stroke: var(--danger);
      stroke-width: 2.5;
      animation: danger-pulse 2s infinite;
    }
    @keyframes danger-pulse {
      0%, 100% { filter: drop-shadow(0 0 8px var(--danger-glow)); }
      50% { filter: drop-shadow(0 0 20px var(--danger-glow)); }
    }

    .edge-line {
      fill: none;
      stroke: rgba(255, 255, 255, 0.2);
      stroke-width: 1.8;
      stroke-dasharray: 4, 4;
      animation: edge-flow 20s linear infinite;
    }
    .edge-cycle {
      stroke: var(--danger);
      stroke-width: 2.8;
      stroke-dasharray: 6, 4;
      animation: edge-flow 8s linear infinite;
      filter: drop-shadow(0 0 6px var(--danger));
    }
    @keyframes edge-flow {
      to { stroke-dashoffset: -100; }
    }

    /* Node Inspector Drawer */
    .node-drawer {
      position: absolute;
      top: 1rem;
      right: 1rem;
      bottom: 1rem;
      width: 340px;
      background: rgba(14, 20, 32, 0.95);
      border: 1px solid var(--card-border);
      border-radius: 0.75rem;
      backdrop-filter: blur(20px);
      padding: 1.25rem;
      display: none;
      flex-direction: column;
      gap: 1rem;
      overflow-y: auto;
      z-index: 20;
      box-shadow: -8px 0 25px rgba(0, 0, 0, 0.5);
    }
    .node-drawer.open {
      display: flex;
    }

    /* MODULES GRID */
    .modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
      gap: 1.25rem;
    }
    .mod-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 0.85rem;
      padding: 1.35rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      transition: all 0.2s ease;
      position: relative;
    }
    .mod-card:hover {
      border-color: var(--primary);
      transform: translateY(-2px);
      box-shadow: 0 10px 28px rgba(0, 240, 255, 0.1);
    }
    .mod-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .mod-title {
      font-size: 1.1rem;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }
    .mod-tag {
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.2rem 0.55rem;
      border-radius: 0.375rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .tag-client {
      background: rgba(0, 240, 255, 0.12);
      color: var(--primary);
      border: 1px solid rgba(0, 240, 255, 0.3);
    }
    .tag-server {
      background: rgba(168, 85, 247, 0.12);
      color: var(--secondary);
      border: 1px solid rgba(168, 85, 247, 0.3);
    }

    .mod-gateway {
      font-size: 0.78rem;
      color: var(--text-muted);
      font-family: 'JetBrains Mono', monospace;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.3rem 0.6rem;
      border-radius: 0.3rem;
    }

    .mod-section-lbl {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      font-weight: 700;
    }

    .mod-exports {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .export-pill {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.72rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 0.25rem 0.55rem;
      border-radius: 0.3rem;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }

    .endpoints-list {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
    }
    .endpoint-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.04);
      padding: 0.35rem 0.65rem;
      border-radius: 0.35rem;
    }
    .endpoint-left {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .method-badge {
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.15rem 0.4rem;
      border-radius: 0.25rem;
    }
    .method-get { background: rgba(16, 185, 129, 0.2); color: var(--accent); }
    .method-post { background: rgba(0, 240, 255, 0.2); color: var(--primary); }
    .method-put { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
    .method-delete { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
    .schema-tag {
      font-size: 0.65rem;
      color: var(--secondary);
      background: rgba(168, 85, 247, 0.12);
      border: 1px solid rgba(168, 85, 247, 0.25);
      padding: 0.15rem 0.45rem;
      border-radius: 0.25rem;
    }

    /* VIOLATIONS VIEW */
    .violations-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .violation-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-left: 4px solid var(--danger);
      border-radius: 0.75rem;
      padding: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.25rem;
      backdrop-filter: blur(16px);
    }
    .violation-card.warning-card {
      border-left-color: var(--warning);
    }
    .violation-content {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      flex: 1;
    }
    .violation-title-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    .violation-badge {
      font-size: 0.65rem;
      font-weight: 800;
      padding: 0.15rem 0.45rem;
      border-radius: 0.25rem;
      text-transform: uppercase;
    }
    .badge-error { background: rgba(239, 68, 68, 0.2); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.4); }
    .badge-warning { background: rgba(245, 158, 11, 0.2); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.4); }
    .violation-rule {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82rem;
      font-weight: 700;
      color: #fff;
    }
    .violation-loc {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .violation-msg {
      font-size: 0.85rem;
      color: #cbd5e1;
      line-height: 1.4;
    }
    .violation-remediation {
      font-size: 0.78rem;
      color: var(--primary);
      background: rgba(0, 240, 255, 0.05);
      border: 1px solid rgba(0, 240, 255, 0.15);
      padding: 0.4rem 0.6rem;
      border-radius: 0.35rem;
      margin-top: 0.25rem;
    }

    .empty-violations {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 1rem;
      padding: 3.5rem 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 1rem;
    }
    .empty-icon {
      font-size: 3rem;
      filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.4));
    }

    /* CODE & SKELETON PREVIEW */
    .code-viewer-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 1rem;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .code-viewer-header {
      padding: 0.85rem 1.25rem;
      background: rgba(0, 0, 0, 0.4);
      border-bottom: 1px solid var(--card-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .code-pre {
      padding: 1.5rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.82rem;
      line-height: 1.6;
      color: #cbd5e1;
      overflow-x: auto;
      max-height: 600px;
      white-space: pre-wrap;
    }

    /* Toast Notification */
    .toast {
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: rgba(14, 20, 32, 0.95);
      border: 1px solid var(--primary);
      color: #fff;
      padding: 0.85rem 1.4rem;
      border-radius: 0.6rem;
      box-shadow: 0 10px 30px rgba(0, 240, 255, 0.25);
      font-size: 0.85rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      z-index: 999;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .toast.show {
      transform: translateY(0);
      opacity: 1;
    }

    @media (max-width: 900px) {
      header { padding: 0.75rem 1rem; }
      main { padding: 1rem; }
      .stats-grid { grid-template-columns: 1fr; }
      .modules-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

  <!-- Toast -->
  <div id="toast" class="toast">
    <span id="toast-icon">✨</span>
    <span id="toast-msg">Action completed</span>
  </div>

  <!-- Header -->
  <header>
    <div class="brand-wrap">
      <div class="brand">
        <span>🛡️</span>
        <span class="brand-badge">ARCHON STUDIO</span>
      </div>
      <span class="cockpit-tag">Cockpit</span>
    </div>

    <div class="header-actions">
      <div class="live-pulse">
        <div class="dot"></div>
        <span id="status-label">LIVE GUARDIAN SYNC</span>
      </div>
      <button class="btn" id="btn-autorefresh" onclick="toggleAutoRefresh()">
        <span>⚡ Auto: 3s</span>
      </button>
      <button class="btn" id="btn-sync" onclick="refreshData()">
        <span id="sync-icon">↻</span> Sync Now
      </button>
    </div>
  </header>

  <main>
    <!-- Hero Stats Grid -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Architectural Health</span>
          <span class="stat-badge stat-badge-healthy" id="health-badge">PRISTINE</span>
        </div>
        <div class="stat-value health-score" id="health-score">100%</div>
        <div class="stat-sub" id="health-breakdown">0 Violations • Pristine Boundaries</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">AI Token Shield</span>
          <span class="stat-badge stat-badge-healthy" id="token-badge">COMPRESSED</span>
        </div>
        <div class="stat-value" id="token-saved" style="color: var(--primary);">86.4%</div>
        <div class="progress-track">
          <div class="progress-fill" id="token-bar" style="width: 86.4%;"></div>
        </div>
        <div class="stat-sub" id="token-breakdown">~450k tokens saved per 100 prompts</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Modular Monolith</span>
          <span class="stat-badge stat-badge-healthy" id="circular-badge">0 CYCLES</span>
        </div>
        <div class="stat-value" id="module-count">--</div>
        <div class="stat-sub" id="module-breakdown">Client & Server isolated</div>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <span class="stat-label">Active Contracts</span>
          <span class="stat-badge stat-badge-healthy" id="contract-badge">MAPPED</span>
        </div>
        <div class="stat-value" id="symbols-count" style="color: var(--secondary);">--</div>
        <div class="stat-sub" id="contract-breakdown">0 Endpoints • 0 Public Gateways</div>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="tabs-bar">
      <button class="tab-btn active" onclick="switchTab('graph')">
        <span>🌐 Architecture Graph</span>
      </button>
      <button class="tab-btn" onclick="switchTab('modules')">
        <span>📦 Modules & Contracts</span>
        <span class="tab-badge" id="tab-modules-count">0</span>
      </button>
      <button class="tab-btn" onclick="switchTab('violations')">
        <span>🛡️ Guardian Violations</span>
        <span class="tab-badge" id="tab-violations-count">0</span>
      </button>
      <button class="tab-btn" onclick="switchTab('skeleton')">
        <span>🤖 AI Context Skeleton</span>
      </button>
    </div>

    <!-- TAB 1: ARCHITECTURE GRAPH (ENCORE FLOW) -->
    <div id="view-graph" class="tab-view active">
      <div class="graph-card">
        <div class="graph-controls">
          <div>
            <h3 style="font-size: 1.05rem; font-weight: 700;">Encore-style Modular Flow & Boundary Graph</h3>
            <p style="font-size: 0.8rem; color: var(--text-muted);">Visualizes Cross-Module imports (@/modules/*) and alerts circular dependencies.</p>
          </div>
          <div class="filter-pills">
            <span class="filter-pill active" onclick="setGraphFilter('all', this)">All Nodes</span>
            <span class="filter-pill" onclick="setGraphFilter('client', this)">Client</span>
            <span class="filter-pill" onclick="setGraphFilter('server', this)">Server</span>
            <span class="filter-pill" onclick="setGraphFilter('cycles', this)">Cycles Only</span>
          </div>
        </div>

        <div class="graph-canvas-container" id="graph-container">
          <svg class="graph-svg" id="graph-svg" viewBox="0 0 1000 480" preserveAspectRatio="xMidYMid meet">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(0, 240, 255, 0.6)"></path>
              </marker>
              <marker id="arrow-danger" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444"></path>
              </marker>
            </defs>
            <g id="svg-edges"></g>
            <g id="svg-nodes"></g>
          </svg>

          <!-- Selected Node Drawer -->
          <div class="node-drawer" id="node-drawer">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span id="drawer-title" style="font-weight: 700; font-family: 'JetBrains Mono'; font-size: 1rem; color: var(--primary);">@module</span>
              <button class="btn" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="closeDrawer()">✕</button>
            </div>
            <div id="drawer-content" style="display: flex; flex-direction: column; gap: 0.75rem;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: MODULES & CONTRACTS -->
    <div id="view-modules" class="tab-view">
      <div class="modules-grid" id="modules-container">
        <!-- Rendered via JS -->
      </div>
    </div>

    <!-- TAB 3: GUARDIAN VIOLATIONS & AUTO-FIX -->
    <div id="view-violations" class="tab-view">
      <div class="violations-container" id="violations-container">
        <!-- Rendered via JS -->
      </div>
    </div>

    <!-- TAB 4: AI CONTEXT SKELETON -->
    <div id="view-skeleton" class="tab-view">
      <div class="code-viewer-card">
        <div class="code-viewer-header">
          <div style="display: flex; gap: 0.5rem;">
            <button class="btn active" id="btn-tab-map" onclick="switchSkeletonTab('map')">.context/MAP.md</button>
            <button class="btn" id="btn-tab-contracts" onclick="switchSkeletonTab('contracts')">.context/contracts.d.ts</button>
          </div>
          <button class="btn" onclick="copySkeletonText()">📋 Copy to Clipboard</button>
        </div>
        <pre class="code-pre" id="skeleton-code-pre">Loading context...</pre>
      </div>
    </div>
  </main>

  <script>
    let appData = ${jsonData};
    let autoRefreshActive = true;
    let autoRefreshTimer = null;
    let currentGraphFilter = 'all';
    let currentSkeletonTab = 'map';

    function showToast(message, icon = '✨') {
      const toast = document.getElementById('toast');
      document.getElementById('toast-msg').innerText = message;
      document.getElementById('toast-icon').innerText = icon;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3500);
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));

      event.currentTarget.classList.add('active');
      document.getElementById('view-' + tabId).classList.add('active');

      if (tabId === 'graph') {
        renderGraph();
      }
    }

    function toggleAutoRefresh() {
      autoRefreshActive = !autoRefreshActive;
      const btn = document.getElementById('btn-autorefresh');
      if (autoRefreshActive) {
        btn.classList.add('active');
        btn.innerHTML = '<span>⚡ Auto: 3s</span>';
        startPolling();
        showToast('Auto-refresh activated (3s)', '⚡');
      } else {
        btn.classList.remove('active');
        btn.innerHTML = '<span>⏸ Paused</span>';
        clearInterval(autoRefreshTimer);
        showToast('Auto-refresh paused', '⏸');
      }
    }

    function startPolling() {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = setInterval(() => {
        if (autoRefreshActive) {
          fetchStatsSilent();
        }
      }, 3000);
    }

    async function fetchStatsSilent() {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          appData = await res.json();
          renderUI();
        }
      } catch (e) {
        console.warn('Sync poll failed:', e);
      }
    }

    async function refreshData() {
      const syncIcon = document.getElementById('sync-icon');
      syncIcon.style.animation = 'spin 0.6s linear infinite';
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          appData = await res.json();
          renderUI();
          showToast('Synchronized with project state!', '🔄');
        }
      } catch (err) {
        showToast('Failed to sync: ' + err.message, '⚠️');
      } finally {
        syncIcon.style.animation = '';
      }
    }

    async function triggerAutoFix(filePath) {
      showToast('Running AST Auto-Decomposer on ' + filePath + '...', '⏳');
      try {
        const res = await fetch('/api/fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Decomposed successfully! Code boundaries restored.', '🎉');
          await refreshData();
        } else {
          showToast('Could not decompose: ' + (data.result ? data.result.message : data.error), '⚠️');
        }
      } catch (e) {
        showToast('Auto-fix request failed: ' + e.message, '❌');
      }
    }

    function renderUI() {
      const modules = appData.skeleton ? appData.skeleton.modules : [];
      const report = appData.report || { violations: [], hasErrors: false };
      const tokenStats = appData.tokenStats || { savingsPct: 86.4, tokensSaved: 450000 };
      const cycles = appData.cycles || [];

      // 1. Health Score
      const score = appData.healthScore !== undefined ? appData.healthScore : 100;
      const healthEl = document.getElementById('health-score');
      const healthBadge = document.getElementById('health-badge');
      healthEl.innerText = score + '%';
      if (score >= 90) {
        healthEl.className = 'stat-value health-score';
        healthBadge.className = 'stat-badge stat-badge-healthy';
        healthBadge.innerText = 'PRISTINE';
      } else if (score >= 70) {
        healthEl.className = 'stat-value health-warning';
        healthBadge.className = 'stat-badge badge-warning';
        healthBadge.innerText = 'CAUTION';
      } else {
        healthEl.className = 'stat-value health-danger';
        healthBadge.className = 'stat-badge stat-badge-danger';
        healthBadge.innerText = 'DEGRADED';
      }
      document.getElementById('health-breakdown').innerText = 
        report.violations.length + ' Violations • ' + (report.hasErrors ? 'Build Blocked' : 'Clean Monolith');

      // 2. Token Savings
      document.getElementById('token-saved').innerText = tokenStats.savingsPct + '%';
      document.getElementById('token-bar').style.width = tokenStats.savingsPct + '%';
      document.getElementById('token-breakdown').innerText = 
        '~' + (tokenStats.tokensSaved || 0).toLocaleString() + ' tokens saved vs raw context';

      // 3. Modules Count
      document.getElementById('module-count').innerText = modules.length;
      const clientCount = modules.filter(m => m.side === 'client').length;
      const serverCount = modules.filter(m => m.side === 'server').length;
      document.getElementById('module-breakdown').innerText = clientCount + ' Client • ' + serverCount + ' Server';

      const circularBadge = document.getElementById('circular-badge');
      if (cycles.length > 0) {
        circularBadge.className = 'stat-badge stat-badge-danger';
        circularBadge.innerText = cycles.length + ' CYCLES!';
      } else {
        circularBadge.className = 'stat-badge stat-badge-healthy';
        circularBadge.innerText = '0 CYCLES';
      }

      // 4. Contracts & Symbols
      let totalExports = 0;
      let totalRoutes = 0;
      modules.forEach(m => {
        totalExports += (m.exports ? m.exports.length : 0);
        totalRoutes += (m.routes ? m.routes.length : 0);
      });
      document.getElementById('symbols-count').innerText = totalExports + totalRoutes;

      const driftReport = appData.driftReport || { issues: [], totalClientCalls: 0 };
      const driftIssues = driftReport.issues || [];
      const contractBadge = document.getElementById('contract-badge');

      if (driftIssues.length > 0) {
        contractBadge.className = 'stat-badge stat-badge-danger';
        contractBadge.innerText = driftIssues.length + ' DRIFTS!';
        document.getElementById('contract-breakdown').innerText = 
          totalRoutes + ' Routes • ' + driftIssues.length + ' Client API Mismatch';
      } else {
        contractBadge.className = 'stat-badge stat-badge-healthy';
        contractBadge.innerText = 'ZERO DRIFT';
        document.getElementById('contract-breakdown').innerText = 
          totalRoutes + ' Endpoints • ' + totalExports + ' Symbols • Synced';
      }

      // Tab badges
      const totalViolationsCount = report.violations.length + driftIssues.length;
      document.getElementById('tab-modules-count').innerText = modules.length;
      const violCountEl = document.getElementById('tab-violations-count');
      violCountEl.innerText = totalViolationsCount;
      if (totalViolationsCount > 0) {
        violCountEl.className = 'tab-badge tab-badge-error';
      } else {
        violCountEl.className = 'tab-badge';
      }

      // Render Modules List
      renderModules(modules);

      // Render Violations List
      renderViolations(report.violations, driftIssues);

      // Render Skeleton Code
      renderSkeletonCode();

      // Render Graph
      renderGraph();
    }

    function renderModules(modules) {
      const container = document.getElementById('modules-container');
      container.innerHTML = '';

      if (modules.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); padding: 2rem;">No modules found under client/src/modules or server/src/modules.</div>';
        return;
      }

      modules.forEach(m => {
        const card = document.createElement('div');
        card.className = 'mod-card';

        const routesHtml = m.routes && m.routes.length > 0 
          ? '<div class="mod-section-lbl" style="margin-top: 0.5rem;">API Endpoints (' + m.routes.length + ')</div>' +
            '<div class="endpoints-list">' + m.routes.map(r => 
              '<div class="endpoint-item">' +
                '<div class="endpoint-left">' +
                  '<span class="method-badge method-' + r.method.toLowerCase() + '">' + r.method + '</span>' +
                  '<span>' + r.path + '</span>' +
                '</div>' +
                (r.schema ? '<span class="schema-tag">' + r.schema + '</span>' : '') +
              '</div>'
            ).join('') + '</div>'
          : '';

        const exportsHtml = m.exports && m.exports.length > 0
          ? '<div class="mod-section-lbl">Public Gateway Exports (' + m.exports.length + ')</div>' +
            '<div class="mod-exports">' + m.exports.map(e => 
              '<span class="export-pill">' + (e.kind === 'component' ? '🎨 ' : e.kind === 'function' ? '⚡ ' : '📄 ') + e.name + '</span>'
            ).join('') + '</div>'
          : '<div style="font-size: 0.78rem; color: var(--text-muted); font-style: italic;">No public exports yet</div>';

        card.innerHTML = \`
          <div class="mod-header">
            <span class="mod-title">@/modules/\${m.moduleName}</span>
            <span class="mod-tag tag-\${m.side}">\${m.side}</span>
          </div>
          <div class="mod-gateway">Gateway: <code>\${m.gatewayPath}</code></div>
          \${exportsHtml}
          \${routesHtml}
        \`;

        container.appendChild(card);
      });
    }

    function renderViolations(violations, driftIssues = []) {
      const container = document.getElementById('violations-container');
      container.innerHTML = '';

      const totalCount = (violations ? violations.length : 0) + driftIssues.length;

      if (totalCount === 0) {
        container.innerHTML = \`
          <div class="empty-violations">
            <div class="empty-icon">🛡️</div>
            <h3 style="font-size: 1.3rem; font-weight: 800; color: var(--accent);">Architectural Boundaries Pristine!</h3>
            <p style="color: var(--text-muted); max-width: 500px; font-size: 0.9rem;">
              Zero line-limit violations, zero cross-boundary deep imports, zero circular dependencies, and zero API contract drift detected across the entire codebase.
            </p>
          </div>
        \`;
        return;
      }

      // Render Drift Issues first
      driftIssues.forEach((issue) => {
        const card = document.createElement('div');
        card.className = 'violation-card';
        card.innerHTML = \`
          <div class="violation-content">
            <div class="violation-title-row">
              <span class="violation-badge badge-error">CONTRACT DRIFT</span>
              <span class="violation-rule">\${issue.type}</span>
            </div>
            <div class="violation-loc">📍 \${issue.file}:\${issue.line}</div>
            <div class="violation-msg">\${issue.message}</div>
            <div class="violation-remediation">🛠️ \${issue.remediation}</div>
          </div>
        \`;
        container.appendChild(card);
      });

      // Render Linter Violations
      (violations || []).forEach((v) => {
        const card = document.createElement('div');
        const isError = v.severity === 'error';
        card.className = 'violation-card' + (isError ? '' : ' warning-card');

        const fixBtnHtml = v.suggestedFix && v.suggestedFix.type === 'decompose'
          ? \`<button class="btn btn-primary" style="margin-top: 0.5rem;" onclick="triggerAutoFix('\${v.file}')">⚡ Auto-Decompose (AST)</button>\`
          : '';

        card.innerHTML = \`
          <div class="violation-content">
            <div class="violation-title-row">
              <span class="violation-badge \${isError ? 'badge-error' : 'badge-warning'}">\${v.severity}</span>
              <span class="violation-rule">\${v.rule}</span>
            </div>
            <div class="violation-loc">📍 \${v.file}\${v.line ? ':' + v.line : ''}</div>
            <div class="violation-msg">\${v.message}</div>
            \${v.remediation ? '<div class="violation-remediation">💡 ' + v.remediation + '</div>' : ''}
            \${fixBtnHtml}
          </div>
        \`;

        container.appendChild(card);
      });
    }

    function setGraphFilter(filter, el) {
      currentGraphFilter = filter;
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      el.classList.add('active');
      renderGraph();
    }

    function renderGraph() {
      const modules = appData.skeleton ? appData.skeleton.modules : [];
      const edges = appData.edges || [];
      const cycles = appData.cycles || [];

      const svgNodes = document.getElementById('svg-nodes');
      const svgEdges = document.getElementById('svg-edges');
      if (!svgNodes || !svgEdges) return;

      svgNodes.innerHTML = '';
      svgEdges.innerHTML = '';

      let filteredMods = modules;
      if (currentGraphFilter === 'client') filteredMods = modules.filter(m => m.side === 'client');
      else if (currentGraphFilter === 'server') filteredMods = modules.filter(m => m.side === 'server');
      else if (currentGraphFilter === 'cycles') {
        const cycleModNames = new Set(cycles.flatMap(c => c.modules));
        filteredMods = modules.filter(m => cycleModNames.has(m.moduleName));
      }

      const clientMods = filteredMods.filter(m => m.side === 'client');
      const serverMods = filteredMods.filter(m => m.side === 'server');

      const nodeCoords = new Map();

      // Client modules placed on Left Column (X ~ 160)
      clientMods.forEach((m, idx) => {
        const y = 80 + idx * 110;
        nodeCoords.set(m.moduleName, { x: 160, y, mod: m });
      });

      // Server modules placed on Right Column (X ~ 740)
      serverMods.forEach((m, idx) => {
        const y = 80 + idx * 110;
        nodeCoords.set(m.moduleName, { x: 740, y, mod: m });
      });

      // If no modules
      if (filteredMods.length === 0) {
        svgNodes.innerHTML = '<text x="500" y="240" fill="#64748b" text-anchor="middle" font-size="16">No modules match current filter</text>';
        return;
      }

      // Check cycles
      const cyclePairs = new Set();
      cycles.forEach(c => {
        for (let i = 0; i < c.modules.length - 1; i++) {
          cyclePairs.add(c.modules[i] + '->' + c.modules[i+1]);
        }
      });

      // Draw Edges
      edges.forEach(e => {
        const fromPos = nodeCoords.get(e.from);
        const toPos = nodeCoords.get(e.to);
        if (!fromPos || !toPos) return;

        const isCycle = cyclePairs.has(e.from + '->' + e.to);

        const x1 = fromPos.x + 90;
        const y1 = fromPos.y + 35;
        const x2 = toPos.x - 90;
        const y2 = toPos.y + 35;

        const dx = (x2 - x1) * 0.5;
        const pathData = \`M \${x1} \${y1} C \${x1 + dx} \${y1}, \${x2 - dx} \${y2}, \${x2} \${y2}\`;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('class', isCycle ? 'edge-line edge-cycle' : 'edge-line');
        path.setAttribute('marker-end', isCycle ? 'url(#arrow-danger)' : 'url(#arrow)');

        svgEdges.appendChild(path);
      });

      // Draw Nodes
      nodeCoords.forEach((pos, modName) => {
        const m = pos.mod;
        const isCycleMod = cycles.some(c => c.modules.includes(modName));

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'node-group node-' + m.side + (isCycleMod ? ' node-cycle' : ''));
        g.setAttribute('transform', \`translate(\${pos.x - 100}, \${pos.y})\`);
        g.onclick = () => selectNode(m);

        // Rect
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('class', 'node-rect');
        rect.setAttribute('width', '200');
        rect.setAttribute('height', '70');

        // Text title
        const textTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textTitle.setAttribute('x', '15');
        textTitle.setAttribute('y', '30');
        textTitle.setAttribute('fill', '#f8fafc');
        textTitle.setAttribute('font-weight', '700');
        textTitle.setAttribute('font-family', 'JetBrains Mono');
        textTitle.setAttribute('font-size', '14');
        textTitle.textContent = m.moduleName;

        // Sub text
        const textSub = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textSub.setAttribute('x', '15');
        textSub.setAttribute('y', '52');
        textSub.setAttribute('fill', '#94a3b8');
        textSub.setAttribute('font-size', '11');
        const expCount = (m.exports ? m.exports.length : 0);
        const routeCount = (m.routes ? m.routes.length : 0);
        textSub.textContent = \`\${m.side.toUpperCase()} • \${expCount} exp • \${routeCount} routes\`;

        g.appendChild(rect);
        g.appendChild(textTitle);
        g.appendChild(textSub);

        svgNodes.appendChild(g);
      });
    }

    function selectNode(m) {
      const drawer = document.getElementById('node-drawer');
      const title = document.getElementById('drawer-title');
      const content = document.getElementById('drawer-content');

      title.innerText = '@/modules/' + m.moduleName;
      drawer.classList.add('open');

      const expList = m.exports && m.exports.length > 0 
        ? m.exports.map(e => '<li style="color: #cbd5e1;"><code>' + e.name + '</code> (' + e.kind + ')</li>').join('')
        : '<li style="color: var(--text-muted);">None</li>';

      const routesList = m.routes && m.routes.length > 0
        ? m.routes.map(r => '<li style="color: #cbd5e1;"><code>' + r.method + ' ' + r.path + '</code></li>').join('')
        : '<li style="color: var(--text-muted);">No routes</li>';

      content.innerHTML = \`
        <div style="font-size: 0.78rem; color: var(--text-muted);">Side: <b style="color: var(--primary);">\${m.side.toUpperCase()}</b></div>
        <div style="font-size: 0.78rem; color: var(--text-muted);">Gateway: <code>\${m.gatewayPath}</code></div>
        
        <div style="margin-top: 0.5rem; font-weight: 700; font-size: 0.8rem; color: #fff;">Public Exports:</div>
        <ul style="font-size: 0.75rem; padding-left: 1.2rem; display: flex; flex-direction: column; gap: 0.25rem;">
          \${expList}
        </ul>

        <div style="margin-top: 0.5rem; font-weight: 700; font-size: 0.8rem; color: #fff;">Route Endpoints:</div>
        <ul style="font-size: 0.75rem; padding-left: 1.2rem; display: flex; flex-direction: column; gap: 0.25rem;">
          \${routesList}
        </ul>
      \`;
    }

    function closeDrawer() {
      document.getElementById('node-drawer').classList.remove('open');
    }

    function switchSkeletonTab(tab) {
      currentSkeletonTab = tab;
      document.getElementById('btn-tab-map').classList.toggle('active', tab === 'map');
      document.getElementById('btn-tab-contracts').classList.toggle('active', tab === 'contracts');
      renderSkeletonCode();
    }

    function renderSkeletonCode() {
      const pre = document.getElementById('skeleton-code-pre');
      if (currentSkeletonTab === 'map') {
        pre.innerText = appData.contextMap || 'No context map generated yet.';
      } else {
        pre.innerText = appData.contractsDts || 'No contracts generated yet.';
      }
    }

    function copySkeletonText() {
      const text = currentSkeletonTab === 'map' ? appData.contextMap : appData.contractsDts;
      navigator.clipboard.writeText(text || '').then(() => {
        showToast('Copied to clipboard!', '📋');
      });
    }

    // Initial render & polling
    renderUI();
    startPolling();
  </script>
</body>
</html>`;
}
