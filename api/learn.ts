// 蟄ｦ鄙偵ョ繝ｼ繧ｿ菫晏ｭ連PI繧ｨ繝ｳ繝峨・繧､繝ｳ繝医・萓・
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
  learningData: string; // JSON譁・ｭ怜・
  sessionData: SessionData;
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; message: string } | { error: string }>
) {
  if (req.method === 'POST') {
    try {
      const { learningData, sessionData }: LearnRequest = req.body;

      // 蟄ｦ鄙偵ョ繝ｼ繧ｿ縺ｮ隗｣譫・
      let parsedLearningData: LearningData;
      try {
        parsedLearningData = JSON.parse(learningData);
      } catch (parseError) {
        console.error('蟄ｦ鄙偵ョ繝ｼ繧ｿ縺ｮJSON隗｣譫舌お繝ｩ繝ｼ:', parseError);
        return res.status(400).json({ error: 'Invalid learning data format' });
      }

      // 蟄ｦ鄙偵ョ繝ｼ繧ｿ縺ｮ讀懆ｨｼ
      if (!parsedLearningData.category || !parsedLearningData.solution) {
        return res.status(400).json({ error: 'Missing required learning data fields' });
      }

      // 繧ｻ繝・す繝ｧ繝ｳ繝・・繧ｿ縺ｮ讀懆ｨｼ
      if (!sessionData.problemDescription || !sessionData.answers) {
        return res.status(400).json({ error: 'Missing required session data fields' });
      }

      // 蟄ｦ鄙偵ョ繝ｼ繧ｿ縺ｮ菫晏ｭ伜・逅・ｼ亥ｮ滄圀縺ｮ螳溯｣・〒縺ｯ繝・・繧ｿ繝吶・繧ｹ縺ｫ菫晏ｭ假ｼ・
      console.log('蟄ｦ鄙偵ョ繝ｼ繧ｿ繧剃ｿ晏ｭ倅ｸｭ:', {
        learningData: parsedLearningData,
        sessionData: sessionData,
        timestamp: new Date().toISOString()
      });

      // 謌仙粥譎ゅ・繝ｬ繧ｹ繝昴Φ繧ｹ
      res.status(200).json({
        success: true,
        message: '蟄ｦ鄙偵ョ繝ｼ繧ｿ縺梧ｭ｣蟶ｸ縺ｫ菫晏ｭ倥＆繧後∪縺励◆'
      });

    } catch (error) {
      console.error('蟄ｦ鄙偵ョ繝ｼ繧ｿ菫晏ｭ倥お繝ｩ繝ｼ:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}


