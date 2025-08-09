import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Car,
  Wrench,
  AlertTriangle,
  Brain,
  Clock,
  Phone,
  Zap,
  Battery,
  Settings,
  Tool,
  Shield,
  Search,
  Lightbulb,
  Thermometer,
  Move
} from 'lucide-react';
import EmergencyQAFlow from './emergency-qa-flow';
import EnhancedQAFlow from './enhanced-qa-flow';

interface QAFlowInitiatorProps {
  onStartFlow: (flowType: string, problemDescription: string) => void;
  onEmergencyContact: () => void;
  onExit: () => void;
}

interface ProblemType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  emergencyLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedTime: number;
  requiresExpert: boolean;
}

const PROBLEM_TYPES: ProblemType[] = [
  {
    id: 'engine_start',
    name: 'エンジンがかからない',
    description: 'エンジンが正常に始動しない問題',
    icon: <Car className="h-6 w-6" />,
    category: 'エンジン系',
    emergencyLevel: 'medium',
    estimatedTime: 30,
    requiresExpert: false
  },
  {
    id: 'engine_noise',
    name: 'エンジンから異音がする',
    description: 'エンジンから異常な音が発生する問題',
    icon: <AlertTriangle className="h-6 w-6" />,
    category: 'エンジン系',
    emergencyLevel: 'high',
    estimatedTime: 45,
    requiresExpert: true
  },
  {
    id: 'battery_issue',
    name: 'バッテリーの問題',
    description: 'バッテリーの充電や接続に関する問題',
    icon: <Battery className="h-6 w-6" />,
    category: '電気系',
    emergencyLevel: 'medium',
    estimatedTime: 20,
    requiresExpert: false
  },
  {
    id: 'lighting_issue',
    name: '照明・灯火の問題',
    description: '室内灯や作業灯が点灯しない問題',
    icon: <Zap className="h-6 w-6" />,
    category: '電気系',
    emergencyLevel: 'low',
    estimatedTime: 15,
    requiresExpert: false
  },
  {
    id: 'hydraulic_issue',
    name: '油圧システムの問題',
    description: '油圧ポンプやシリンダーの動作不良',
    icon: <Settings className="h-6 w-6" />,
    category: '油圧系',
    emergencyLevel: 'high',
    estimatedTime: 60,
    requiresExpert: true
  },
  {
    id: 'brake_issue',
    name: 'ブレーキの問題',
    description: 'ブレーキの効きが悪い、異音がする',
    icon: <Shield className="h-6 w-6" />,
    category: '走行系',
    emergencyLevel: 'critical',
    estimatedTime: 45,
    requiresExpert: true
  },
  {
    id: 'crane_issue',
    name: 'クレーン・作業装置の問題',
    description: 'クレーンやウインチの動作不良',
    icon: <Tool className="h-6 w-6" />,
    category: '作業装置系',
    emergencyLevel: 'high',
    estimatedTime: 90,
    requiresExpert: true
  },
  {
    id: 'safety_issue',
    name: '安全装置の問題',
    description: '非常停止や安全スイッチの動作不良',
    icon: <AlertTriangle className="h-6 w-6" />,
    category: '安全装置系',
    emergencyLevel: 'critical',
    estimatedTime: 30,
    requiresExpert: true
  },
  {
    id: 'transmission_issue',
    name: 'トランスミッション・トルクコンバーターの問題',
    description: '変速不良、トルクコンバーターの異常音や効率低下',
    icon: <Settings className="h-6 w-6" />,
    category: 'トランスミッション系',
    emergencyLevel: 'high',
    estimatedTime: 60,
    requiresExpert: true
  },
  {
    id: 'cooling_issue',
    name: '冷却システムの問題',
    description: 'エンジンオーバーヒート、冷却水漏れ',
    icon: <Thermometer className="h-6 w-6" />,
    category: '冷却系',
    emergencyLevel: 'high',
    estimatedTime: 45,
    requiresExpert: true
  },
  {
    id: 'travel_issue',
    name: '走行装置の問題',
    description: '走行時の異常音、振動、チェーンの伸び',
    icon: <Move className="h-6 w-6" />,
    category: '走行系',
    emergencyLevel: 'medium',
    estimatedTime: 40,
    requiresExpert: false
  }
];

export default function QAFlowInitiator({
  onStartFlow,
  onEmergencyContact,
  onExit
}: QAFlowInitiatorProps) {
  const [selectedProblem, setSelectedProblem] = useState<ProblemType | null>(null);
  const [showEmergencyFlow, setShowEmergencyFlow] = useState(false);
  const [showEnhancedFlow, setShowEnhancedFlow] = useState(false);
  const [problemDescription, setProblemDescription] = useState('');

  const handleProblemSelect = (problem: ProblemType) => {
    setSelectedProblem(problem);
    
    // 緊急度が高い場合は直接フローを開始
    if (problem.emergencyLevel === 'critical') {
      setShowEmergencyFlow(true);
    }
  };

        const handleStartFlow = () => {
        if (selectedProblem) {
          const description = problemDescription || selectedProblem.description;
          
          // すべての問題タイプでEnhancedQAFlowを使用（AI駆動の動的診断）
          setShowEnhancedFlow(true);
        }
      };

  const handleEmergencyContact = () => {
    onEmergencyContact();
  };

  const getEmergencyLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEmergencyLevelText = (level: string) => {
    switch (level) {
      case 'low': return '低';
      case 'medium': return '中';
      case 'high': return '高';
      case 'critical': return '緊急';
      default: return '不明';
    }
  };

  // EnhancedQAFlowが選択された場合（すべての問題タイプでAI駆動診断）
  if (showEnhancedFlow && selectedProblem) {
    return (
      <EnhancedQAFlow
        initialProblemDescription={problemDescription || selectedProblem.description}
        onComplete={(solution, answers) => {
          // 解決策を親コンポーネントに送信
          onStartFlow(selectedProblem.id, solution);
        }}
        onEmergencyContact={handleEmergencyContact}
        onExit={() => {
          setShowEnhancedFlow(false);
          setSelectedProblem(null);
        }}
      />
    );
  }

  // フォールバック用のEmergencyQAFlow（エンジン始動不良のみ）
  if (showEmergencyFlow && selectedProblem?.id === 'engine_start') {
    return (
      <EmergencyQAFlow
        onComplete={(solution, answers) => {
          // 解決策を親コンポーネントに送信
          onStartFlow('engine_start', solution);
        }}
        onEmergencyContact={handleEmergencyContact}
        onExit={() => {
          setShowEmergencyFlow(false);
          setSelectedProblem(null);
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-6 w-6 text-blue-600" />
              <CardTitle className="text-xl">問題診断の開始</CardTitle>
            </div>
            <Button
              variant="outline"
              onClick={onExit}
            >
              終了
            </Button>
          </div>
          <p className="text-gray-600">
            発生している問題の種類を選択してください。段階的な質問により、最適な解決策を提案します。
          </p>
        </CardHeader>
      </Card>

      {/* 緊急連絡アラート */}
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>緊急時:</strong> 安全に関わる問題や作業に支障がある場合は、
          すぐに技術支援センター（0123-456-789）に連絡してください。
        </AlertDescription>
      </Alert>

      {/* 問題タイプ選択 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROBLEM_TYPES.map((problem) => (
          <Card
            key={problem.id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedProblem?.id === problem.id 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => handleProblemSelect(problem)}
          >
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  selectedProblem?.id === problem.id 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {problem.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 truncate">
                      {problem.name}
                    </h3>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getEmergencyLevelColor(problem.emergencyLevel)}`}
                    >
                      {getEmergencyLevelText(problem.emergencyLevel)}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    {problem.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      推定 {problem.estimatedTime}分
                    </span>
                    <span className="flex items-center">
                      {problem.requiresExpert ? (
                        <>
                          <Wrench className="h-3 w-3 mr-1" />
                          専門家
                        </>
                      ) : (
                        <>
                          <Tool className="h-3 w-3 mr-1" />
                          自力対応
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 選択された問題の詳細 */}
      {selectedProblem && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              {selectedProblem.icon}
              <span>{selectedProblem.name}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">問題の詳細</h4>
                <p className="text-gray-600">{selectedProblem.description}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">対応情報</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>緊急度:</span>
                    <Badge 
                      variant="secondary" 
                      className={getEmergencyLevelColor(selectedProblem.emergencyLevel)}
                    >
                      {getEmergencyLevelText(selectedProblem.emergencyLevel)}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>推定時間:</span>
                    <span>{selectedProblem.estimatedTime}分</span>
                  </div>
                  <div className="flex justify-between">
                    <span>対応方法:</span>
                    <span>{selectedProblem.requiresExpert ? '専門家対応' : '自力対応可能'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 追加の詳細説明 */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">詳細な症状や状況</h4>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-md resize-none"
                rows={3}
                placeholder="問題の詳細な症状や発生状況を教えてください（任意）"
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
              />
            </div>

            {/* アクションボタン */}
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center space-x-2">
                {selectedProblem.emergencyLevel === 'critical' && (
                  <Button
                    variant="destructive"
                    onClick={handleEmergencyContact}
                    className="flex items-center space-x-2"
                  >
                    <Phone className="h-4 w-4" />
                    <span>緊急連絡</span>
                  </Button>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedProblem(null);
                    setProblemDescription('');
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleStartFlow}
                  className="flex items-center space-x-2"
                >
                  <Search className="h-4 w-4" />
                  <span>診断開始</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ヘルプ情報 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Lightbulb className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 mb-2">診断の流れ</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>1. 問題の種類を選択してください</p>
                <p>2. 段階的な質問に回答していただきます</p>
                <p>3. 回答に基づいて最適な解決策を提案します</p>
                <p>4. 必要に応じて専門家への相談を案内します</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
