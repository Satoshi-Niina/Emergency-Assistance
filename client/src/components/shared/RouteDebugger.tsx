import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteDebugger() {
  const location = useLocation();

  useEffect(() => {
    console.log('🛣️ ルート遷移:', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state,
      timestamp: new Date().toISOString()
    });
  }, [location]);

  return null; // このコンポーネントは何もレンダリングしない
} 