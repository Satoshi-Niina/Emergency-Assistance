// 応急処置情報APIエンドポイントの例
import type { NextApiRequest, NextApiResponse } from 'next';

interface EmergencyProcedure {
  id: string;
  title: string;
  description: string;
  steps: string[];
  safetyNotes: string[];
  requiredTools: string[];
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

// サンプル応急処置データ
const emergencyProceduresData: EmergencyProcedure[] = [
  {
    id: 'ep_001',
    title: 'バッテリー充電の応急処置',
    description: 'バッテリーが弱った場合の応急充電手順',
    steps: [
      '安全確認: 作業環境の確認',
      '充電器の準備: 適切な充電器を用意',
      '接続: 正極・負極を正しく接続',
      '充電開始: 低電流で充電開始',
      '監視: 充電状況の定期的な確認',
      '完了確認: 電圧測定による完了確認'
    ],
    safetyNotes: [
      '充電中は火気厳禁',
      '過充電に注意',
      '充電器の定格を確認',
      '作業中は換気を確保'
    ],
    requiredTools: ['充電器', '電圧計', '保護具'],
    estimatedTime: 30,
    riskLevel: 'medium',
    category: '電気系'
  },
  {
    id: 'ep_002',
    title: '燃料漏れの応急処置',
    description: '燃料漏れが発生した場合の緊急対応',
    steps: [
      '即座にエンジンを停止',
      '火気を完全に除去',
      '漏れ箇所の特定',
      '応急的な漏れ止め',
      '専門家への連絡',
      '安全確保の継続'
    ],
    safetyNotes: [
      '絶対に火気を使用しない',
      '換気を十分に行う',
      '静電気に注意',
      '専門家の到着まで待機'
    ],
    requiredTools: ['漏れ止めテープ', '防護具', '換気設備'],
    estimatedTime: 15,
    riskLevel: 'critical',
    category: 'エンジン系'
  },
  {
    id: 'ep_003',
    title: '油圧漏れの応急処置',
    description: '油圧システムからの漏れに対する応急対応',
    steps: [
      'システムの停止',
      '漏れ箇所の確認',
      '応急的な漏れ止め',
      '油圧の確認',
      '安全確認',
      '専門家への連絡'
    ],
    safetyNotes: [
      '高圧油に注意',
      '皮膚への接触を避ける',
      '適切な保護具を使用',
      '作業環境の清潔保持'
    ],
    requiredTools: ['漏れ止め剤', '保護具', '清掃用具'],
    estimatedTime: 20,
    riskLevel: 'high',
    category: '油圧系'
  },
  {
    id: 'ep_004',
    title: 'ブレーキ異常の応急処置',
    description: 'ブレーキの効きが悪い場合の緊急対応',
    steps: [
      '安全な場所への移動',
      'エンジンの停止',
      'ブレーキシステムの確認',
      '応急的な調整',
      '専門家への連絡',
      '使用禁止の徹底'
    ],
    safetyNotes: [
      '絶対に運転しない',
      '安全な場所に移動',
      '専門家の到着まで待機',
      '他の作業員に周知'
    ],
    requiredTools: ['ブレーキ調整工具', '安全標識'],
    estimatedTime: 25,
    riskLevel: 'critical',
    category: '走行系'
  },
  {
    id: 'ep_005',
    title: 'エンジン過熱の応急処置',
    description: 'エンジンが過熱した場合の緊急対応',
    steps: [
      'エンジンの停止',
      '冷却システムの確認',
      '冷却水の補充',
      '温度の監視',
      '原因の特定',
      '専門家への連絡'
    ],
    safetyNotes: [
      '高温に注意',
      '冷却水の取り扱いに注意',
      'やけどに注意',
      '適切な冷却時間を確保'
    ],
    requiredTools: ['冷却水', '温度計', '保護具'],
    estimatedTime: 30,
    riskLevel: 'high',
    category: 'エンジン系'
  },
  {
    id: 'ep_006',
    title: '電気系統の応急処置',
    description: '電気系統の故障に対する応急対応',
    steps: [
      '電源の遮断',
      '故障箇所の特定',
      '応急的な修理',
      '動作確認',
      '安全確認',
      '専門家への連絡'
    ],
    safetyNotes: [
      '感電に注意',
      '適切な工具を使用',
      '作業環境の確認',
      '保護具の着用'
    ],
    requiredTools: ['電気工具', '保護具', '測定器'],
    estimatedTime: 20,
    riskLevel: 'medium',
    category: '電気系'
  },
  {
    id: 'ep_007',
    title: 'ブレーキパッド摩耗の応急処置',
    description: 'ブレーキパッドが摩耗した場合の緊急対応',
    steps: [
      '安全な場所への移動',
      'ブレーキパッドの確認',
      '応急的な調整',
      '使用制限の設定',
      '専門家への連絡',
      '部品交換の準備'
    ],
    safetyNotes: [
      '絶対に高速走行しない',
      'ブレーキ距離が長くなることを認識',
      '安全な場所でのみ使用',
      '専門家の到着まで待機'
    ],
    requiredTools: ['ブレーキ調整工具', '安全標識', '測定器'],
    estimatedTime: 15,
    riskLevel: 'high',
    category: 'ブレーキ系'
  },
  {
    id: 'ep_008',
    title: 'トルクコンバーター異常の応急処置',
    description: 'トルクコンバーターに異常が発生した場合の緊急対応',
    steps: [
      'エンジンの停止',
      'オイルレベルの確認',
      'オイル品質の確認',
      '応急的な調整',
      '専門家への連絡',
      '使用制限の設定'
    ],
    safetyNotes: [
      '異常音がする場合は使用禁止',
      'オイル漏れに注意',
      '過負荷運転を避ける',
      '専門家の診断を待つ'
    ],
    requiredTools: ['オイルレベルゲージ', '保護具', '清掃用具'],
    estimatedTime: 25,
    riskLevel: 'medium',
    category: 'トランスミッション系'
  },
  {
    id: 'ep_009',
    title: '冷却水漏れの応急処置',
    description: '冷却水が漏れている場合の緊急対応',
    steps: [
      'エンジンの停止',
      '漏れ箇所の特定',
      '応急的な漏れ止め',
      '冷却水の補充',
      '温度の監視',
      '専門家への連絡'
    ],
    safetyNotes: [
      '高温に注意',
      'やけどに注意',
      '適切な冷却時間を確保',
      '漏れ箇所の完全修復まで使用禁止'
    ],
    requiredTools: ['漏れ止め剤', '冷却水', '温度計', '保護具'],
    estimatedTime: 20,
    riskLevel: 'high',
    category: '冷却系'
  },
  {
    id: 'ep_010',
    title: '走行装置異常の応急処置',
    description: '走行装置に異常が発生した場合の緊急対応',
    steps: [
      '安全な場所への移動',
      '異常箇所の特定',
      '応急的な調整',
      '使用制限の設定',
      '専門家への連絡',
      '部品交換の準備'
    ],
    safetyNotes: [
      '異常音がする場合は使用禁止',
      '振動が激しい場合は停止',
      '安全な場所でのみ使用',
      '専門家の到着まで待機'
    ],
    requiredTools: ['調整工具', '安全標識', '測定器'],
    estimatedTime: 30,
    riskLevel: 'medium',
    category: '走行系'
  }
];

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<EmergencyProcedure[] | { error: string }>
) {
  if (req.method === 'GET') {
    // クエリパラメータによるフィルタリング
    const { category, riskLevel } = req.query;
    
    let filteredData = emergencyProceduresData;
    
    if (category) {
      filteredData = filteredData.filter(item => 
        item.category.toLowerCase().includes(category.toString().toLowerCase())
      );
    }
    
    if (riskLevel) {
      filteredData = filteredData.filter(item => 
        item.riskLevel === riskLevel
      );
    }
    
    res.status(200).json(filteredData);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
