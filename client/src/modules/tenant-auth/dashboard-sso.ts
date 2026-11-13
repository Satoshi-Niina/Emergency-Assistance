import { buildApiUrl } from '../../lib/api';
import { setStoredTenantId } from './tenant-path';

export async function initializeDashboardSso(): Promise<void> {
  const url = new URL(window.location.href);
  const originParam = url.searchParams.get('sso_origin');
  if (!originParam) return;
  if (!window.opener || window.opener.closed) {
    throw new Error('ダッシュボードから起動し直してください。');
  }

  const dashboardOrigin = new URL(originParam).origin;
  const opener = window.opener;
  localStorage.removeItem('authToken');
  setStoredTenantId(null);

  await new Promise<void>((resolve, reject) => {
    let processing = false;
    const cleanup = () => {
      window.clearTimeout(timeout);
      window.removeEventListener('message', receiveContext);
    };
    const fail = (error: unknown) => {
      cleanup();
      opener.postMessage({ type: 'EXTERNAL_AUTH_FAILED' }, dashboardOrigin);
      reject(error instanceof Error ? error : new Error('認証連携に失敗しました。'));
    };
    const receiveContext = async (event: MessageEvent) => {
      if (event.source !== opener || event.origin !== dashboardOrigin || processing) return;
      if (event.data?.type !== 'EXTERNAL_AUTH_CONTEXT' || typeof event.data.token !== 'string') return;
      processing = true;
      try {
        const response = await fetch(buildApiUrl('/auth/dashboard-sso'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token: event.data.token }),
          signal: AbortSignal.timeout(10_000),
        });
        const result = await response.json();
        if (!response.ok || !result.success || typeof result.token !== 'string'
            || typeof result.user?.tenantId !== 'string') {
          throw new Error(result.message || '起動トークンを検証できませんでした。');
        }
        localStorage.setItem('authToken', result.token);
        setStoredTenantId(result.user.tenantId);
        url.searchParams.delete('sso_origin');
        window.history.replaceState(window.history.state, '', url.toString());
        cleanup();
        opener.postMessage({ type: 'EXTERNAL_AUTH_ACK' }, dashboardOrigin);
        resolve();
      } catch (error) {
        fail(error);
      }
    };
    const timeout = window.setTimeout(() => {
      if (!processing) fail(new Error('ダッシュボードとの認証連携がタイムアウトしました。'));
    }, 12_000);
    window.addEventListener('message', receiveContext);
    opener.postMessage({ type: 'EXTERNAL_AUTH_READY' }, dashboardOrigin);
  });
}
