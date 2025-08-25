import multer from "multer";

// 繝｡繝｢繝ｪ繧ｹ繝医Ξ繝ｼ繧ｸ繧剃ｽｿ逕ｨ縺励※繝輔ぃ繧､繝ｫ繧偵ヰ繝・ヵ繧｡縺ｨ縺励※菫晏ｭ・
const storage = multer.memoryStorage();

// 繝輔ぃ繧､繝ｫ繝輔ぅ繝ｫ繧ｿ繝ｼ
const fileFilter = (req: any, file: any, cb: any) => {
    // 險ｱ蜿ｯ縺吶ｋMIME繧ｿ繧､繝・
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];
    
    // MIME繧ｿ繧､繝励′遨ｺ縺ｮ蝣ｴ蜷医√ヵ繧｡繧､繝ｫ諡｡蠑ｵ蟄舌〒繝√ぉ繝・け
    const originalName = file.originalname;
    const extension = originalName.split('.').pop()?.toLowerCase() || '';
    const hasValidMimeType = allowedMimes.includes(file.mimetype);
    const hasValidExtension = allowedExtensions.includes(`.${extension}`);
    
    console.log('剥 Multer 繝輔ぃ繧､繝ｫ蠖｢蠑上メ繧ｧ繝・け:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        extension: extension,
        hasValidMimeType: hasValidMimeType,
        hasValidExtension: hasValidExtension
    });
    
    if (hasValidMimeType || hasValidExtension) {
        cb(null, true);
    } else {
        console.error('笶・Multer: 蟇ｾ蠢懊＠縺ｦ縺・↑縺・ヵ繧｡繧､繝ｫ蠖｢蠑・', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            extension: extension
        });
        cb(new Error('蟇ｾ蠢懊＠縺ｦ縺・↑縺・ヵ繧｡繧､繝ｫ蠖｢蠑上〒縺吶・PEG縲￣NG縲；IF縲仝ebP縲？EIC繝輔ぃ繧､繝ｫ繧偵し繝昴・繝医＠縺ｦ縺・∪縺吶・), false);
    }
};

// multer縺ｮ險ｭ螳・
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// 繝・ヵ繧ｩ繝ｫ繝医お繧ｯ繧ｹ繝昴・繝医ｂ谿九☆・亥ｾ梧婿莠呈鋤諤ｧ縺ｮ縺溘ａ・・
export default upload;
