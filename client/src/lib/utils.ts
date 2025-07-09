import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * クラス名を結合するユーティリティ関数
 * clsxとtwMergeを使用して、テールウィンドCSSのクラスを効率的にマージします
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 選択されたフィールドを順序付けるユーティリティ関数
 * データベースクエリの結果を整形するのに使用します
 */
export function orderSelectedFields(fields: Record<string, any> | undefined | null): Record<string, any> {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    console.warn("Invalid fields argument:", fields);
    return {};
  }

  return Object.entries(fields).reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, any>);
}

/**
 * 画像URLを正しいAPIエンドポイントに変換する関数
 */
export function convertImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  
  // APIベースURLを取得
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  console.log('環境変数確認:', { 
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    apiBaseUrl: apiBaseUrl 
  });
  
  // 既に完全なURLの場合はそのまま返す
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log('完全なURLをそのまま返す:', url);
    return url;
  }
  
  // 既にAPIエンドポイント形式の場合はベースURLを追加
  if (url.startsWith('/api/emergency-flow/image/')) {
    const finalUrl = `${apiBaseUrl}${url}`;
    console.log('APIエンドポイント形式を変換:', { original: url, final: finalUrl });
    return finalUrl;
  }
  
  // ファイル名を抽出（パスセパレータを考慮）
  let fileName = url;
  if (url.includes('/')) {
    fileName = url.split('/').pop() || url;
  } else if (url.includes('\\')) {
    fileName = url.split('\\').pop() || url;
  }
  
  // ファイル名が空の場合は元のURLを返す
  if (!fileName || fileName === url) {
    console.log('ファイル名抽出失敗、元のURLを返す:', url);
    return url;
  }
  
  // 新しいAPIエンドポイント形式に変換して返す
  const finalUrl = `${apiBaseUrl}/api/emergency-flow/image/${fileName}`;
  console.log('画像URL変換完了:', { original: url, fileName: fileName, final: finalUrl });
  return finalUrl;
}
