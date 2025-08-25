import multer from "multer";

// 繝｡繝｢繝ｪ繧ｹ繝医Ξ繝ｼ繧ｸ繧剃ｽｿ逕ｨ縺励※繝輔ぃ繧､繝ｫ繧偵ヰ繝・ヵ繧｡縺ｨ縺励※菫晏ｭ・
const storage = multer.memoryStorage();

// 繝輔ぃ繧､繝ｫ繝輔ぅ繝ｫ繧ｿ繝ｼ
const fileFilter = (req: any, file: any, cb: any) => {
    // 逕ｻ蜒上ヵ繧｡繧､繝ｫ縺ｮ縺ｿ險ｱ蜿ｯ
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('逕ｻ蜒上ヵ繧｡繧､繝ｫ縺ｮ縺ｿ繧｢繝・・繝ｭ繝ｼ繝牙庄閭ｽ縺ｧ縺・), false);
    }
};

// multer險ｭ螳・
export const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB蛻ｶ髯・
    },
});
