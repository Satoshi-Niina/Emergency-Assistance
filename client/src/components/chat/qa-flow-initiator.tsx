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
    name: 'エンジンがかからなぁE,
    description: 'エンジンが正常に始動しなぁE��顁E,
    icon: <Car className="h-6 w-6" />,
    category: 'エンジン系',
    emergencyLevel: 'medium',
    estimatedTime: 30,
    requiresExpert: false
  },
  {
    id: 'engine_noise',
    name: 'エンジンから異音がすめE,
    description: 'エンジンから異常な音が発生する問顁E,
    icon: <AlertTriangle className="h-6 w-6" />,
    category: 'エンジン系',
    emergencyLevel: 'high',
    estimatedTime: 45,
    requiresExpert: true
  },
  {
    id: 'battery_issue',
    name: 'バッチE��ーの問顁E,
    description: 'バッチE��ーの允E��めE��続に関する問顁E,
    icon: <Battery className="h-6 w-6" />,
    category: '電気系',
    emergencyLevel: 'medium',
    estimatedTime: 20,
    requiresExpert: false
  },
  {
    id: 'lighting_issue',
    name: '照明�E灯火の問顁E,
    description: '室冁E�EめE��業灯が点灯しなぁE��顁E,
    icon: <Zap className="h-6 w-6" />,
    category: '電気系',
    emergencyLevel: 'low',
    estimatedTime: 15,
    requiresExpert: false
  },
  {
    id: 'hydraulic_issue',
    name: '油圧シスチE��の問顁E,
    description: '油圧ポンプやシリンダーの動作不良',
    icon: <Settings className="h-6 w-6" />,
    category: '油圧系',
    emergencyLevel: 'high',
    estimatedTime: 60,
    requiresExpert: true
  },
  {
    id: 'brake_issue',
    name: 'ブレーキの問顁E,
    description: 'ブレーキの効きが悪ぁE��異音がすめE,
    icon: <Shield className="h-6 w-6" />,
    category: '走行系',
    emergencyLevel: 'critical',
    estimatedTime: 45,
    requiresExpert: true
  },
  {
    id: 'crane_issue',
    name: 'クレーン・作業裁E��の問顁E,
    description: 'クレーンめE��インチ�E動作不良',
    icon: <Tool className="h-6 w-6" />,
    category: '作業裁E��系',
    emergencyLevel: 'high',
    estimatedTime: 90,
    requiresExpert: true
  },
  {
    id: 'safety_issue',
    name: '安�E裁E��の問顁E,
    description: '非常停止めE���EスイチE��の動作不良',
    icon: <AlertTriangle className="h-6 w-6" />,
    category: '安�E裁E��系',
    emergencyLevel: 'critical',
    estimatedTime: 30,
    requiresExpert: true
  },
  {
    id: 'transmission_issue',
    name: 'トランスミッション・トルクコンバ�Eターの問顁E,
    description: '変速不良、トルクコンバ�Eターの異常音めE��玁E��丁E,
    icon: <Settings className="h-6 w-6" />,
    category: 'トランスミッション系',
    emergencyLevel: 'high',
    estimatedTime: 60,
    requiresExpert: true
  },
  {
    id: 'cooling_issue',
    name: '冷却シスチE��の問顁E,
    description: 'エンジンオーバ�Eヒ�Eト、�E却水漏れ',
    icon: <Thermometer className="h-6 w-6" />,
    category: '冷却系',
    emergencyLevel: 'high',
    estimatedTime: 45,
    requiresExpert: true
  },
  {
    id: 'travel_issue',
    name: '走行裁E��の問顁E,
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
    
    // 緊急度が高い場合�E直接フローを開姁E
    if (problem.emergencyLevel === 'critical') {
      setShowEmergencyFlow(true);
    }
  };

        const handleStartFlow = () => {
        if (selectedProblem) {
          const description = problemDescription || selectedProblem.description;
          
          // すべての問題タイプでEnhancedQAFlowを使用�E�EI駁E��の動的診断�E�E
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
      case 'low': return '佁E;
      case 'medium': return '中';
      case 'high': return '髁E;
      case 'critical': return '緊急';
      default: return '不�E';
    }
  };

  // EnhancedQAFlowが選択された場合（すべての問題タイプでAI駁E��診断�E�E
  if (showEnhancedFlow && selectedProblem) {
    return (
      <EnhancedQAFlow
        initialProblemDescription={problemDescription || selectedProblem.description}
        onComplete={(solution, answers) => {
          // 解決策を親コンポ�Eネントに送信
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

  // フォールバック用のEmergencyQAFlow�E�エンジン始動不良のみ�E�E
  if (showEmergencyFlow && selectedProblem?.id === 'engine_start') {
    return (
      <EmergencyQAFlow
        onComplete={(solution, answers) => {
          // 解決策を親コンポ�Eネントに送信
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
              <CardTitle className="text-xl">問題診断の開姁E/CardTitle>
            </div>
            <Button
              variant="outline"
              onClick={onExit}
            >
              終亁E
            </Button>
          </div>
          <p className="text-gray-600">
            発生してぁE��問題�E種類を選択してください。段階的な質問により、最適な解決策を提案します、E
          </p>
        </CardHeader>
      </Card>

      {/* 緊急連絡アラーチE*/}
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>緊急晁E</strong> 安�Eに関わる問題や作業に支障がある場合�E、E
          すぐに技術支援センター�E�E123-456-789�E�に連絡してください、E
        </AlertDescription>
      </Alert>

      {/* 問題タイプ選抁E*/}
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
                      推宁E{problem.estimatedTime}刁E
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
                          自力対忁E
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

      {/* 選択された問題�E詳細 */}
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
                <h4 className="font-medium text-gray-900 mb-2">問題�E詳細</h4>
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
                    <span>推定時閁E</span>
                    <span>{selectedProblem.estimatedTime}刁E/span>
                  </div>
                  <div className="flex justify-between">
                    <span>対応方況E</span>
                    <span>{selectedProblem.requiresExpert ? '専門家対忁E : '自力対応可能'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 追加の詳細説昁E*/}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">詳細な痁E��めE��況E/h4>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-md resize-none"
                rows={3}
                placeholder="問題�E詳細な痁E��めE��生状況を教えてください�E�任意！E
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
                  <span>診断開姁E/span>
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
                <p>1. 問題�E種類を選択してください</p>
                <p>2. 段階的な質問に回答してぁE��だきまぁE/p>
                <p>3. 回答に基づぁE��最適な解決策を提案しまぁE/p>
                <p>4. 忁E��に応じて専門家への相諁E��案�EしまぁE/p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
