import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 正しいknowledge-base/jsonディレクトリのパスを設定
    const metadataDir = path.join(process.cwd(), 'knowledge-base', 'json');
    
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(metadataDir)) {
      fs.mkdirSync(metadataDir, { recursive: true });
    }

    // JSONファイルの一覧を取得（実際に存在するファイルのみ）
    const files = fs.readdirSync(metadataDir)
      .filter(file => file.endsWith('_metadata.json'))
      .filter(file => {
        const filePath = path.join(metadataDir, file);
        return fs.existsSync(filePath);
      })
      .sort((a, b) => {
        // 最新のファイルを先頭に
        const statA = fs.statSync(path.join(metadataDir, a));
        const statB = fs.statSync(path.join(metadataDir, b));
        return statB.mtime.getTime() - statA.mtime.getTime();
      });

    res.status(200).json(files);
  } catch (error) {
    console.error('Error listing JSON files:', error);
    res.status(500).json({ error: 'Failed to list JSON files' });
  }
} 