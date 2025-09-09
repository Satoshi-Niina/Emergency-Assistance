// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - 型定義が未取得の場合でも実行時読み込みを試行
import * as appInsights from 'applicationinsights';

let started = false;

export function initInsights() {
  const conn = process.env.APPINSIGHTS_CONNECTION_STRING;
  if (!conn) {
    return null;
  }
  if (!started) {
    try {
      appInsights.setup(conn)
        .setAutoCollectRequests(true)
        .setAutoCollectExceptions(true)
        .setAutoCollectDependencies(true)
        .setAutoCollectConsole(true, true)
        .setSendLiveMetrics(false)
        .setAutoDependencyCorrelation(true)
        .start();
      started = true;
      console.log('📡 Application Insights initialized');
    } catch (e) {
      console.warn('App Insights init failed:', (e as Error).message);
    }
  }
  return appInsights.defaultClient || null;
}

export function trackAuditEvent(data: Record<string, unknown>) {
  if (!started) return;
  try {
    appInsights.defaultClient?.trackEvent({ name: 'auditLog', properties: data });
  } catch {}
}
