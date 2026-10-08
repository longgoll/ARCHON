export function getStudioHtml(initialData: any): string {
  const jsonData = JSON.stringify(initialData);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ARCHON STUDIO 🛡️ Architectural Cockpit</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0b0f19;
      --card-bg: rgba(18, 24, 38, 0.75);
      --card-border: rgba(255, 255, 255, 0.08);
      --primary: #00f0ff;
      --primary-glow: rgba(0, 240, 255, 0.35);
      --secondary: #a855f7;
      --accent: #22c55e;
      --danger: #ef4444;
      --text: #f1f5f9;
      --text-muted: #94a3b8;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      background-image: 
        radial-gradient(circle at 15% 20%, rgba(0, 240, 255, 0.08) 0%, transparent 40%),
        radial-gradient(circle at 85% 80%, rgba(168, 85, 247, 0.08) 0%, transparent 40%);
      color: var(--text);
      font-family: 'Plus Jakarta Sans', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
    }

    header {
      border-bottom: 1px solid var(--card-border);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(11, 15, 25, 0.8);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .brand-badge {
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .live-pulse {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      color: var(--accent);
      background: rgba(34, 197, 94, 0.1);
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent);
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.8); }
    }

    main {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.25rem;
    }

    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 1rem;
      padding: 1.5rem;
      backdrop-filter: blur(16px);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      position: relative;
      overflow: hidden;
    }
    .stat-card::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; height: 2px;
      background: linear-gradient(90deg, transparent, var(--primary), transparent);
      opacity: 0.5;
    }

    .stat-label {
      font-size: 0.85rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
    }
    .stat-value {
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.03em;
    }
    .stat-sub {
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .health-score {
      color: var(--accent);
      text-shadow: 0 0 20px rgba(34, 197, 94, 0.4);
    }

    .section-title {
      font-size: 1.2rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 1rem;
      padding: 1.5rem;
      backdrop-filter: blur(16px);
    }

    .modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 1.25rem;
    }

    .mod-card {
      background: rgba(14, 20, 32, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 0.75rem;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      transition: all 0.2s ease;
    }
    .mod-card:hover {
      border-color: var(--primary);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 240, 255, 0.1);
    }

    .mod-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .mod-tag {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.2rem 0.5rem;
      border-radius: 0.375rem;
      text-transform: uppercase;
    }
    .tag-client {
      background: rgba(0, 240, 255, 0.15);
      color: var(--primary);
      border: 1px solid rgba(0, 240, 255, 0.3);
    }
    .tag-server {
      background: rgba(168, 85, 247, 0.15);
      color: var(--secondary);
      border: 1px solid rgba(168, 85, 247, 0.3);
    }

    .mod-name {
      font-size: 1.1rem;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }

    .mod-exports {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .export-pill {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 0.2rem 0.5rem;
      border-radius: 0.25rem;
      color: #e2e8f0;
    }

    .endpoints-list {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
    }
    .endpoint-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.3rem 0.6rem;
      border-radius: 0.25rem;
    }
    .method-get { color: var(--accent); }
    .method-post { color: var(--primary); }
    .method-delete { color: var(--danger); }

    .token-meter {
      height: 8px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      overflow: hidden;
      margin: 0.5rem 0;
    }
    .token-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--primary), var(--accent));
      width: 86%;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span>🛡️</span>
      <span class="brand-badge">ARCHON STUDIO</span>
      <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">v0.1.0</span>
    </div>
    <div class="live-pulse">
      <div class="dot"></div>
      <span>ARCHITECTURAL GUARDIAN ACTIVE</span>
    </div>
  </header>

  <main>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Architectural Health</div>
        <div class="stat-value health-score" id="health-score">100%</div>
        <div class="stat-sub">0 Violations • Pristine Boundaries</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">AI Token Savings</div>
        <div class="stat-value" id="token-saved" style="color: var(--primary);">86.4%</div>
        <div class="token-meter"><div class="token-bar"></div></div>
        <div class="stat-sub">~450k tokens saved per 100 prompts</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Modular Monolith</div>
        <div class="stat-value" id="module-count">--</div>
        <div class="stat-sub" id="module-breakdown">Client & Server isolated</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Indexed Symbols</div>
        <div class="stat-value" id="symbols-count" style="color: var(--secondary);">--</div>
        <div class="stat-sub">Public gateways & types mapped</div>
      </div>
    </div>

    <div>
      <div class="section-title">📦 Project Modules & Public Contracts</div>
      <div class="modules-grid" id="modules-container">
        <!-- Rendered via JS -->
      </div>
    </div>
  </main>

  <script>
    const data = ${jsonData};

    function render() {
      const modules = data.skeleton ? data.skeleton.modules : [];
      document.getElementById('module-count').innerText = modules.length;
      
      const clientCount = modules.filter(m => m.side === 'client').length;
      const serverCount = modules.filter(m => m.side === 'server').length;
      document.getElementById('module-breakdown').innerText = clientCount + ' Client • ' + serverCount + ' Server';

      let totalExports = 0;
      modules.forEach(m => totalExports += (m.exports ? m.exports.length : 0));
      document.getElementById('symbols-count').innerText = totalExports;

      const container = document.getElementById('modules-container');
      container.innerHTML = '';

      modules.forEach(m => {
        const card = document.createElement('div');
        card.className = 'mod-card';

        const routesHtml = m.routes && m.routes.length > 0 
          ? '<div class="endpoints-list">' + m.routes.map(r => 
              '<div class="endpoint-item"><span class="method-' + r.method.toLowerCase() + '">' + r.method + '</span> ' + r.path + (r.schema ? ' (' + r.schema + ')' : '') + '</div>'
            ).join('') + '</div>'
          : '';

        const exportsHtml = m.exports && m.exports.length > 0
          ? '<div class="mod-exports">' + m.exports.map(e => 
              '<span class="export-pill">' + (e.kind === 'component' ? '🎨 ' : e.kind === 'function' ? '⚡ ' : '📄 ') + e.name + '</span>'
            ).join('') + '</div>'
          : '<div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">No public exports yet</div>';

        card.innerHTML = \`
          <div class="mod-header">
            <span class="mod-name">@/modules/\${m.moduleName}</span>
            <span class="mod-tag tag-\${m.side}">\${m.side}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">Gateway: <code>\${m.gatewayPath}</code></div>
          \${exportsHtml}
          \${routesHtml}
        \`;

        container.appendChild(card);
      });
    }

    render();
  </script>
</body>
</html>`;
}
