import React, { useState } from 'react';
import { LoginForm } from './modules/auth/index.js';

export function App() {
  const [token, setToken] = useState<string | null>(null);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '32px' }}>
      <h1>Archon Protected App 🛡️</h1>
      <p>Modular Monolith Architecture with React & Express</p>
      <hr style={{ margin: '24px 0' }} />
      {token ? (
        <div>
          <p>Đăng nhập thành công! Token: <code>{token}</code></p>
          <button onClick={() => setToken(null)}>Đăng xuất</button>
        </div>
      ) : (
        <LoginForm onSuccess={(t) => setToken(t)} />
      )}
    </div>
  );
}

export default App;
