import multer from "multer";

// メモリストレージを使用してファイルをバッファとして保存
const storage = multer.memoryStorage();

// ファイルフィルター
const fileFilter = (req: any, file: any, cb: any) => {
    // 許可するMIMEタイプ
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
    
    // MIMEタイプが空の場合、ファイル拡張子でチェック
    const originalName = file.originalname;
    const extension = originalName.split('.').pop()?.toLowerCase() || '';
    const hasValidMimeType = allowedMimes.includes(file.mimetype);
    const hasValidExtension = allowedExtensions.includes(`.${extension}`);
    
    console.log('🔍 Multer ファイル形式チェック:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        extension: extension,
        hasValidMimeType: hasValidMimeType,
        hasValidExtension: hasValidExtension
    });
    
    if (hasValidMimeType || hasValidExtension) {
        cb(null, true);
    } else {
        console.error('❌ Multer: 対応していないファイル形式:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            extension: extension
        });
        cb(new Error('対応していないファイル形式です。JPEG、PNG、GIF、WebP、HEICファイルをサポートしています。'), false);
    }
};

// multerの設定
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// デフォルトエクスポートも残す（後方互換性のため）
export default upload;
