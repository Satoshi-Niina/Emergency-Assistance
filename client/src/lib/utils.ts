import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * クラス名を結合するユーチE��リチE��関数
 * clsxとtwMergeを使用して、テールウィンドCSSのクラスを効玁E��にマ�EジしまぁE
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 選択されたフィールドを頁E��付けるユーチE��リチE��関数
 * チE�Eタベ�Eスクエリの結果を整形するのに使用しまぁE
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
 * 画像URLを正しいAPIエンド�Eイントに変換する関数
 */
export function convertImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  
  // API設宁E- VITE_API_BASE_URLのみを使用
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

  console.log('🔧 API設宁E', {
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    apiBaseUrl
  });
  
  // 既に完�EなURLの場合�Eそ�Eまま返す
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log('完�EなURLをそのまま返す:', url);
    return url;
  }
  
  // 既にAPIエンド�Eイント形式�E場合�Eベ�EスURLを追加
  if (url.startsWith('/api/emergency-flow/image/')) {
    const finalUrl = `${apiBaseUrl}${url}`;
    console.log('APIエンド�Eイント形式を変換:', { original: url, final: finalUrl });
    return finalUrl;
  }
  
  // ファイル名を抽出�E�パスセパレータを老E�E�E�E
  let fileName = url;
  if (url.includes('/')) {
    fileName = url.split('/').pop() || url;
  } else if (url.includes('\\')) {
    fileName = url.split('\\').pop() || url;
  }
  
  // ファイル名が空の場合�E允E�EURLを返す
  if (!fileName || fileName === url) {
    console.log('ファイル名抽出失敗、�EのURLを返す:', url);
    return url;
  }
  
  // 新しいAPIエンド�Eイント形式に変換して返す
  const finalUrl = `${apiBaseUrl}/api/emergency-flow/image/${fileName}`;
  console.log('画像URL変換完亁E', { original: url, fileName: fileName, final: finalUrl });
  return finalUrl;
}
