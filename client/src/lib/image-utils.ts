/**
 * 画像URL変換ユーティリティ
 * 統一された画像URL変換ロジックを提供
 */

// 統一APIクライアントからAPIベースURLを取得
function getApiBaseUrl(): string {
  // 動的インポートで統一APIクライアントを使用
  try {
    // ブラウザ環境でのみ実行
    if (typeof window !== 'undefined') {
      // 統一APIクライアントの設定を参照
      const isProduction = import.meta.env.PROD;
      const isDevelopment = import.meta.env.DEV;
      const isLocalhost = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
      const isAzureStaticWebApp = /\.azurestaticapps\.net$/i.test(window.location.hostname);
      
      // 環境変数が設定されている場合は最優先
      if (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim() !== '') {
        return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
      }
      
      // Azure Static Web Appの場合は相対パスを使用
      if (isAzureStaticWebApp) {
        return '';
      }
      
      // ローカル開発環境
      if (isDevelopment && isLocalhost) {
        return 'http://localhost:8000';
      }
      
      // 本番環境のデフォルト
      return 'https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net';
    }
  } catch (error) {
    console.warn('APIベースURL取得エラー:', error);
  }
  
  // フォールバック
  return 'http://localhost:8000';
}

/**
 * 画像URLを正しいAPIエンドポイントに変換
 * @param url 画像URL（文字列またはオブジェクト）
 * @returns 変換された画像URL
 */
export function convertImageUrl(url: any): string {
  console.log('🖼️ convertImageUrl 開始:', { url, type: typeof url });
  
  if (!url) {
    console.log('❌ URLが空です');
    return '';
  }
  
  // urlがオブジェクトの場合はurlプロパティを参照
  if (typeof url !== 'string') {
    if (typeof url.url === 'string') {
      url = url.url;
      console.log('🔄 オブジェクトからURLを抽出:', url);
    } else {
      console.log('❌ 有効なURLが見つかりません');
      return '';
    }
  }

  // 既に完全なURLの場合はそのまま返す
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log('✅ 完全なURL:', url);
    return url;
  }

  // Base64データの場合はそのまま返す
  if (url.startsWith('data:image/')) {
    console.log('✅ Base64データ:', url.substring(0, 50) + '...');
    return url;
  }
  
  // APIパスの場合は完全なURLに変換
  if (url.startsWith('/api/')) {
    const apiBaseUrl = getApiBaseUrl();
    const fullUrl = `${apiBaseUrl}${url}`;
    console.log('✅ APIパス変換:', { original: url, apiBaseUrl, fullUrl });
    return fullUrl;
  }
  
  // その他の相対パスの場合はそのまま返す（静的ファイルとして配信）
  if (url.startsWith('/')) {
    console.log('✅ 相対パス:', url);
    return url;
  }
  
  // ファイル名のみの場合は、APIエンドポイントに変換
  const apiBaseUrl = getApiBaseUrl();
  console.log('🔧 APIベースURL:', apiBaseUrl);
  
  // ファイル名を抽出（パスから最後の部分を取得）
  let fileName = url;
  if (url.includes('/')) {
    fileName = url.split('/').pop() || url;
  } else if (url.includes('\\')) {
    fileName = url.split('\\').pop() || url;
  }
  
  console.log('📁 ファイル名抽出:', { original: url, fileName });
  
  // emergency-flow APIエンドポイントを優先使用
  if (fileName.includes('emergency-flow-step') || url.includes('/api/emergency-flow/image/')) {
    const emergencyUrl = `${apiBaseUrl}/api/emergency-flow/image/${fileName}`;
    console.log('✅ emergency-flow URL:', emergencyUrl);
    return emergencyUrl;
  }
  
  // その他の場合はtroubleshooting APIエンドポイントを使用
  const troubleshootingUrl = `${apiBaseUrl}/api/troubleshooting/image/${fileName}`;
  console.log('✅ troubleshooting URL:', troubleshootingUrl);
  return troubleshootingUrl;
}

/**
 * 画像URLを正しく構築する関数（後方互換性のため）
 * @param imageUrl 画像URL
 * @returns 構築された画像URL
 */
export function buildImageUrl(imageUrl: string): string {
  return convertImageUrl(imageUrl);
}

/**
 * 画像読み込みエラーハンドリング
 * @param e エラーイベント
 * @param imageUrl 画像URL
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  imageUrl: string
): void {
  const imgElement = e.currentTarget;
  console.error('画像表示エラー:', imageUrl);

  // 元のURLをログ出力
  console.log('元の画像URL:', imageUrl);
  console.log('変換後のURL:', imgElement.src);

  // エラー時のフォールバック処理
  try {
    const apiBaseUrl = getApiBaseUrl();

    // 1. ファイル名のみで再試行
    const fileName = imageUrl.split('/').pop()?.split('\\').pop();
    if (fileName && fileName !== imageUrl) {
      console.log('ファイル名のみで再試行:', fileName);
      imgElement.src = `${apiBaseUrl}/api/emergency-flow/image/${fileName}`;
      return;
    }

    // 2. 元のURLをそのまま使用
    console.log('元のURLをそのまま使用');
    imgElement.src = imageUrl;
  } catch (error) {
    console.error('画像エラーハンドリング失敗:', error);
    imgElement.src =
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBDMTE2LjU2OSA3MCAxMzAgODMuNDMxIDEzMCAxMDBDMTMwIDExNi41NjkgMTE2LjU2OSAxMzAgMTAwIDEzMEM4My40MzEgMTMwIDcwIDExNi41NjkgNzAgMTAwQzcwIDgzLjQzMSA4My40MzEgNzAgMTAwIDcwWiIgZmlsbD0iIzlDQTBBNiIvPgo8cGF0aCBkPSJNMTAwIDE0MEMxMTYuNTY5IDE0MCAxMzAgMTUzLjQzMSAxMzAgMTcwQzEzMCAxODYuNTY5IDExNi41NjkgMjAwIDEwMCAyMDBDODMuNDMxIDIwMCA3MCAxODYuNTY5IDcwIDE3MEM3MCAxNTMuNDMxIDgzLjQzMSAxNDAgMTAwIDE0MFoiIGZpbGw9IiM5Q0EwQTYiLz4KPHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDIwQzIwIDE3LjIzOSAyMi4yMzkgMTUgMjUgMTVIMzVDMzcuNzYxIDE1IDQwIDE3LjIzOSA0MCAyMFYzMEM0MCAzMi43NjEgMzcuNzYxIDM1IDM1IDM1SDI1QzIyLjIzOSAzNSAyMCAzMi43NjEgMjAgMzBWMjBaIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNSAxN0MyNSAxNi40NDc3IDI1LjQ0NzcgMTYgMjYgMTZIMzRDMzQuNTUyMyAxNiAzNSAxNi40NDc3IDM1IDE3VjI5QzM1IDI5LjU1MjMgMzQuNTUyMyAzMCAzNCAzMEgyNkMyNS40NDc3IDMwIDI1IDI5LjU1MjMgMjUgMjlWMTdaIiBmaWxsPSIjOTlBM0Y2Ii8+Cjwvc3ZnPgo8L3N2Zz4K';
  }
}

/**
 * UTF-8安全なBase64エンコーディング
 * @param str エンコードする文字列
 * @returns Base64エンコードされた文字列
 */
export function utf8ToBase64(str: string): string {
  try {
    // UTF-8エンコーディングを正しく処理
    const utf8Bytes = new TextEncoder().encode(str);
    const base64 = btoa(String.fromCharCode(...utf8Bytes));
    return base64;
  } catch (e) {
    console.error('Failed to base64 encode:', str, e);
    // フォールバック: 従来の方法
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (e2) {
      console.error('Fallback encoding also failed:', e2);
      return btoa(str); // 最後のフォールバック
    }
  }
}
