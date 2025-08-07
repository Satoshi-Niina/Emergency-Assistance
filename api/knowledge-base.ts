// ナレッジベースAPIエンドポイントの例
import type { NextApiRequest, NextApiResponse } from 'next';

interface KnowledgeBaseItem {
  id: string;
  title: string;
  content: string;
  category: string;
  keywords: string[];
  lastUpdated: Date;
  source: string;
}

// サンプルナレッジベースデータ
const knowledgeBaseData: KnowledgeBaseItem[] = [
  {
    id: 'kb_001',
    title: 'エンジン始動不良の診断手順',
    content: 'エンジンが始動しない場合の段階的診断手順。バッテリー、燃料、スターター、点火システムの順で確認する。',
    category: 'エンジン系',
    keywords: ['エンジン', '始動', 'バッテリー', '燃料', 'スターター'],
    lastUpdated: new Date('2024-01-15'),
    source: '技術マニュアル'
  },
  {
    id: 'kb_002',
    title: 'バッテリー電圧の測定方法',
    content: 'バッテリーの電圧測定手順。12V以上が正常、10V以下は充電が必要。',
    category: '電気系',
    keywords: ['バッテリー', '電圧', '測定', '充電'],
    lastUpdated: new Date('2024-01-10'),
    source: '保守手順書'
  },
  {
    id: 'kb_003',
    title: '燃料システムの点検方法',
    content: '燃料フィルター、燃料ポンプ、インジェクターの点検手順。',
    category: 'エンジン系',
    keywords: ['燃料', 'フィルター', 'ポンプ', 'インジェクター'],
    lastUpdated: new Date('2024-01-20'),
    source: '点検マニュアル'
  },
  {
    id: 'kb_004',
    title: 'スターターシステムの故障診断',
    content: 'スターターの動作確認と故障箇所の特定方法。',
    category: 'エンジン系',
    keywords: ['スターター', '故障', '診断', '動作確認'],
    lastUpdated: new Date('2024-01-12'),
    source: '故障診断ガイド'
  },
  {
    id: 'kb_005',
    title: '安全作業の基本原則',
    content: '保守作業時の安全確認事項と作業手順。',
    category: '安全',
    keywords: ['安全', '作業', '確認', '手順'],
    lastUpdated: new Date('2024-01-08'),
    source: '安全マニュアル'
  },
  {
    id: 'kb_006',
    title: '油圧システムの点検方法',
    content: '油圧ポンプ、シリンダー、配管の点検とメンテナンス手順。',
    category: '油圧系',
    keywords: ['油圧', 'ポンプ', 'シリンダー', '配管'],
    lastUpdated: new Date('2024-01-18'),
    source: '油圧システムマニュアル'
  },
  {
    id: 'kb_007',
    title: 'ブレーキシステムの点検',
    content: 'ブレーキパッド、ディスク、油圧の点検方法。',
    category: '走行系',
    keywords: ['ブレーキ', 'パッド', 'ディスク', '油圧'],
    lastUpdated: new Date('2024-01-14'),
    source: 'ブレーキシステムガイド'
  },
  {
    id: 'kb_008',
    title: '定期点検の実施要領',
    content: '月次、年次点検の実施項目と判定基準。',
    category: '点検',
    keywords: ['定期点検', '月次', '年次', '判定基準'],
    lastUpdated: new Date('2024-01-16'),
    source: '点検基準書'
  },
  {
    id: 'kb_009',
    title: 'ブレーキシステム故障診断',
    content: 'ブレーキの効きが悪い場合の段階的診断手順。ブレーキパッドの摩耗、ブレーキフルードの劣化、ブレーキホースの損傷を確認する。',
    category: 'ブレーキ系',
    keywords: ['ブレーキ', '効き', 'パッド', 'フルード', 'ホース', '摩耗'],
    lastUpdated: new Date('2024-01-22'),
    source: 'ブレーキシステム技術マニュアル'
  },
  {
    id: 'kb_010',
    title: 'トルクコンバーター異常診断',
    content: 'トルクコンバーターの異常音や効率低下の診断方法。オイルレベル、オイル品質、内部部品の点検手順。',
    category: 'トランスミッション系',
    keywords: ['トルクコンバーター', 'トランスミッション', 'オイル', '異常音', '効率', '滑り'],
    lastUpdated: new Date('2024-01-24'),
    source: 'トランスミッション技術マニュアル'
  },
  {
    id: 'kb_011',
    title: '冷却システム故障診断',
    content: 'エンジンオーバーヒートの原因診断。冷却水の漏れ、ラジエーターの詰まり、ウォーターポンプの故障を確認する。',
    category: '冷却系',
    keywords: ['冷却', 'オーバーヒート', 'ラジエーター', 'ウォーターポンプ', '冷却水', '漏れ'],
    lastUpdated: new Date('2024-01-26'),
    source: '冷却システム技術マニュアル'
  },
  {
    id: 'kb_012',
    title: '走行装置故障診断',
    content: '走行時の異常音や振動の診断方法。チェーンの伸び、スプロケットの摩耗、ローラーの損傷を確認する。',
    category: '走行系',
    keywords: ['走行', 'チェーン', 'スプロケット', 'ローラー', '異常音', '振動', '摩耗'],
    lastUpdated: new Date('2024-01-28'),
    source: '走行装置技術マニュアル'
  }
];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<KnowledgeBaseItem[] | { error: string }>
) {
  if (req.method === 'GET') {
    // クエリパラメータによるフィルタリング
    const { category, keyword } = req.query;
    
    let filteredData = knowledgeBaseData;
    
    if (category) {
      filteredData = filteredData.filter(item => 
        item.category.toLowerCase().includes(category.toString().toLowerCase())
      );
    }
    
    if (keyword) {
      filteredData = filteredData.filter(item =>
        item.keywords.some(k => 
          k.toLowerCase().includes(keyword.toString().toLowerCase())
        ) ||
        item.title.toLowerCase().includes(keyword.toString().toLowerCase()) ||
        item.content.toLowerCase().includes(keyword.toString().toLowerCase())
      );
    }
    
    res.status(200).json(filteredData);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
