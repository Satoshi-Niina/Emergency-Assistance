import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteDebugger() {
  const location = useLocation();

  useEffect(() => {
    console.log('🛣�E�Eルート�E移:', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state,
      timestamp: new Date().toISOString()
    });
  }, [location]);

  return null; // こ�Eコンポ�Eネント�E何もレンダリングしなぁE
} 
