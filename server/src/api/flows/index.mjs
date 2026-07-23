import fs from 'fs/promises';
import path from 'path';

export default async function (req, res) {
  const method = req.method;
  const path = req.path;
  
  try {
    console.log('Flows API processed a request.', {
      method,
      path,
    });

    // OPTIONSリクエストの処理
    if (method === 'OPTIONS') {
      res.set({
        'Access-Control-Allow-Origin': '*', // 必要に応じて調整
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie',
        'Access-Control-Max-Age': '86400',
      });
      return res.status(200).send('');
    }

    const flowsDir = path.join(process.cwd(), 'knowledge-base', 'flows');
    const flows = [];

    try {
      const entries = await fs.readdir(flowsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const filePath = path.join(flowsDir, entry.name);
        const stats = await fs.stat(filePath);
        flows.push({
          name: entry.name,
          displayName: entry.name,
          size: stats.size,
          lastModified: stats.mtime,
          contentType: 'application/json',
          url: `/knowledge-base/flows/${entry.name}`,
        });
      }
    } catch (readError) {
      console.warn('Flows directory not found or not readable:', readError.message);
    }

    return res.status(200).json({
        success: true,
        data: flows
    });

  } catch (error) {
    console.error('Error in flows function:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}
