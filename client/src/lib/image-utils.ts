/**
 * 画像URL変換ユーティリティ
 * 統一された画像URL変換ロジックを提供
 */

// 動的にAPIベースURLを取得する関数
function getApiBaseUrl(): string {
  try {
    // ブラウザ環境でのみ実行
    if (typeof window !== 'undefined') {
      // runtime-configが利用可能な場合は最優先で使用
      if (window.runtimeConfig && window.runtimeConfig.API_BASE_URL) {
        const apiBaseUrl = window.runtimeConfig.API_BASE_URL.replace(/\/$/, '');
        console.log('🔧 runtime-configからAPI_BASE_URL取得:', apiBaseUrl);
        // /apiが含まれている場合は削除（後で適切に追加するため）
        return apiBaseUrl.replace(/\/api$/, '');
      }
      
      // 環境変数が設定されている場合
      if (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.trim() !== '') {
        return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
      }
      
      // 環境判定によるフォールバック
      const isLocalhost = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
      const isAzureStaticWebApp = /\.azurestaticapps\.net$/i.test(window.location.hostname);
      
      // Azure Static Web Appの場合は相対パス
      if (isAzureStaticWebApp) {
        return '';
      }
      
      // ローカル開発環境 - Viteプロキシを使用するため現在のoriginを使用
      if (isLocalhost) {
        // 開発環境では現在のoriginを使用（Viteプロキシが適切にルーティング）
        return window.location.origin;
      }
      
      // 本番環境のデフォルト
      return 'https://emergencyassistance-sv-fbanemhrbshuf9bd.japanwest-01.azurewebsites.net';
    }
  } catch (error) {
    console.warn('APIベースURL取得エラー:', error);
  }
  
  // フォールバック - 現在のoriginを使用
  return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
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

  // レガシーポート参照の自動修正
  if (typeof url === 'string' && url.includes('localhost:8000')) {
    // 現在のoriginを使用して動的に修正
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:8081';
    const correctedUrl = url.replace(/http:\/\/localhost:8000/g, currentOrigin);
    console.log('🔧 レガシーポート修正:', { original: url, corrected: correctedUrl, currentOrigin });
    return correctedUrl;
  }

  // 既に完全なURLの場合
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log('✅ 完全なURL:', url);
    return url;
  }

  // Base64データの場合はそのまま返す
  if (url.startsWith('data:image/')) {
    console.log('✅ Base64データ:', url.substring(0, 50) + '...');
    return url;
  }
  
  // APIパスの場合の処理 - /api/emergency-flow/image/ または /api/troubleshooting/image/ の場合
  if (url.startsWith('/api/emergency-flow/image/') || url.startsWith('/api/troubleshooting/image/')) {
    // ファイル名を抽出
    const fileName = url.split('/').pop() || url.split('\\').pop() || url;
    
    // 開発環境でViteプロキシを使用する場合は相対パスを再構築
    if (import.meta.env.DEV && window.location.hostname.includes('localhost')) {
      // emergency-flow画像の場合は emergency-flow APIエンドポイントを使用
      if (url.includes('emergency-flow')) {
        const emergencyUrl = `/api/emergency-flow/image/${fileName}`;
        console.log('✅ emergency-flow URL（プロキシ、再構築）:', { original: url, fileName, emergencyUrl });
        return emergencyUrl;
      }
      // troubleshooting画像の場合は troubleshooting APIエンドポイントを使用
      const troubleshootingUrl = `/api/troubleshooting/image/${fileName}`;
      console.log('✅ troubleshooting URL（プロキシ、再構築）:', { original: url, fileName, troubleshootingUrl });
      return troubleshootingUrl;
    }
    
    // 本番環境や他の環境では完全なURLに変換
    const apiBaseUrl = getApiBaseUrl();
    if (url.includes('emergency-flow')) {
      const emergencyUrl = `${apiBaseUrl}/api/emergency-flow/image/${fileName}`;
      console.log('✅ emergency-flow URL（完全URL）:', { original: url, fileName, apiBaseUrl, emergencyUrl });
      return emergencyUrl;
    }
    const troubleshootingUrl = `${apiBaseUrl}/api/troubleshooting/image/${fileName}`;
    console.log('✅ troubleshooting URL（完全URL）:', { original: url, fileName, apiBaseUrl, troubleshootingUrl });
    return troubleshootingUrl;
  }

  // その他のAPIパスの場合の処理 - Viteのプロキシを使用する場合は相対パスのまま返す
  if (url.startsWith('/api/')) {
    // 開発環境でViteプロキシを使用する場合は相対パスのまま
    if (import.meta.env.DEV && window.location.hostname.includes('localhost')) {
      console.log('✅ 開発環境のAPIパス（プロキシ使用）:', url);
      return url;
    }
    
    // 本番環境や他の環境では完全なURLに変換
    const apiBaseUrl = getApiBaseUrl();
    const fullUrl = `${apiBaseUrl}${url}`;
    console.log('✅ APIパス変換（完全URL）:', { original: url, apiBaseUrl, fullUrl });
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
    // 開発環境でViteプロキシを使用する場合は相対パス
    if (import.meta.env.DEV && window.location.hostname.includes('localhost')) {
      const emergencyUrl = `/api/emergency-flow/image/${fileName}`;
      console.log('✅ emergency-flow URL（プロキシ）:', emergencyUrl);
      return emergencyUrl;
    }
    
    // 本番環境では完全URL
    const emergencyUrl = `${apiBaseUrl}/api/emergency-flow/image/${fileName}`;
    console.log('✅ emergency-flow URL:', emergencyUrl);
    return emergencyUrl;
  }
  
  // その他の場合はtroubleshooting APIエンドポイントを使用
  if (import.meta.env.DEV && window.location.hostname.includes('localhost')) {
    const troubleshootingUrl = `/api/troubleshooting/image/${fileName}`;
    console.log('✅ troubleshooting URL（プロキシ）:', troubleshootingUrl);
    return troubleshootingUrl;
  }
  
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
  const result = convertImageUrl(imageUrl);
  console.log('🔧 buildImageUrl -> convertImageUrl:', { input: imageUrl, output: result });
  return result;
}

// 画像エラー再試行回数を追跡するMap
const imageErrorCounts = new Map<string, number>();
const MAX_RETRY_COUNT = 2;

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
  const currentSrc = imgElement.src;
  
  // 再試行回数をチェック
  const retryCount = imageErrorCounts.get(currentSrc) || 0;
  console.error('画像表示エラー:', {
    imageUrl,
    currentSrc,
    retryCount,
    maxRetries: MAX_RETRY_COUNT
  });

  // 最大再試行回数に達した場合はプレースホルダーを表示
  if (retryCount >= MAX_RETRY_COUNT) {
    console.error('❌ 最大再試行回数に達しました。プレースホルダー画像を表示します。');
    imgElement.src =
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBDMTE2LjU2OSA3MCAxMzAgODMuNDMxIDEzMCAxMDBDMTMwIDExNi41NjkgMTE2LjU2OSAxMzAgMTAwIDEzMEM4My40MzEgMTMwIDcwIDExNi41NjkgNzAgMTAwQzcwIDgzLjQzMSA4My40MzEgNzAgMTAwIDcwWiIgZmlsbD0iIzlDQTBBNiIvPgo8cGF0aCBkPSJNMTAwIDE0MEMxMTYuNTY5IDE0MCAxMzAgMTUzLjQzMSAxMzAgMTcwQzEzMCAxODYuNTY5IDExNi41NjkgMjAwIDEwMCAyMDBDODMuNDMxIDIwMCA3MCAxODYuNTY5IDcwIDE3MEM3MCAxNTMuNDMxIDgzLjQzMSAxNDAgMTAwIDE0MFoiIGZpbGw9IiM5Q0EwQTYiLz4KPHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDIwQzIwIDE3LjIzOSAyMi4yMzkgMTUgMjUgMTVIMzVDMzcuNzYxIDE1IDQwIDE3LjIzOSA0MCAyMFYzMEM0MCAzMi43NjEgMzcuNzYxIDM1IDM1IDM1SDI1QzIyLjIzOSAzNSAyMCAzMi43NjEgMjAgMzBWMjBaIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNSAxN0MyNSAxNi40NDc3IDI1LjQ0NzcgMTYgMjYgMTZIMzRDMzQuNTUyMyAxNiAzNSAxNi40NDc3IDM1IDE3VjI5QzM1IDI5LjU1MjMgMzQuNTUyMyAzMCAzNCAzMEgyNkMyNS40NDc3IDMwIDI1IDI5LjU1MjMgMjUgMjlWMTdaIiBmaWxsPSIjOTlBM0Y2Ii8+Cjwvc3ZnPgo8L3N2Zz4K';
    imageErrorCounts.delete(currentSrc);
    return;
  }

  // 再試行回数を増やす
  imageErrorCounts.set(currentSrc, retryCount + 1);

  // エラー時のフォールバック処理
  try {
    const apiBaseUrl = getApiBaseUrl();

    // ファイル名を抽出（元のimageUrlから、またはcurrentSrcから）
    let fileName: string | undefined;
    
    // まず、currentSrcからファイル名を抽出を試みる（既に変換済みURLの場合）
    const currentSrcFileName = currentSrc.split('/').pop() || currentSrc.split('\\').pop();
    if (currentSrcFileName && currentSrcFileName.includes('emergency-flow-step')) {
      fileName = currentSrcFileName;
      console.log('📁 currentSrcからファイル名を抽出:', fileName);
    } else {
      // 元のimageUrlからファイル名を抽出
      if (imageUrl.includes('/')) {
        fileName = imageUrl.split('/').pop();
      } else if (imageUrl.includes('\\')) {
        fileName = imageUrl.split('\\').pop();
      } else {
        fileName = imageUrl;
      }
      console.log('📁 imageUrlからファイル名を抽出:', fileName);
    }

    // ファイル名が取得できた場合のみ再試行
    if (fileName && fileName.trim() !== '' && fileName.includes('emergency-flow-step')) {
      console.log('🔄 画像再試行:', { 
        original: imageUrl,
        currentSrc: currentSrc,
        fileName,
        retryCount: retryCount + 1,
        maxRetries: MAX_RETRY_COUNT
      });
      
      // 開発環境では相対パスを優先（Viteプロキシ経由）
      if (import.meta.env.DEV && window.location.hostname.includes('localhost')) {
        const newUrl = `/api/emergency-flow/image/${fileName}`;
        // 現在のURLと異なり、かつ相対パス形式でない場合のみ再試行
        if (newUrl !== currentSrc && !currentSrc.endsWith(`/api/emergency-flow/image/${fileName}`)) {
          console.log('✅ 新しいURLで再試行（相対パス）:', newUrl);
          // 再試行回数をクリアしてから新しいURLで試行
          imageErrorCounts.delete(currentSrc);
          imageErrorCounts.set(newUrl, retryCount + 1);
          imgElement.src = newUrl;
          return;
        }
      } else {
        // 本番環境では完全URL
        const newUrl = `${apiBaseUrl}/api/emergency-flow/image/${fileName}`;
        if (newUrl !== currentSrc && !currentSrc.endsWith(`/api/emergency-flow/image/${fileName}`)) {
          console.log('✅ 新しいURLで再試行（完全URL）:', newUrl);
          // 再試行回数をクリアしてから新しいURLで試行
          imageErrorCounts.delete(currentSrc);
          imageErrorCounts.set(newUrl, retryCount + 1);
          imgElement.src = newUrl;
          return;
        }
      }
    }

    // 再試行できない場合はプレースホルダーを表示
    console.warn('⚠️ 再試行できません。プレースホルダー画像を表示します。');
    imgElement.src =
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBDMTE2LjU2OSA3MCAxMzAgODMuNDMxIDEzMCAxMDBDMTMwIDExNi41NjkgMTE2LjU2OSAxMzAgMTAwIDEzMEM4My40MzEgMTMwIDcwIDExNi41NjkgNzAgMTAwQzcwIDgzLjQzMSA4My40MzEgNzAgMTAwIDcwWiIgZmlsbD0iIzlDQTBBNiIvPgo8cGF0aCBkPSJNMTAwIDE0MEMxMTYuNTY5IDE0MCAxMzAgMTUzLjQzMSAxMzAgMTcwQzEzMCAxODYuNTY5IDExNi41NjkgMjAwIDEwMCAyMDBDODMuNDMxIDIwMCA3MCAxODYuNTY5IDcwIDE3MEM3MCAxNTMuNDMxIDgzLjQzMSAxNDAgMTAwIDE0MFoiIGZpbGw9IiM5Q0EwQTYiLz4KPHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDIwQzIwIDE3LjIzOSAyMi4yMzkgMTUgMjUgMTVIMzVDMzcuNzYxIDE1IDQwIDE3LjIzOSA0MCAyMFYzMEM0MCAzMi43NjEgMzcuNzYxIDM1IDM1IDM1SDI1QzIyLjIzOSAzNSAyMCAzMi43NjEgMjAgMzBWMjBaIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNSAxN0MyNSAxNi40NDc3IDI1LjQ0NzcgMTYgMjYgMTZIMzRDMzQuNTUyMyAxNiAzNSAxNi40NDc3IDM1IDE3VjI5QzM1IDI5LjU1MjMgMzQuNTUyMyAzMCAzNCAzMEgyNkMyNS40NDc3IDMwIDI1IDI5LjU1MjMgMjUgMjlWMTdaIiBmaWxsPSIjOTlBM0Y2Ii8+Cjwvc3ZnPgo8L3N2Zz4K';
    imageErrorCounts.delete(currentSrc);
  } catch (error) {
    console.error('❌ 画像エラーハンドリング失敗:', error);
    imgElement.src =
      'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBDMTE2LjU2OSA3MCAxMzAgODMuNDMxIDEzMCAxMDBDMTMwIDExNi41NjkgMTE2LjU2OSAxMzAgMTAwIDEzMEM4My40MzEgMTMwIDcwIDExNi41NjkgNzAgMTAwQzcwIDgzLjQzMSA4My40MzEgNzAgMTAwIDcwWiIgZmlsbD0iIzlDQTBBNiIvPgo8cGF0aCBkPSJNMTAwIDE0MEMxMTYuNTY5IDE0MCAxMzAgMTUzLjQzMSAxMzAgMTcwQzEzMCAxODYuNTY5IDExNi41NjkgMjAwIDEwMCAyMDBDODMuNDMxIDIwMCA3MCAxODYuNTY5IDcwIDE3MEM3MCAxNTMuNDMxIDgzLjQzMSAxNDAgMTAwIDE0MFoiIGZpbGw9IiM5Q0EwQTYiLz4KPHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDIwQzIwIDE3LjIzOSAyMi4yMzkgMTUgMjUgMTVIMzVDMzcuNzYxIDE1IDQwIDE3LjIzOSA0MCAyMFYzMEM0MCAzMi43NjEgMzcuNzYxIDM1IDM1IDM1SDI1QzIyLjIzOSAzNSAyMCAzMi43NjEgMjAgMzBWMjBaIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNSAxN0MyNSAxNi40NDc3IDI1LjQ0NzcgMTYgMjYgMTZIMzRDMzQuNTUyMyAxNiAzNSAxNi40NDc3IDM1IDE3VjI5QzM1IDI5LjU1MjMgMzQuNTUyMyAzMCAzNCAzMEgyNkMyNS40NDc3IDMwIDI1IDI5LjU1MjMgMjUgMjlWMTdaIiBmaWxsPSIjOTlBM0Y2Ii8+Cjwvc3ZnPgo8L3N2Zz4K';
    imageErrorCounts.delete(currentSrc);
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
