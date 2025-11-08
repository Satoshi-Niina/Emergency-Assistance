import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
export function orderSelectedFields(
  fields: Record<string, any> | undefined | null
): Record<string, any> {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    console.warn('Invalid fields argument:', fields);
    return {};
  }

  return Object.entries(fields).reduce(
    (acc, [key, value]) => {
      acc[key] = value;
      return acc;
    },
    {} as Record<string, any>
  );
}

// 画像URL変換関数は image-utils.ts に移動しました
// 後方互換性のため、ここから再エクスポート
export { convertImageUrl, buildImageUrl, handleImageError, utf8ToBase64 } from './image-utils';
