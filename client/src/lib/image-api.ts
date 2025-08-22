// 画像データベ�EスAPI用のユーチE��リチE��関数

// API設宁E- VITE_API_BASE_URLのみを使用
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

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

// 画像データをアチE�EローチE
export async function uploadImage(
    file: File,
    category?: string,
    description?: string
): Promise<{ success: boolean; imageId?: string; error?: string }> {
    try {
        const base64Data = await fileToBase64(file);
        
        const response = await fetch(`${API_BASE_URL}/api/images/upload`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fileName: file.name,
                originalFileName: file.name,
                mimeType: file.type,
                fileSize: file.size,
                data: base64Data,
                category,
                description
            }),
        });

        const result = await response.json();
        
        if (response.ok) {
            return { success: true, imageId: result.imageId };
        } else {
            return { success: false, error: result.error || 'アチE�Eロードに失敗しました' };
        }
    } catch (error) {
        console.error('画像アチE�Eロードエラー:', error);
        return { success: false, error: 'アチE�Eロード中にエラーが発生しました' };
    }
}

// 画像データを取征E
export function getImageUrl(imageId: string): string {
    return `${API_BASE_URL}/api/images/${imageId}`;
}

// カチE��リ別の画像一覧を取征E
export async function getImagesByCategory(category: string): Promise<ImageData[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/images/category/${category}`);
        
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
        const response = await fetch(`${API_BASE_URL}/api/images/search/${encodeURIComponent(query)}`);
        
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

// ファイルをBase64エンコーチE
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // data:image/jpeg;base64, の部刁E��除去
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

// Reactコンポ�Eネント用の画像表示コンポ�EネンチE
export function DatabaseImage({ 
    imageId, 
    alt, 
    className,
    onError 
}: { 
    imageId: string; 
    alt?: string; 
    className?: string;
    onError?: () => void;
}) {
    return (
        <img
            src={getImageUrl(imageId)}
            alt={alt || '画僁E}
            className={className}
            onError={onError}
        />
    );
} 
