﻿// 逕ｻ蜒上ョ繝ｼ繧ｿ繝吶・繧ｹAPI逕ｨ縺ｮ繝ｦ繝ｼ繝・ぅ繝ｪ繝・ぅ髢｢謨ｰ

// API險ｭ螳・- VITE_API_BASE_URL縺ｮ縺ｿ繧剃ｽｿ逕ｨ
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

// 逕ｻ蜒上ョ繝ｼ繧ｿ繧偵い繝・・繝ｭ繝ｼ繝・
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
            return { success: false, error: result.error || '繧｢繝・・繝ｭ繝ｼ繝峨↓螟ｱ謨励＠縺ｾ縺励◆' };
        }
    } catch (error) {
        console.error('逕ｻ蜒上い繝・・繝ｭ繝ｼ繝峨お繝ｩ繝ｼ:', error);
        return { success: false, error: '繧｢繝・・繝ｭ繝ｼ繝我ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆' };
    }
}

// 逕ｻ蜒上ョ繝ｼ繧ｿ繧貞叙蠕・
export function getImageUrl(imageId: string): string {
    return `${API_BASE_URL}/api/images/${imageId}`;
}

// 繧ｫ繝・ざ繝ｪ蛻･縺ｮ逕ｻ蜒丈ｸ隕ｧ繧貞叙蠕・
export async function getImagesByCategory(category: string): Promise<ImageData[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/images/category/${category}`);
        
        if (response.ok) {
            return await response.json();
        } else {
            console.error('逕ｻ蜒丈ｸ隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', response.statusText);
            return [];
        }
    } catch (error) {
        console.error('逕ｻ蜒丈ｸ隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
        return [];
    }
}

// 逕ｻ蜒上ｒ讀懃ｴ｢
export async function searchImages(query: string): Promise<ImageData[]> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/images/search/${encodeURIComponent(query)}`);
        
        if (response.ok) {
            return await response.json();
        } else {
            console.error('逕ｻ蜒乗､懃ｴ｢繧ｨ繝ｩ繝ｼ:', response.statusText);
            return [];
        }
    } catch (error) {
        console.error('逕ｻ蜒乗､懃ｴ｢繧ｨ繝ｩ繝ｼ:', error);
        return [];
    }
}

// 逕ｻ蜒上ョ繝ｼ繧ｿ繧貞炎髯､
export async function deleteImage(imageId: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/images/${imageId}`, {
            method: 'DELETE',
        });
        
        return response.ok;
    } catch (error) {
        console.error('逕ｻ蜒丞炎髯､繧ｨ繝ｩ繝ｼ:', error);
        return false;
    }
}

// 繝輔ぃ繧､繝ｫ繧達ase64繧ｨ繝ｳ繧ｳ繝ｼ繝・
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // data:image/jpeg;base64, 縺ｮ驛ｨ蛻・ｒ髯､蜴ｻ
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

// React繧ｳ繝ｳ繝昴・繝阪Φ繝育畑縺ｮ逕ｻ蜒剰｡ｨ遉ｺ繧ｳ繝ｳ繝昴・繝阪Φ繝・
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
            alt={alt || '逕ｻ蜒・}
            className={className}
            onError={onError}
        />
    );
} 


