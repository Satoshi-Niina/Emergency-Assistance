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
 * 画像URLを変換する関数
 * シンプルなURLベースの画像表示
 */
export function convertImageUrl(url: any): string {
  if (!url) {
    return '';
  }
  // urlがオブジェクトの場合はurlプロパティを参照
  if (typeof url !== 'string') {
    if (typeof url.url === 'string') {
      url = url.url;
    } else {
      return '';
    }
  }
  // 既に完全なURLの場合はそのまま返す
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Base64データの場合はそのまま返す
  if (url.startsWith('data:image/')) {
    return url;
  }
  // 相対パスの場合はそのまま返す（静的ファイルとして配信）
  if (url.startsWith('/')) {
    return url;
  }
  // ファイル名のみの場合は、APIエンドポイントに変換
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  return `${apiBaseUrl}/api/troubleshooting/image/${url}`;
}
