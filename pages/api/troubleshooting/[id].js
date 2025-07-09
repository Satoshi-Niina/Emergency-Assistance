"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const next_1 = require("next-auth/next");
const ____nextauth_1 = require("../auth/[...nextauth]");
async function handler(req, res) {
    try {
        // セッションの確認
        const session = await (0, next_1.getServerSession)(req, res, ____nextauth_1.authOptions);
        if (!session) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { id } = req.query;
        if (req.method === 'GET') {
            // ここでトラブルシューティングフローのデータを取得するロジックを実装
            // 仮のデータ構造
            const flowData = {
                id: id,
                title: 'サンプルフロー',
                steps: [
                    {
                        id: 'step1',
                        message: '最初のステップです',
                        checklist: ['項目1', '項目2'],
                        next: 'step2'
                    },
                    {
                        id: 'step2',
                        message: '次のステップです',
                        end: true
                    }
                ]
            };
            return res.status(200).json(flowData);
        }
        return res.status(405).json({ error: 'Method not allowed' });
    }
    catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
