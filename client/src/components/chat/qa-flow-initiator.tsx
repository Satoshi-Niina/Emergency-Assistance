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
    name: '繧ｨ繝ｳ繧ｸ繝ｳ縺後°縺九ｉ縺ｪ縺・,
    description: '繧ｨ繝ｳ繧ｸ繝ｳ縺梧ｭ｣蟶ｸ縺ｫ蟋句虚縺励↑縺・撫鬘・,
    icon: <Car className="h-6 w-6" />,
    category: '繧ｨ繝ｳ繧ｸ繝ｳ邉ｻ',
    emergencyLevel: 'medium',
    estimatedTime: 30,
    requiresExpert: false
  },
  {
    id: 'engine_noise',
    name: '繧ｨ繝ｳ繧ｸ繝ｳ縺九ｉ逡ｰ髻ｳ縺後☆繧・,
    description: '繧ｨ繝ｳ繧ｸ繝ｳ縺九ｉ逡ｰ蟶ｸ縺ｪ髻ｳ縺檎匱逕溘☆繧句撫鬘・,
    icon: <AlertTriangle className="h-6 w-6" />,
    category: '繧ｨ繝ｳ繧ｸ繝ｳ邉ｻ',
    emergencyLevel: 'high',
    estimatedTime: 45,
    requiresExpert: true
  },
  {
    id: 'battery_issue',
    name: '繝舌ャ繝・Μ繝ｼ縺ｮ蝠城｡・,
    description: '繝舌ャ繝・Μ繝ｼ縺ｮ蜈・崕繧・磁邯壹↓髢｢縺吶ｋ蝠城｡・,
    icon: <Battery className="h-6 w-6" />,
    category: '髮ｻ豌礼ｳｻ',
    emergencyLevel: 'medium',
    estimatedTime: 20,
    requiresExpert: false
  },
  {
    id: 'lighting_issue',
    name: '辣ｧ譏弱・轣ｯ轣ｫ縺ｮ蝠城｡・,
    description: '螳､蜀・・繧・ｽ懈･ｭ轣ｯ縺檎せ轣ｯ縺励↑縺・撫鬘・,
    icon: <Zap className="h-6 w-6" />,
    category: '髮ｻ豌礼ｳｻ',
    emergencyLevel: 'low',
    estimatedTime: 15,
    requiresExpert: false
  },
  {
    id: 'hydraulic_issue',
    name: '豐ｹ蝨ｧ繧ｷ繧ｹ繝・Β縺ｮ蝠城｡・,
    description: '豐ｹ蝨ｧ繝昴Φ繝励ｄ繧ｷ繝ｪ繝ｳ繝繝ｼ縺ｮ蜍穂ｽ應ｸ崎憶',
    icon: <Settings className="h-6 w-6" />,
    category: '豐ｹ蝨ｧ邉ｻ',
    emergencyLevel: 'high',
    estimatedTime: 60,
    requiresExpert: true
  },
  {
    id: 'brake_issue',
    name: '繝悶Ξ繝ｼ繧ｭ縺ｮ蝠城｡・,
    description: '繝悶Ξ繝ｼ繧ｭ縺ｮ蜉ｹ縺阪′謔ｪ縺・∫焚髻ｳ縺後☆繧・,
    icon: <Shield className="h-6 w-6" />,
    category: '襍ｰ陦檎ｳｻ',
    emergencyLevel: 'critical',
    estimatedTime: 45,
    requiresExpert: true
  },
  {
    id: 'crane_issue',
    name: '繧ｯ繝ｬ繝ｼ繝ｳ繝ｻ菴懈･ｭ陬・ｽｮ縺ｮ蝠城｡・,
    description: '繧ｯ繝ｬ繝ｼ繝ｳ繧・え繧､繝ｳ繝√・蜍穂ｽ應ｸ崎憶',
    icon: <Tool className="h-6 w-6" />,
    category: '菴懈･ｭ陬・ｽｮ邉ｻ',
    emergencyLevel: 'high',
    estimatedTime: 90,
    requiresExpert: true
  },
  {
    id: 'safety_issue',
    name: '螳牙・陬・ｽｮ縺ｮ蝠城｡・,
    description: '髱槫ｸｸ蛛懈ｭ｢繧・ｮ牙・繧ｹ繧､繝・メ縺ｮ蜍穂ｽ應ｸ崎憶',
    icon: <AlertTriangle className="h-6 w-6" />,
    category: '螳牙・陬・ｽｮ邉ｻ',
    emergencyLevel: 'critical',
    estimatedTime: 30,
    requiresExpert: true
  },
  {
    id: 'transmission_issue',
    name: '繝医Λ繝ｳ繧ｹ繝溘ャ繧ｷ繝ｧ繝ｳ繝ｻ繝医Ν繧ｯ繧ｳ繝ｳ繝舌・繧ｿ繝ｼ縺ｮ蝠城｡・,
    description: '螟蛾滉ｸ崎憶縲√ヨ繝ｫ繧ｯ繧ｳ繝ｳ繝舌・繧ｿ繝ｼ縺ｮ逡ｰ蟶ｸ髻ｳ繧・柑邇・ｽ惹ｸ・,
    icon: <Settings className="h-6 w-6" />,
    category: '繝医Λ繝ｳ繧ｹ繝溘ャ繧ｷ繝ｧ繝ｳ邉ｻ',
    emergencyLevel: 'high',
    estimatedTime: 60,
    requiresExpert: true
  },
  {
    id: 'cooling_issue',
    name: '蜀ｷ蜊ｴ繧ｷ繧ｹ繝・Β縺ｮ蝠城｡・,
    description: '繧ｨ繝ｳ繧ｸ繝ｳ繧ｪ繝ｼ繝舌・繝偵・繝医∝・蜊ｴ豌ｴ貍上ｌ',
    icon: <Thermometer className="h-6 w-6" />,
    category: '蜀ｷ蜊ｴ邉ｻ',
    emergencyLevel: 'high',
    estimatedTime: 45,
    requiresExpert: true
  },
  {
    id: 'travel_issue',
    name: '襍ｰ陦瑚｣・ｽｮ縺ｮ蝠城｡・,
    description: '襍ｰ陦梧凾縺ｮ逡ｰ蟶ｸ髻ｳ縲∵険蜍輔√メ繧ｧ繝ｼ繝ｳ縺ｮ莨ｸ縺ｳ',
    icon: <Move className="h-6 w-6" />,
    category: '襍ｰ陦檎ｳｻ',
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
    
    // 邱頑･蠎ｦ縺碁ｫ倥＞蝣ｴ蜷医・逶ｴ謗･繝輔Ο繝ｼ繧帝幕蟋・
    if (problem.emergencyLevel === 'critical') {
      setShowEmergencyFlow(true);
    }
  };

        const handleStartFlow = () => {
        if (selectedProblem) {
          const description = problemDescription || selectedProblem.description;
          
          // 縺吶∋縺ｦ縺ｮ蝠城｡後ち繧､繝励〒EnhancedQAFlow繧剃ｽｿ逕ｨ・・I鬧・虚縺ｮ蜍慕噪險ｺ譁ｭ・・
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
      case 'low': return '菴・;
      case 'medium': return '荳ｭ';
      case 'high': return '鬮・;
      case 'critical': return '邱頑･';
      default: return '荳肴・';
    }
  };

  // EnhancedQAFlow縺碁∈謚槭＆繧後◆蝣ｴ蜷茨ｼ医☆縺ｹ縺ｦ縺ｮ蝠城｡後ち繧､繝励〒AI鬧・虚險ｺ譁ｭ・・
  if (showEnhancedFlow && selectedProblem) {
    return (
      <EnhancedQAFlow
        initialProblemDescription={problemDescription || selectedProblem.description}
        onComplete={(solution, answers) => {
          // 隗｣豎ｺ遲悶ｒ隕ｪ繧ｳ繝ｳ繝昴・繝阪Φ繝医↓騾∽ｿ｡
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

  // 繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ逕ｨ縺ｮEmergencyQAFlow・医お繝ｳ繧ｸ繝ｳ蟋句虚荳崎憶縺ｮ縺ｿ・・
  if (showEmergencyFlow && selectedProblem?.id === 'engine_start') {
    return (
      <EmergencyQAFlow
        onComplete={(solution, answers) => {
          // 隗｣豎ｺ遲悶ｒ隕ｪ繧ｳ繝ｳ繝昴・繝阪Φ繝医↓騾∽ｿ｡
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
      {/* 繝倥ャ繝繝ｼ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-6 w-6 text-blue-600" />
              <CardTitle className="text-xl">蝠城｡瑚ｨｺ譁ｭ縺ｮ髢句ｧ・/CardTitle>
            </div>
            <Button
              variant="outline"
              onClick={onExit}
            >
              邨ゆｺ・
            </Button>
          </div>
          <p className="text-gray-600">
            逋ｺ逕溘＠縺ｦ縺・ｋ蝠城｡後・遞ｮ鬘槭ｒ驕ｸ謚槭＠縺ｦ縺上□縺輔＞縲よｮｵ髫守噪縺ｪ雉ｪ蝠上↓繧医ｊ縲∵怙驕ｩ縺ｪ隗｣豎ｺ遲悶ｒ謠先｡医＠縺ｾ縺吶・
          </p>
        </CardHeader>
      </Card>

      {/* 邱頑･騾｣邨｡繧｢繝ｩ繝ｼ繝・*/}
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>邱頑･譎・</strong> 螳牙・縺ｫ髢｢繧上ｋ蝠城｡後ｄ菴懈･ｭ縺ｫ謾ｯ髫懊′縺ゅｋ蝣ｴ蜷医・縲・
          縺吶＄縺ｫ謚陦捺髪謠ｴ繧ｻ繝ｳ繧ｿ繝ｼ・・123-456-789・峨↓騾｣邨｡縺励※縺上□縺輔＞縲・
        </AlertDescription>
      </Alert>

      {/* 蝠城｡後ち繧､繝鈴∈謚・*/}
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
                      謗ｨ螳・{problem.estimatedTime}蛻・
                    </span>
                    <span className="flex items-center">
                      {problem.requiresExpert ? (
                        <>
                          <Wrench className="h-3 w-3 mr-1" />
                          蟆る摩螳ｶ
                        </>
                      ) : (
                        <>
                          <Tool className="h-3 w-3 mr-1" />
                          閾ｪ蜉帛ｯｾ蠢・
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

      {/* 驕ｸ謚槭＆繧後◆蝠城｡後・隧ｳ邏ｰ */}
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
                <h4 className="font-medium text-gray-900 mb-2">蝠城｡後・隧ｳ邏ｰ</h4>
                <p className="text-gray-600">{selectedProblem.description}</p>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">蟇ｾ蠢懈ュ蝣ｱ</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>邱頑･蠎ｦ:</span>
                    <Badge 
                      variant="secondary" 
                      className={getEmergencyLevelColor(selectedProblem.emergencyLevel)}
                    >
                      {getEmergencyLevelText(selectedProblem.emergencyLevel)}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>謗ｨ螳壽凾髢・</span>
                    <span>{selectedProblem.estimatedTime}蛻・/span>
                  </div>
                  <div className="flex justify-between">
                    <span>蟇ｾ蠢懈婿豕・</span>
                    <span>{selectedProblem.requiresExpert ? '蟆る摩螳ｶ蟇ｾ蠢・ : '閾ｪ蜉帛ｯｾ蠢懷庄閭ｽ'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 霑ｽ蜉縺ｮ隧ｳ邏ｰ隱ｬ譏・*/}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">隧ｳ邏ｰ縺ｪ逞・憾繧・憾豕・/h4>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-md resize-none"
                rows={3}
                placeholder="蝠城｡後・隧ｳ邏ｰ縺ｪ逞・憾繧・匱逕溽憾豕√ｒ謨吶∴縺ｦ縺上□縺輔＞・井ｻｻ諢擾ｼ・
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
              />
            </div>

            {/* 繧｢繧ｯ繧ｷ繝ｧ繝ｳ繝懊ち繝ｳ */}
            <div className="flex items-center justify-between pt-4">
              <div className="flex items-center space-x-2">
                {selectedProblem.emergencyLevel === 'critical' && (
                  <Button
                    variant="destructive"
                    onClick={handleEmergencyContact}
                    className="flex items-center space-x-2"
                  >
                    <Phone className="h-4 w-4" />
                    <span>邱頑･騾｣邨｡</span>
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
                  繧ｭ繝｣繝ｳ繧ｻ繝ｫ
                </Button>
                <Button
                  onClick={handleStartFlow}
                  className="flex items-center space-x-2"
                >
                  <Search className="h-4 w-4" />
                  <span>險ｺ譁ｭ髢句ｧ・/span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 繝倥Ν繝玲ュ蝣ｱ */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Lightbulb className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-gray-900 mb-2">險ｺ譁ｭ縺ｮ豬√ｌ</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>1. 蝠城｡後・遞ｮ鬘槭ｒ驕ｸ謚槭＠縺ｦ縺上□縺輔＞</p>
                <p>2. 谿ｵ髫守噪縺ｪ雉ｪ蝠上↓蝗樒ｭ斐＠縺ｦ縺・◆縺縺阪∪縺・/p>
                <p>3. 蝗樒ｭ斐↓蝓ｺ縺･縺・※譛驕ｩ縺ｪ隗｣豎ｺ遲悶ｒ謠先｡医＠縺ｾ縺・/p>
                <p>4. 蠢・ｦ√↓蠢懊§縺ｦ蟆る摩螳ｶ縺ｸ縺ｮ逶ｸ隲・ｒ譯亥・縺励∪縺・/p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
