
import { useState, useEffect } from 'react';

export default function App() {
  const [apiStatus, setApiStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [serverMessage, setServerMessage] = useState<string>('');

  useEffect(() => {
    // サーバーのヘルスチェック
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setApiStatus('success');
        setServerMessage('サーバーと正常に通信できています');
      })
      .catch(err => {
        setApiStatus('error');
        setServerMessage('サーバーとの通信に失敗しました');
        console.error('API Error:', err);
      });
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Tech Support Assistant</h1>
      <div style={{ 
        padding: '10px', 
        borderRadius: '5px',
        backgroundColor: apiStatus === 'success' ? '#d4edda' : apiStatus === 'error' ? '#f8d7da' : '#fff3cd',
        border: `1px solid ${apiStatus === 'success' ? '#c3e6cb' : apiStatus === 'error' ? '#f5c6cb' : '#ffeaa7'}`
      }}>
        <strong>ステータス:</strong> {apiStatus === 'loading' ? '接続中...' : serverMessage}
      </div>
      <p>アプリケーションが正常に起動しました。</p>
    </div>
  );
}
