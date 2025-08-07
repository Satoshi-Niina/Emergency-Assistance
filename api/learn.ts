// 学習データ保存APIエンドポイントの例
import type { NextApiRequest, NextApiResponse } from 'next';

interface LearningData {
  category: string;
  keywords: string[];
  summary: string;
  solution: string;
  prevention: string;
  lessonsLearned: string;
  improvementSuggestions: string;
}

interface SessionData {
  problemDescription: string;
  answers: any[];
  solution: string;
  success: boolean;
  userFeedback?: string;
}

interface LearnRequest {
  learningData: string; // JSON文字列
  sessionData: SessionData;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; message: string } | { error: string }>
) {
  if (req.method === 'POST') {
    try {
      const { learningData, sessionData }: LearnRequest = req.body;

      // 学習データの解析
      let parsedLearningData: LearningData;
      try {
        parsedLearningData = JSON.parse(learningData);
      } catch (parseError) {
        console.error('学習データのJSON解析エラー:', parseError);
        return res.status(400).json({ error: 'Invalid learning data format' });
      }

      // 学習データの検証
      if (!parsedLearningData.category || !parsedLearningData.solution) {
        return res.status(400).json({ error: 'Missing required learning data fields' });
      }

      // セッションデータの検証
      if (!sessionData.problemDescription || !sessionData.answers) {
        return res.status(400).json({ error: 'Missing required session data fields' });
      }

      // 学習データの保存処理（実際の実装ではデータベースに保存）
      console.log('学習データを保存中:', {
        learningData: parsedLearningData,
        sessionData: sessionData,
        timestamp: new Date().toISOString()
      });

      // 成功時のレスポンス
      res.status(200).json({
        success: true,
        message: '学習データが正常に保存されました'
      });

    } catch (error) {
      console.error('学習データ保存エラー:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
