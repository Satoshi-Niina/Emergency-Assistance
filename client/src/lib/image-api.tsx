// 画像データベースAPI用のユーティリティ関数
import React, { useState, useEffect } from 'react';
import { storage } from './api';

// API設定 - 環境変数から取得、フォールバックは相対パス
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_SERVICE_URL || '';

export interface ImageData {
  id: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: string;
  category?: string;
  description?: string;
  createdAt: string;
}

// 画像データをアップロード - 削除済み
// Base64アップロード機能は削除されました。FormDataを使用する新しいアップロード方式を使用してください。
// export async function uploadImage(...)

// 画像データを取得（SAS URL使用）
export async function getImageUrl(imageId: string): Promise<string> {
  try {
    // 画像パスを正規化（バックスラッシュをスラッシュに統一）
    const normalizedPath = imageId.replace(/\\/g, '/');

    // SAS URLを取得
    const response = await storage.getImageUrl(normalizedPath);
    return response.url;
  } catch (error) {
    console.error('Failed to get image SAS URL:', error);
    // フォールバック: 従来のAPIエンドポイント
    const fallbackBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_SERVICE_URL || '';
    return `${fallbackBaseUrl}/api/images/${imageId}`;
  }
}

// カテゴリ別の画像一覧を取得
export async function getImagesByCategory(
  category: string
): Promise<ImageData[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/images/category/${category}`
    );

    if (response.ok) {
      return await response.json();
    } else {
      console.error('画像一覧取得エラー:', response.statusText);
      return [];
    }
  } catch (error) {
    console.error('画像一覧取得エラー:', error);
    return [];
  }
}

// 画像を検索
export async function searchImages(query: string): Promise<ImageData[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/images/search/${encodeURIComponent(query)}`
    );

    if (response.ok) {
      return await response.json();
    } else {
      console.error('画像検索エラー:', response.statusText);
      return [];
    }
  } catch (error) {
    console.error('画像検索エラー:', error);
    return [];
  }
}

// 画像データを削除
export async function deleteImage(imageId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/images/${imageId}`, {
      method: 'DELETE',
    });

    return response.ok;
  } catch (error) {
    console.error('画像削除エラー:', error);
    return false;
  }
}

// ファイルをBase64エンコーディング - 削除済み
// function fileToBase64(file: File): Promise<string> { ... }


// Reactコンポーネント用の画像表示コンポーネント（SAS URL対応）
export function DatabaseImage({
  imageId,
  alt,
  className,
  onError,
}: {
  imageId: string;
  alt?: string;
  className?: string;
  onError?: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImageUrl = async () => {
      try {
        setLoading(true);
        const url = await getImageUrl(imageId);
        setImageUrl(url);
      } catch (error) {
        console.error('Failed to load image URL:', error);
        onError?.();
      } finally {
        setLoading(false);
      }
    };

    loadImageUrl();
  }, [imageId, onError]);

  if (loading) {
    return <div className={`${className} bg-gray-200 animate-pulse`}>Loading...</div>;
  }

  return (
    <img
      src={imageUrl}
      alt={alt || '画像'}
      className={className}
      onError={onError}
    />
  );
}
