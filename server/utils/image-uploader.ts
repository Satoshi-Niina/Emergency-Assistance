import multer from 'multer';

// メモリストレージを使用してファイルをバッファとして保存
const storage = multer.memoryStorage();

// ファイルフィルター
const fileFilter = (req: any, file: any, cb: any) => {
  // 画像ファイルのみ許可
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('画像ファイルのみアップロード可能です'), false);
  }
};

// multer設定
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB制限
  },
}); 