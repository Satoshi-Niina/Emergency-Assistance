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
  
  // 既に正しいAPIエンドポイント形式の場合はそのまま返す
  if (url.startsWith('/api/emergency-flow/image/')) {
    return url;
  }
  
  // 外部URLの場合はそのまま返す
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
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
    return url;
  }
  
  // 新しいAPIエンドポイント形式に変換して返す
  return `/api/emergency-flow/image/${fileName}`;
}
