import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ChevronRight, 
  CheckCircle, 
  AlertCircle, 
  Lightbulb,
  Brain,
  History,
  Send,
  RotateCcw,
  Wrench,
  Shield,
  Search,
  Settings,
  Eye,
  Clock,
  Phone,
  Car,
  Zap,
  Battery,
  Key
} from 'lucide-react';

interface QAAnswer {
  stepId: string;
  answer: string;
  timestamp: Date;
  question: string;
}

interface QAFlowStep {
  id: string;
  question: string;
  type: 'choice' | 'text' | 'location' | 'time';
  options?: string[];
  required: boolean;
  reasoning?: string;
  expectedOutcome?: string;
  emergencyAction?: string;
  timeLimit?: number;
  nextStepCondition?: {
    condition: string;
    nextStepId: string;
  }[];
}

interface EmergencyQAFlowProps {
  onComplete: (solution: string, allAnswers: QAAnswer[]) => void;
  onEmergencyContact: () => void;
  onExit: () => void;
}

// 繧ｨ繝ｳ繧ｸ繝ｳ蟋句虚荳崎憶縺ｮ蜈ｷ菴鍋噪縺ｪ繝輔Ο繝ｼ螳夂ｾｩ
const ENGINE_START_FLOW: QAFlowStep[] = [
  {
    id: 'location_check',
    question: '莉翫・縺ｩ縺薙↓縺・∪縺吶°・・,
    type: 'choice',
    options: ['菫晄攝邱・, '霆雁ｺｫ', '迴ｾ蝣ｴ', '縺昴・莉・],
    required: true,
    reasoning: '蝣ｴ謇縺ｫ繧医▲縺ｦ蟇ｾ蠢懈婿豕輔′逡ｰ縺ｪ繧九◆繧・,
    expectedOutcome: '蟇ｾ蠢懷庄閭ｽ縺ｪ蝣ｴ謇縺九←縺・°縺ｮ蛻､譁ｭ'
  },
  {
    id: 'time_check',
    question: '菴懈･ｭ縺ｫ菴ｿ縺医ｋ譎る俣縺ｯ縺ゅｊ縺ｾ縺吶°・・,
    type: 'choice',
    options: ['20蛻・ｻ･荳・, '30蛻・ｨ句ｺｦ', '1譎る俣遞句ｺｦ', '蜊∝・縺ｫ縺ゅｋ'],
    required: true,
    reasoning: '譎る俣縺ｫ繧医▲縺ｦ蟇ｾ蠢懈婿豕輔ｒ豎ｺ螳・,
    expectedOutcome: '邱頑･蟇ｾ蠢懊・蠢・ｦ∵ｧ蛻､譁ｭ',
    emergencyAction: '20蛻・ｻ･荳九・蝣ｴ蜷・ 縺吶＄縺ｫ謾ｯ謠ｴ閠・∈騾｣邨｡縺励※縺上□縺輔＞',
    timeLimit: 20,
    nextStepCondition: [
      { condition: '20蛻・ｻ･荳・, nextStepId: 'emergency_contact' },
      { condition: '30蛻・ｨ句ｺｦ', nextStepId: 'lighting_check' },
      { condition: '1譎る俣遞句ｺｦ', nextStepId: 'lighting_check' },
      { condition: '蜊∝・縺ｫ縺ゅｋ', nextStepId: 'lighting_check' }
    ]
  },
  {
    id: 'emergency_contact',
    question: '譎る俣縺碁剞繧峨ｌ縺ｦ縺・ｋ縺溘ａ縲√☆縺舌↓謾ｯ謠ｴ閠・↓騾｣邨｡縺励※縺上□縺輔＞縲・,
    type: 'text',
    required: true,
    reasoning: '邱頑･譎ゅ・螳牙・遒ｺ菫・,
    expectedOutcome: '蟆る摩螳ｶ縺ｫ繧医ｋ霑・溘↑蟇ｾ蠢・
  },
  {
    id: 'lighting_check',
    question: '螳､蜀・・繧・・譏朱｡槭・轤ｹ轣ｯ縺励※縺・∪縺吶°・・,
    type: 'choice',
    options: ['轤ｹ轣ｯ縺励※縺・ｋ', '轤ｹ轣ｯ縺励※縺・↑縺・, '荳驛ｨ轤ｹ轣ｯ縺励※縺・ｋ'],
    required: true,
    reasoning: '繝舌ャ繝・Μ繝ｼ迥ｶ諷九・遒ｺ隱・,
    expectedOutcome: '繝舌ャ繝・Μ繝ｼ髮ｻ蝨ｧ縺ｮ遒ｺ隱・,
    nextStepCondition: [
      { condition: '轤ｹ轣ｯ縺励※縺・ｋ', nextStepId: 'starter_key_check' },
      { condition: '轤ｹ轣ｯ縺励※縺・↑縺・, nextStepId: 'battery_connection_check' },
      { condition: '荳驛ｨ轤ｹ轣ｯ縺励※縺・ｋ', nextStepId: 'battery_connection_check' }
    ]
  },
  {
    id: 'starter_key_check',
    question: '繧ｹ繧ｿ繝ｼ繧ｿ繝ｼ繧ｭ繝ｼ縺ｯ蝗槭ｊ縺ｾ縺吶°・・,
    type: 'choice',
    options: ['蝗槭ｋ', '蝗槭ｉ縺ｪ縺・, '蟆代＠蝗槭ｋ'],
    required: true,
    reasoning: '繧ｹ繧ｿ繝ｼ繧ｿ繝ｼ繧ｷ繧ｹ繝・Β縺ｮ蜍穂ｽ懃｢ｺ隱・,
    expectedOutcome: '繧ｹ繧ｿ繝ｼ繧ｿ繝ｼ縺ｮ迥ｶ諷狗｢ｺ隱・,
    nextStepCondition: [
      { condition: '蝗槭ｋ', nextStepId: 'starter_sound_check' },
      { condition: '蝗槭ｉ縺ｪ縺・, nextStepId: 'key_switch_check' },
      { condition: '蟆代＠蝗槭ｋ', nextStepId: 'starter_sound_check' }
    ]
  },
  {
    id: 'starter_sound_check',
    question: '繧ｹ繧ｿ繝ｼ繧ｿ繝ｼ繧貞屓縺励◆譎ゅ√せ繧ｿ繝ｼ繧ｿ繝ｼ縺九ｉ"繧ｫ繝・縺ｨ髻ｳ縺悟・縺ｾ縺吶°・・,
    type: 'choice',
    options: ['繧ｫ繝√→髻ｳ縺悟・繧・, '蜈ｨ縺城浹縺悟・縺ｪ縺・, '蛻･縺ｮ髻ｳ縺悟・繧・],
    required: true,
    reasoning: '繧ｹ繧ｿ繝ｼ繧ｿ繝ｼ縺ｮ蜍穂ｽ懃憾諷狗｢ｺ隱・,
    expectedOutcome: '繧ｹ繧ｿ繝ｼ繧ｿ繝ｼ縺ｮ謨・囿蛻､螳・,
    nextStepCondition: [
      { condition: '繧ｫ繝√→髻ｳ縺悟・繧・, nextStepId: 'fuel_check' },
      { condition: '蜈ｨ縺城浹縺悟・縺ｪ縺・, nextStepId: 'battery_connection_check' },
      { condition: '蛻･縺ｮ髻ｳ縺悟・繧・, nextStepId: 'starter_diagnosis' }
    ]
  },
  {
    id: 'battery_connection_check',
    question: '繝舌ャ繝・Μ繝ｼ縺ｯ謗･邯壹＆繧後※縺・∪縺吶°・滂ｼ医ｂ縺励￥縺ｯ繝｡繧､繝ｳ繝悶Ξ繝ｼ繧ｫ繝ｼ縺悟・縺｣縺ｦ縺・∪縺吶°・滂ｼ・,
    type: 'choice',
    options: ['謗･邯壹＆繧後※縺・ｋ', '謗･邯壹＆繧後※縺・↑縺・, '遒ｺ隱阪〒縺阪↑縺・],
    required: true,
    reasoning: '髮ｻ貅蝉ｾ帷ｵｦ縺ｮ遒ｺ隱・,
    expectedOutcome: '髮ｻ貅仙撫鬘後・迚ｹ螳・,
    nextStepCondition: [
      { condition: '謗･邯壹＆繧後※縺・ｋ', nextStepId: 'battery_voltage_check' },
      { condition: '謗･邯壹＆繧後※縺・↑縺・, nextStepId: 'connect_battery' },
      { condition: '遒ｺ隱阪〒縺阪↑縺・, nextStepId: 'battery_voltage_check' }
    ]
  },
  {
    id: 'battery_voltage_check',
    question: '繝舌ャ繝・Μ繝ｼ縺ｮ髮ｻ蝨ｧ繧堤｢ｺ隱阪〒縺阪∪縺吶°・・,
    type: 'choice',
    options: ['12V莉･荳・, '10-12V', '10V莉･荳・, '遒ｺ隱阪〒縺阪↑縺・],
    required: true,
    reasoning: '繝舌ャ繝・Μ繝ｼ縺ｮ蜈・崕迥ｶ諷狗｢ｺ隱・,
    expectedOutcome: '繝舌ャ繝・Μ繝ｼ荳崎憶縺ｮ蛻､螳・,
    nextStepCondition: [
      { condition: '12V莉･荳・, nextStepId: 'fuel_check' },
      { condition: '10-12V', nextStepId: 'charge_battery' },
      { condition: '10V莉･荳・, nextStepId: 'charge_battery' },
      { condition: '遒ｺ隱阪〒縺阪↑縺・, nextStepId: 'charge_battery' }
    ]
  },
  {
    id: 'charge_battery',
    question: '繝舌ャ繝・Μ繝ｼ荳崎憶縺梧Φ螳壹＆繧後∪縺吶ょ・髮ｻ縺励※縺上□縺輔＞縲・,
    type: 'text',
    required: true,
    reasoning: '繝舌ャ繝・Μ繝ｼ蜈・崕縺ｮ謖・､ｺ',
    expectedOutcome: '繝舌ャ繝・Μ繝ｼ縺ｮ蠕ｩ譌ｧ'
  },
  {
    id: 'connect_battery',
    question: '繝舌ャ繝・Μ繝ｼ繧呈磁邯壹＠縺ｦ縺上□縺輔＞縲・,
    type: 'text',
    required: true,
    reasoning: '髮ｻ貅先磁邯壹・謖・､ｺ',
    expectedOutcome: '髮ｻ貅舌・蠕ｩ譌ｧ'
  },
  {
    id: 'fuel_check',
    question: '辯・侭縺ｯ蜊∝・縺ｫ縺ゅｊ縺ｾ縺吶°・・,
    type: 'choice',
    options: ['蜊∝・縺ｫ縺ゅｋ', '蟆代↑縺・, '遒ｺ隱阪〒縺阪↑縺・],
    required: true,
    reasoning: '辯・侭萓帷ｵｦ縺ｮ遒ｺ隱・,
    expectedOutcome: '辯・侭蝠城｡後・迚ｹ螳・,
    nextStepCondition: [
      { condition: '蜊∝・縺ｫ縺ゅｋ', nextStepId: 'air_filter_check' },
      { condition: '蟆代↑縺・, nextStepId: 'add_fuel' },
      { condition: '遒ｺ隱阪〒縺阪↑縺・, nextStepId: 'add_fuel' }
    ]
  },
  {
    id: 'add_fuel',
    question: '辯・侭繧定｣懷・縺励※縺上□縺輔＞縲・,
    type: 'text',
    required: true,
    reasoning: '辯・侭陬懷・縺ｮ謖・､ｺ',
    expectedOutcome: '辯・侭萓帷ｵｦ縺ｮ蠕ｩ譌ｧ'
  },
  {
    id: 'air_filter_check',
    question: '繧ｨ繧｢繝輔ぅ繝ｫ繧ｿ繝ｼ縺ｯ貂・ｽ斐〒縺吶°・・,
    type: 'choice',
    options: ['貂・ｽ・, '豎壹ｌ縺ｦ縺・ｋ', '遒ｺ隱阪〒縺阪↑縺・],
    required: true,
    reasoning: '遨ｺ豌嶺ｾ帷ｵｦ縺ｮ遒ｺ隱・,
    expectedOutcome: '繧ｨ繧｢繝輔ぅ繝ｫ繧ｿ繝ｼ縺ｮ迥ｶ諷狗｢ｺ隱・,
    nextStepCondition: [
      { condition: '貂・ｽ・, nextStepId: 'final_diagnosis' },
      { condition: '豎壹ｌ縺ｦ縺・ｋ', nextStepId: 'clean_air_filter' },
      { condition: '遒ｺ隱阪〒縺阪↑縺・, nextStepId: 'clean_air_filter' }
    ]
  },
  {
    id: 'clean_air_filter',
    question: '繧ｨ繧｢繝輔ぅ繝ｫ繧ｿ繝ｼ繧呈ｸ・祉縺ｾ縺溘・莠､謠帙＠縺ｦ縺上□縺輔＞縲・,
    type: 'text',
    required: true,
    reasoning: '繧ｨ繧｢繝輔ぅ繝ｫ繧ｿ繝ｼ貂・祉縺ｮ謖・､ｺ',
    expectedOutcome: '遨ｺ豌嶺ｾ帷ｵｦ縺ｮ謾ｹ蝟・
  },
  {
    id: 'key_switch_check',
    question: '繧ｭ繝ｼ繧ｹ繧､繝・メ縺ｮ迥ｶ諷九ｒ遒ｺ隱阪＠縺ｦ縺上□縺輔＞縲・,
    type: 'choice',
    options: ['豁｣蟶ｸ', '逡ｰ蟶ｸ', '遒ｺ隱阪〒縺阪↑縺・],
    required: true,
    reasoning: '繧ｭ繝ｼ繧ｹ繧､繝・メ縺ｮ蜍穂ｽ懃｢ｺ隱・,
    expectedOutcome: '繧ｭ繝ｼ繧ｹ繧､繝・メ縺ｮ謨・囿蛻､螳・,
    nextStepCondition: [
      { condition: '豁｣蟶ｸ', nextStepId: 'starter_sound_check' },
      { condition: '逡ｰ蟶ｸ', nextStepId: 'replace_key_switch' },
      { condition: '遒ｺ隱阪〒縺阪↑縺・, nextStepId: 'replace_key_switch' }
    ]
  },
  {
    id: 'replace_key_switch',
    question: '繧ｭ繝ｼ繧ｹ繧､繝・メ縺ｮ莠､謠帙′蠢・ｦ√〒縺吶ょｰる摩螳ｶ縺ｫ逶ｸ隲・＠縺ｦ縺上□縺輔＞縲・,
    type: 'text',
    required: true,
    reasoning: '蟆る摩菫ｮ逅・・謖・､ｺ',
    expectedOutcome: '繧ｭ繝ｼ繧ｹ繧､繝・メ縺ｮ菫ｮ逅・
  },
  {
    id: 'starter_diagnosis',
    question: '繧ｹ繧ｿ繝ｼ繧ｿ繝ｼ縺ｮ隧ｳ邏ｰ險ｺ譁ｭ縺悟ｿ・ｦ√〒縺吶ょｰる摩螳ｶ縺ｫ逶ｸ隲・＠縺ｦ縺上□縺輔＞縲・,
    type: 'text',
    required: true,
    reasoning: '蟆る摩險ｺ譁ｭ縺ｮ謖・､ｺ',
    expectedOutcome: '繧ｹ繧ｿ繝ｼ繧ｿ繝ｼ縺ｮ蟆る摩菫ｮ逅・
  },
  {
    id: 'final_diagnosis',
    question: '蝓ｺ譛ｬ逧・↑遒ｺ隱阪′螳御ｺ・＠縺ｾ縺励◆縲ゅお繝ｳ繧ｸ繝ｳ繧貞ｧ句虚縺励※縺ｿ縺ｦ縺上□縺輔＞縲・,
    type: 'choice',
    options: ['蟋句虚縺励◆', '蟋句虚縺励↑縺・, '逡ｰ蟶ｸ髻ｳ縺後☆繧・],
    required: true,
    reasoning: '譛邨ら｢ｺ隱・,
    expectedOutcome: '蝠城｡瑚ｧ｣豎ｺ縺ｮ遒ｺ隱・,
    nextStepCondition: [
      { condition: '蟋句虚縺励◆', nextStepId: 'success' },
      { condition: '蟋句虚縺励↑縺・, nextStepId: 'expert_consultation' },
      { condition: '逡ｰ蟶ｸ髻ｳ縺後☆繧・, nextStepId: 'expert_consultation' }
    ]
  },
  {
    id: 'success',
    question: '繧ｨ繝ｳ繧ｸ繝ｳ縺梧ｭ｣蟶ｸ縺ｫ蟋句虚縺励∪縺励◆・∝撫鬘後・隗｣豎ｺ縺輔ｌ縺ｾ縺励◆縲・,
    type: 'text',
    required: true,
    reasoning: '謌仙粥縺ｮ遒ｺ隱・,
    expectedOutcome: '蝠城｡瑚ｧ｣豎ｺ螳御ｺ・
  },
  {
    id: 'expert_consultation',
    question: '蟆る摩逧・↑險ｺ譁ｭ縺悟ｿ・ｦ√〒縺吶よ橿陦捺髪謠ｴ繧ｻ繝ｳ繧ｿ繝ｼ縺ｫ騾｣邨｡縺励※縺上□縺輔＞縲・,
    type: 'text',
    required: true,
    reasoning: '蟆る摩螳ｶ縺ｸ縺ｮ逶ｸ隲・欠遉ｺ',
    expectedOutcome: '蟆る摩螳ｶ縺ｫ繧医ｋ蟇ｾ蠢・
  }
];

export default function EmergencyQAFlow({
  onComplete,
  onEmergencyContact,
  onExit
}: EmergencyQAFlowProps) {
  const [currentStep, setCurrentStep] = useState<QAFlowStep | null>(null);
  const [answers, setAnswers] = useState<QAAnswer[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [emergencyAction, setEmergencyAction] = useState<string | null>(null);
  const [flowSteps, setFlowSteps] = useState<QAFlowStep[]>(ENGINE_START_FLOW);

  // 蛻晄悄蛹・
  useEffect(() => {
    if (flowSteps.length > 0) {
      setCurrentStep(flowSteps[0]);
      setProgress(5);
    }
  }, []);

  // 谺｡縺ｮ繧ｹ繝・ャ繝励ｒ豎ｺ螳・
  const getNextStep = useCallback((currentStepId: string, answer: string): QAFlowStep | null => {
    const currentStep = flowSteps.find(step => step.id === currentStepId);
    if (!currentStep || !currentStep.nextStepCondition) {
      return null;
    }

    // 譚｡莉ｶ縺ｫ蝓ｺ縺･縺・※谺｡縺ｮ繧ｹ繝・ャ繝励ｒ豎ｺ螳・
    for (const condition of currentStep.nextStepCondition) {
      if (answer.includes(condition.condition)) {
        return flowSteps.find(step => step.id === condition.nextStepId) || null;
      }
    }

    // 繝・ヵ繧ｩ繝ｫ繝医・谺｡縺ｮ繧ｹ繝・ャ繝暦ｼ磯・ｺ上〒豎ｺ螳夲ｼ・
    const currentIndex = flowSteps.findIndex(step => step.id === currentStepId);
    if (currentIndex < flowSteps.length - 1) {
      return flowSteps[currentIndex + 1];
    }

    return null;
  }, [flowSteps]);

  // 蝗樒ｭ斐ｒ蜃ｦ逅・
  const handleAnswerSubmit = async () => {
    if (!currentAnswer.trim() || !currentStep) return;

    setIsLoading(true);
    
    try {
      // 邱頑･蟇ｾ蠢懊メ繧ｧ繝・け
      if (currentStep.emergencyAction && currentStep.timeLimit) {
        const timeAnswer = currentAnswer.toLowerCase();
        if (timeAnswer.includes(`${currentStep.timeLimit}蛻・ｻ･荳義) || 
            timeAnswer.includes('20蛻・ｻ･荳・) || 
            timeAnswer.includes('30蛻・ｻ･荳・)) {
          setEmergencyAction(currentStep.emergencyAction);
          onEmergencyContact();
          return;
        }
      }

      // 蝗樒ｭ斐ｒ險倬鹸
      const answer: QAAnswer = {
        stepId: currentStep.id,
        answer: currentAnswer.trim(),
        timestamp: new Date(),
        question: currentStep.question
      };

      const newAnswers = [...answers, answer];
      setAnswers(newAnswers);

      // 騾ｲ謐励ｒ譖ｴ譁ｰ
      const newProgress = Math.min(95, progress + (100 / flowSteps.length));
      setProgress(newProgress);

      // 谺｡縺ｮ繧ｹ繝・ャ繝励ｒ豎ｺ螳・
      const nextStep = getNextStep(currentStep.id, currentAnswer);
      
      if (nextStep) {
        setCurrentStep(nextStep);
        setCurrentAnswer('');
      } else {
        // 繝輔Ο繝ｼ螳御ｺ・
        setProgress(100);
        const solution = generateSolution(newAnswers);
        onComplete(solution, newAnswers);
      }
    } catch (error) {
      console.error('蝗樒ｭ泌・逅・お繝ｩ繝ｼ:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 隗｣豎ｺ遲悶ｒ逕滓・
  const generateSolution = (allAnswers: QAAnswer[]): string => {
    const lastAnswer = allAnswers[allAnswers.length - 1];
    
    if (lastAnswer.stepId === 'success') {
      return `
## 笨・蝠城｡瑚ｧ｣豎ｺ螳御ｺ・

繧ｨ繝ｳ繧ｸ繝ｳ縺梧ｭ｣蟶ｸ縺ｫ蟋句虚縺励∪縺励◆・・

### 搭 螳滓命縺励◆蟇ｾ蠢・
${allAnswers.map((answer, index) => 
  `${index + 1}. ${answer.question}\n   蝗樒ｭ・ ${answer.answer}`
).join('\n')}

### 肌 莉雁ｾ後・莠磯亟遲・
1. **螳壽悄逧・↑繝舌ャ繝・Μ繝ｼ繝√ぉ繝・け**: 譛・蝗槭・髮ｻ蝨ｧ遒ｺ隱・
2. **辯・侭邂｡逅・*: 辯・侭谿矩㍼縺ｮ螳壽悄逧・↑遒ｺ隱・
3. **繧ｨ繧｢繝輔ぅ繝ｫ繧ｿ繝ｼ貂・祉**: 菴懈･ｭ迺ｰ蠅・↓蠢懊§縺滓ｸ・祉鬆ｻ蠎ｦ縺ｮ險ｭ螳・
4. **螳壽悄轤ｹ讀・*: 繝｡繝ｼ繧ｫ繝ｼ謗ｨ螂ｨ縺ｮ螳壽悄轤ｹ讀懊・螳滓命

### 到 邱頑･譎ゅ・騾｣邨｡蜈・
- 謚陦捺髪謠ｴ繧ｻ繝ｳ繧ｿ繝ｼ: 0123-456-789
- 邱頑･譎・ 0123-456-000
      `;
    } else if (lastAnswer.stepId === 'expert_consultation') {
      return `
## 圷 蟆る摩螳ｶ縺ｫ繧医ｋ蟇ｾ蠢懊′蠢・ｦ・

### 到 謚陦捺髪謠ｴ繧ｻ繝ｳ繧ｿ繝ｼ縺ｫ騾｣邨｡縺励※縺上□縺輔＞
- 髮ｻ隧ｱ逡ｪ蜿ｷ: 0123-456-789
- 邱頑･譎・ 0123-456-000

### 搭 莨昴∴繧九∋縺肴ュ蝣ｱ
${allAnswers.map((answer, index) => 
  `${index + 1}. ${answer.question}\n   蝗樒ｭ・ ${answer.answer}`
).join('\n')}

### 肌 蟆る摩螳ｶ縺ｫ繧医ｋ蟇ｾ蠢懷・螳ｹ
1. **隧ｳ邏ｰ險ｺ譁ｭ**: 蟆る摩讖溷勣縺ｫ繧医ｋ邊ｾ蟇・､懈渊
2. **驛ｨ蜩∽ｺ､謠・*: 蠢・ｦ√↓蠢懊§縺滄Κ蜩√・莠､謠・
3. **隱ｿ謨ｴ菴懈･ｭ**: 繧ｨ繝ｳ繧ｸ繝ｳ縺ｮ隱ｿ謨ｴ繝ｻ譛驕ｩ蛹・
4. **莠磯亟菫晏・**: 蜀咲匱髦ｲ豁｢縺ｮ縺溘ａ縺ｮ蟇ｾ遲・
      `;
    } else {
      return `
## 肌 蟇ｾ蠢懷ｮ御ｺ・

### 搭 螳滓命縺励◆蟇ｾ蠢・
${allAnswers.map((answer, index) => 
  `${index + 1}. ${answer.question}\n   蝗樒ｭ・ ${answer.answer}`
).join('\n')}

### 笨・谺｡縺ｮ繧ｹ繝・ャ繝・
${lastAnswer.answer}

### 到 繧ｵ繝昴・繝・
蝠城｡後′隗｣豎ｺ縺励↑縺・ｴ蜷医・縲∵橿陦捺髪謠ｴ繧ｻ繝ｳ繧ｿ繝ｼ縺ｫ騾｣邨｡縺励※縺上□縺輔＞縲・
- 髮ｻ隧ｱ逡ｪ蜿ｷ: 0123-456-789
      `;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAnswerSubmit();
    }
  };

  const resetQA = () => {
    setAnswers([]);
    setCurrentAnswer('');
    setProgress(0);
    setShowHistory(false);
    setEmergencyAction(null);
    if (flowSteps.length > 0) {
      setCurrentStep(flowSteps[0]);
    }
  };

  if (isLoading && !currentStep) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>險ｺ譁ｭ繧帝幕蟋倶ｸｭ...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* 繝倥ャ繝繝ｼ */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Car className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">繧ｨ繝ｳ繧ｸ繝ｳ蟋句虚荳崎憶縺ｮ險ｺ譁ｭ</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4 mr-1" />
                螻･豁ｴ
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetQA}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                繝ｪ繧ｻ繝・ヨ
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onExit}
              >
                邨ゆｺ・
              </Button>
            </div>
          </div>
          
          {/* 騾ｲ謐励ヰ繝ｼ */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>險ｺ譁ｭ騾ｲ謐・/span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* 邱頑･蟇ｾ蠢懊い繝ｩ繝ｼ繝・*/}
      {emergencyAction && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>邱頑･蟇ｾ蠢・</strong> {emergencyAction}
          </AlertDescription>
        </Alert>
      )}

      {/* 蝗樒ｭ泌ｱ･豁ｴ */}
      {showHistory && answers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <History className="h-4 w-4 mr-2" />
              險ｺ譁ｭ螻･豁ｴ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {answers.map((answer, index) => (
              <div key={answer.stepId} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <Badge variant="secondary" className="mt-1">
                  Q{index + 1}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm text-gray-700 mb-1 font-medium">
                    {answer.question}
                  </p>
                  <p className="text-sm text-gray-600 mb-1">
                    蝗樒ｭ・ {answer.answer}
                  </p>
                  <p className="text-xs text-gray-400">
                    {answer.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 迴ｾ蝨ｨ縺ｮ雉ｪ蝠・*/}
      {currentStep && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* 雉ｪ蝠剰｡ｨ遉ｺ */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  {(() => {
                    const questionText = currentStep.question.toLowerCase();
                    if (questionText.includes('譎る俣') || questionText.includes('邱頑･')) {
                      return <Clock className="h-4 w-4 text-red-600" />;
                    } else if (questionText.includes('辣ｧ譏・) || questionText.includes('轤ｹ轣ｯ')) {
                      return <Zap className="h-4 w-4 text-yellow-600" />;
                    } else if (questionText.includes('繧ｹ繧ｿ繝ｼ繧ｿ繝ｼ') || questionText.includes('繧ｭ繝ｼ')) {
                      return <Key className="h-4 w-4 text-blue-600" />;
                    } else if (questionText.includes('繝舌ャ繝・Μ繝ｼ')) {
                      return <Battery className="h-4 w-4 text-green-600" />;
                    } else if (questionText.includes('辯・侭')) {
                      return <Car className="h-4 w-4 text-orange-600" />;
                    } else {
                      return <span className="text-sm font-medium text-blue-600">{answers.length + 1}</span>;
                    }
                  })()}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {currentStep.question}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    {currentStep.required && (
                      <Badge variant="destructive" className="text-xs">
                        蠢・・
                      </Badge>
                    )}
                    {currentStep.reasoning && (
                      <Badge variant="secondary" className="text-xs">
                        {currentStep.reasoning}
                      </Badge>
                    )}
                  </div>
                  {currentStep.expectedOutcome && (
                    <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded-md mb-3">
                      <strong>譛溷ｾ・＆繧後ｋ邨先棡:</strong> {currentStep.expectedOutcome}
                    </div>
                  )}
                  {currentStep.emergencyAction && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md mb-3">
                      <strong>笞・・邱頑･譎・</strong> {currentStep.emergencyAction}
                    </div>
                  )}
                </div>
              </div>

              {/* 蝗樒ｭ泌・蜉・*/}
              <div className="space-y-3">
                {currentStep.type === 'choice' && currentStep.options ? (
                  <div className="grid grid-cols-1 gap-2">
                    {currentStep.options.map((option, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="justify-start h-auto p-3"
                        onClick={() => {
                          setCurrentAnswer(option);
                          handleAnswerSubmit();
                        }}
                        disabled={isLoading}
                      >
                        {option}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="蝗樒ｭ斐ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞..."
                      disabled={isLoading}
                      className="h-12"
                    />
                    <Button
                      onClick={handleAnswerSubmit}
                      disabled={!currentAnswer.trim() || isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>蜃ｦ逅・ｸｭ...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Send className="h-4 w-4" />
                          <span>蝗樒ｭ斐☆繧・/span>
                        </div>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* 繝偵Φ繝・*/}
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  谿ｵ髫守噪縺ｪ險ｺ譁ｭ縺ｫ繧医ｊ縲√お繝ｳ繧ｸ繝ｳ蟋句虚荳崎憶縺ｮ蜴溷屏繧堤音螳壹＠縺ｾ縺吶・
                  譎る俣縺碁剞繧峨ｌ縺ｦ縺・ｋ蝣ｴ蜷医・縲√☆縺舌↓謾ｯ謠ｴ閠・↓騾｣邨｡縺励※縺上□縺輔＞縲・
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 螳御ｺ・凾縺ｮ陦ｨ遉ｺ */}
      {progress === 100 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              <span className="text-lg font-medium">險ｺ譁ｭ螳御ｺ・/span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
