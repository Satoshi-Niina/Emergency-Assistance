import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteDebugger() {
  const location = useLocation();

  useEffect(() => {
    console.log('屮・・繝ｫ繝ｼ繝磯・遘ｻ:', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state,
      timestamp: new Date().toISOString()
    });
  }, [location]);

  return null; // 縺薙・繧ｳ繝ｳ繝昴・繝阪Φ繝医・菴輔ｂ繝ｬ繝ｳ繝繝ｪ繝ｳ繧ｰ縺励↑縺・
} 