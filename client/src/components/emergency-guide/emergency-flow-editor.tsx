import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Plus, Trash2, X } from 'lucide-react';
import StepEditor from './step-editor';
import { v4 as uuidv4 } from 'uuid';
import { convertImageUrl } from '../../lib/utils.ts';

interface Step {
  id: string;
  title: string;
  description: string;
  message: string;
  type: 'start' | 'step' | 'decision' | 'condition' | 'end';
  images?: Array<{
    url: string;
    fileName: string;
  }>;
  options?: Array<{
    text: string;
    nextStepId: string;
    isTerminal: boolean;
    conditionType: 'yes' | 'no' | 'other';
    condition?: string;
  }>;
  conditions?: Array<{
    label: string;
    nextId: string;
  }>;
  // 蜿､縺・・繝ｭ繝代ユ繧｣縺ｯ蠕梧婿莠呈鋤諤ｧ縺ｮ縺溘ａ縺ｫ谿九☆・亥ｰ・擂逧・↓縺ｯ蜑企勁・・
  imageUrl?: string;
  imageFileName?: string;
}

interface EmergencyFlowEditorProps {
  flowData: any;
  currentTab: string;
  onSave: (data: any) => void;
  onTabChange: (tab: string) => void;
  selectedFilePath?: string;
}

// Helper function for UTF-8 safe base64 encoding
function utf8_to_b64(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    console.error('Failed to base64 encode:', str, e);
    return btoa(str); // Fallback to simple btoa
  }
}

const EmergencyFlowEditor: React.FC<EmergencyFlowEditorProps> = ({
  flowData,
  currentTab,
  onSave,
  onTabChange,
  selectedFilePath,
}) => {
  const [title, setTitle] = useState(flowData?.title || '');
  const [description, setDescription] = useState(flowData?.description || '');
  const [steps, setSteps] = useState<Step[]>([]);
  const [originalTitle, setOriginalTitle] = useState(flowData?.title || '');
  const [originalDescription, setOriginalDescription] = useState(flowData?.description || '');
  const [originalSteps, setOriginalSteps] = useState<Step[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const previousFlowDataRef = useRef<any>(null);

  // 1. steps縺ｮ譛譁ｰ蛟､繧剃ｿ晄戟縺吶ｋ縺溘ａ縺ｮRef繧定ｿｽ蜉
  const stepsRef = useRef(steps);
  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  // 2. flowData縺ｮ譛譁ｰ蛟､繧剃ｿ晄戟縺吶ｋ縺溘ａ縺ｮRef繧定ｿｽ蜉
  const flowDataRef = useRef(flowData);
  useEffect(() => {
    flowDataRef.current = flowData;
  }, [flowData]);

  // 蛻晄悄蛹・ flowData縺悟､画峩縺輔ｌ繧九◆縺ｳ縺ｫ繧ｳ繝ｳ繝昴・繝阪Φ繝医・迥ｶ諷九ｒ蜀榊・譛溷喧縺吶ｋ
  useEffect(() => {
    console.log('売 EmergencyFlowEditor useEffect 螳溯｡・', {
      flowDataId: flowData?.id || 'null',
      flowDataTitle: flowData?.title || 'null',
      isInitialized,
      currentTab,
      selectedFilePath
    });
    
    // flowData縺悟､画峩縺輔ｌ縺溘°縺ｩ縺・°繧偵メ繧ｧ繝・け
    const flowDataChanged = !previousFlowDataRef.current || 
      previousFlowDataRef.current.id !== flowData?.id ||
      JSON.stringify(previousFlowDataRef.current) !== JSON.stringify(flowData);
    
    console.log('剥 flowData螟画峩繝√ぉ繝・け:', {
      hasPreviousData: !!previousFlowDataRef.current,
      previousId: previousFlowDataRef.current?.id,
      currentId: flowData?.id,
      idsMatch: previousFlowDataRef.current?.id === flowData?.id,
      dataChanged: JSON.stringify(previousFlowDataRef.current) !== JSON.stringify(flowData),
      flowDataChanged
    });
    
    if (!flowDataChanged && isInitialized) {
      console.log('売 flowData縺悟､画峩縺輔ｌ縺ｦ縺・↑縺・◆繧√∝・譛溷喧繧偵せ繧ｭ繝・・');
      return;
    }
    
    if (!flowData) {
      console.log('統 flowData縺系ull縺ｾ縺溘・遨ｺ縺ｧ縺・- 譁ｰ隕丈ｽ懈・繝｢繝ｼ繝・);
      setTitle('譁ｰ隕上ヵ繝ｭ繝ｼ');
      setDescription('');
      setSteps([]);
      setOriginalSteps([]);
      setOriginalTitle('譁ｰ隕上ヵ繝ｭ繝ｼ');
      setOriginalDescription('');
      setIsInitialized(true);
      previousFlowDataRef.current = flowData;
      return;
    }
    
    console.log('笨ｨ 繝輔Ο繝ｼ繝・・繧ｿ繧貞・譛溷喧/譖ｴ譁ｰ縺励∪縺・', flowData.id || 'ID縺ｪ縺・);
    console.log('剥 flowData隧ｳ邏ｰ:', {
      id: flowData.id,
      title: flowData.title,
      description: flowData.description,
      hasSteps: !!flowData.steps,
      stepsType: typeof flowData.steps,
      stepsLength: flowData.steps?.length || 0,
      stepsIsArray: Array.isArray(flowData.steps),
      stepsContent: flowData.steps
    });
    
    setTitle(flowData.title || '辟｡鬘後・繝輔Ο繝ｼ');
    setDescription(flowData.description || '');
    setOriginalTitle(flowData.title || '辟｡鬘後・繝輔Ο繝ｼ');
    setOriginalDescription(flowData.description || '');

    // steps縺悟ｭ伜惠縺励↑縺・ｴ蜷医・繝・ヰ繝・げ諠・ｱ
    if (!flowData.steps || !Array.isArray(flowData.steps) || flowData.steps.length === 0) {
      console.warn('笞・・flowData.steps縺檎ｩｺ縺ｾ縺溘・辟｡蜉ｹ縺ｧ縺・', flowData.steps);
      console.log('剥 flowData蜈ｨ菴薙・讒矩:', JSON.stringify(flowData, null, 2));
      console.log('剥 flowData縺ｮ繧ｭ繝ｼ:', Object.keys(flowData));
      
      // steps縺檎ｩｺ縺ｧ繧ょ・譛溷喧繧堤ｶ夊｡鯉ｼ域眠隕丈ｽ懈・迥ｶ諷九→縺励※謇ｱ縺・ｼ・
      setSteps([]);
      setOriginalSteps([]);
      setIsInitialized(true);
      previousFlowDataRef.current = flowData;
      return;
    }

    console.log('肌 繧ｹ繝・ャ繝怜・逅・幕蟋・', {
      totalSteps: flowData.steps.length,
      stepDetails: flowData.steps.map((s, i) => ({ index: i, id: s.id, title: s.title, type: s.type }))
    });

    const initialSteps = flowData.steps.map((step: any, index: number) => {
      try {
        console.log(`繧ｹ繝・ャ繝夕${index + 1}/${flowData.steps.length}] [${step.id}]縺ｮ蛻晄悄蛹夜幕蟋・`, {
          step: step,
          hasImages: !!step.images,
          imagesLength: step.images?.length || 0,
          hasImageUrl: !!step.imageUrl,
          hasImageFileName: !!step.imageFileName,
          stepKeys: Object.keys(step)
        });

        // 逕ｻ蜒乗ュ蝣ｱ縺ｮ蜃ｦ逅・ｒ謾ｹ蝟・
        let processedImages = [];
        
        // 譁ｰ縺励＞ 'images' 驟榊・縺悟ｭ伜惠縺励∽ｸｭ霄ｫ縺後≠繧九°遒ｺ隱・
        if (step.images && Array.isArray(step.images) && step.images.length > 0) {
          console.log(`笨・繧ｹ繝・ャ繝夕${step.id}]縺ｧ譁ｰ縺励＞ 'images' 蠖｢蠑上ｒ讀懷・:`, step.images);
          // 逕ｻ蜒酋RL繧貞､画鋤
          processedImages = step.images.map((img: any) => ({
            url: convertImageUrl(img.url),
            fileName: img.fileName
          }));
        }
        // 'images' 縺後↑縺・ｴ蜷医∝商縺・ｽ｢蠑上°繧峨・遘ｻ陦後ｒ隧ｦ縺ｿ繧・
        else if (step.imageUrl && step.imageFileName) {
          console.log(`肌 繧ｹ繝・ャ繝夕${step.id}]繧貞商縺・ｽ｢蠑上°繧画眠縺励＞蠖｢蠑上↓螟画鋤:`, { 
            imageUrl: step.imageUrl, 
            imageFileName: step.imageFileName 
          });
          processedImages = [{ 
            url: convertImageUrl(step.imageUrl), 
            fileName: step.imageFileName 
          }];
        }
        // 蜿､縺・ｽ｢蠑上・imageUrl縺ｮ縺ｿ縺ｮ蝣ｴ蜷・
        else if (step.imageUrl) {
          console.log(`肌 繧ｹ繝・ャ繝夕${step.id}]繧段mageUrl縺ｮ縺ｿ縺九ｉ譁ｰ縺励＞蠖｢蠑上↓螟画鋤:`, { 
            imageUrl: step.imageUrl
          });
          const fileName = step.imageUrl.split('/').pop() || 'unknown.jpg';
          processedImages = [{ 
            url: convertImageUrl(step.imageUrl), 
            fileName: fileName 
          }];
        }
        // 逕ｻ蜒乗ュ蝣ｱ縺御ｽ輔ｂ縺ｪ縺・ｴ蜷・
        else {
          console.log(`統 繧ｹ繝・ャ繝夕${step.id}]縺ｫ逕ｻ蜒乗ュ蝣ｱ縺ｪ縺輿);
          processedImages = [];
        }

        console.log(`笨ｨ 繧ｹ繝・ャ繝夕${step.id}]縺ｮ逕ｻ蜒丞・逅・ｮ御ｺ・`, {
          processedImages: processedImages,
          processedCount: processedImages.length
        });

        // 蜿､縺・・繝ｭ繝代ユ繧｣繧貞炎髯､縺励※繧ｯ繝ｪ繝ｼ繝ｳ縺ｪ繝・・繧ｿ讒矩縺ｫ縺吶ｋ
        const { imageUrl, imageFileName, options, ...restOfStep } = step;
        const processedStep = { 
          ...restOfStep, 
          images: processedImages 
        };
        
        console.log(`笨・繧ｹ繝・ャ繝夕${step.id}]縺ｮ蜃ｦ逅・ｮ御ｺ・`, processedStep);
        return processedStep;
      } catch (error) {
        console.error(`笶・繧ｹ繝・ャ繝夕${step.id}]縺ｮ蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕・`, error);
        // 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺溷ｴ蜷医〒繧ょ渕譛ｬ逧・↑繧ｹ繝・ャ繝玲ュ蝣ｱ繧定ｿ斐☆
        return {
          id: step.id || `step_${index}`,
          title: step.title || `繧ｹ繝・ャ繝・${index + 1}`,
          description: step.description || '',
          message: step.message || '',
          type: step.type || 'step',
          images: [],
          options: step.options || [],
          conditions: step.conditions || []
        };
      }
    });

    console.log('笨ｨ 蛻晄悄蛹悶＆繧後◆繧ｹ繝・ャ繝・', {
      totalSteps: initialSteps.length,
      stepsWithImages: initialSteps.filter(s => s.images && s.images.length > 0).length,
      totalImages: initialSteps.reduce((sum, s) => sum + (s.images?.length || 0), 0),
      stepDetails: initialSteps.map(s => ({ id: s.id, title: s.title, type: s.type }))
    });
    
    console.log('肌 setSteps蜻ｼ縺ｳ蜃ｺ縺怜燕:', { initialStepsLength: initialSteps.length });
    setSteps(initialSteps);
    
    // 蜈・・繝・・繧ｿ繧ゅョ繧｣繝ｼ繝励さ繝斐・縺ｧ菫晏ｭ・
    setOriginalTitle(flowData.title || '辟｡鬘後・繝輔Ο繝ｼ');
    setOriginalDescription(flowData.description || '');
    setOriginalSteps(JSON.parse(JSON.stringify(initialSteps)));
    
    // 蛻晄悄蛹門ｮ御ｺ・ヵ繝ｩ繧ｰ繧定ｨｭ螳・
    setIsInitialized(true);
    previousFlowDataRef.current = flowData;
    
    console.log('笨・繝輔Ο繝ｼ繝・・繧ｿ蛻晄悄蛹門ｮ御ｺ・);
    
    // 繧ｹ繝・ャ繝励・迥ｶ諷九ｒ遒ｺ隱・
    setTimeout(() => {
      console.log('剥 蛻晄悄蛹門ｾ後・繧ｹ繝・ャ繝礼憾諷狗｢ｺ隱・', {
        stepsLength: steps.length,
        initialStepsLength: initialSteps.length,
        isInitialized: isInitialized
      });
    }, 100);
  }, [flowData, selectedFilePath, isInitialized]);

  // 螟画峩讀懷・
  useEffect(() => {
    // 蛻晄悄蛹悶′螳御ｺ・＠縺ｦ縺・↑縺・ｴ蜷医・螟画峩讀懷・繧偵せ繧ｭ繝・・
    if (!isInitialized) {
      console.log('売 蛻晄悄蛹悶′螳御ｺ・＠縺ｦ縺・↑縺・◆繧√∝､画峩讀懷・繧偵せ繧ｭ繝・・');
      return;
    }

    const titleChanged = title !== originalTitle;
    const descriptionChanged = description !== originalDescription;
    
    // 繧ｹ繝・ャ繝励・螟画峩繧定ｩｳ邏ｰ縺ｫ讀懷・
    const stepsChanged = JSON.stringify(steps) !== JSON.stringify(originalSteps);
    
    const changes = titleChanged || descriptionChanged || stepsChanged;
    
    if (changes) {
      console.log('剥 螟画峩讀懷・:', {
        titleChanged,
        descriptionChanged,
        stepsChanged,
      });
    }

    setHasChanges(changes);
  }, [title, description, steps, originalTitle, originalDescription, originalSteps, isInitialized]);

  const handleAddStep = useCallback((type: 'step' | 'decision', index?: number) => {
    const currentSteps = stepsRef.current;
    const newStep: Step = {
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: type === 'step' ? '譁ｰ縺励＞繧ｹ繝・ャ繝・ : '譁ｰ縺励＞譚｡莉ｶ蛻・ｲ・,
      description: '',
      message: '',
      type: type,
      images: [],
      options: [],
      conditions: []
    };

    let newSteps: Step[];
    if (index !== undefined) {
      newSteps = [...currentSteps.slice(0, index), newStep, ...currentSteps.slice(index)];
    } else {
      newSteps = [...currentSteps, newStep];
    }

    console.log('筐・繧ｹ繝・ャ繝苓ｿｽ蜉:', { type, index, newStepId: newStep.id, totalSteps: newSteps.length });
    setSteps(newSteps);
  }, []);

  // 繧ｹ繝・ャ繝鈴俣縺ｫ譁ｰ隕上せ繝・ャ繝励ｒ霑ｽ蜉縺吶ｋ髢｢謨ｰ
  const handleAddStepBetween = useCallback((afterStepId: string, type: 'step' | 'decision') => {
    const currentSteps = stepsRef.current;
    const afterIndex = currentSteps.findIndex(step => step.id === afterStepId);
    
    if (afterIndex === -1) {
      console.error('笶・謖・ｮ壹＆繧後◆繧ｹ繝・ャ繝励′隕九▽縺九ｊ縺ｾ縺帙ｓ:', afterStepId);
      return;
    }

    handleAddStep(type, afterIndex + 1);
  }, [handleAddStep]);

  const handleStepUpdate = useCallback((stepId: string, updatedStep: Partial<Step>) => {
    const currentSteps = stepsRef.current;
    const stepIndex = currentSteps.findIndex(step => step.id === stepId);
    
    if (stepIndex === -1) {
      console.error('笶・繧ｹ繝・ャ繝励′隕九▽縺九ｊ縺ｾ縺帙ｓ:', stepId);
      return;
    }

    const updatedSteps = [...currentSteps];
    updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], ...updatedStep };
    
    console.log('笨擾ｸ・繧ｹ繝・ャ繝玲峩譁ｰ:', { stepId, updatedStep, stepIndex });
    setSteps(updatedSteps);
  }, []);

  const handleStepsReorder = useCallback((newOrder: Step[]) => {
    console.log('売 繧ｹ繝・ャ繝鈴・ｺ丞､画峩:', { 
      oldLength: stepsRef.current.length, 
      newLength: newOrder.length,
      newOrder: newOrder.map(s => ({ id: s.id, title: s.title }))
    });
    setSteps(newOrder);
  }, []);

  const handleStepDelete = useCallback((stepId: string) => {
    const currentSteps = stepsRef.current;
    const updatedSteps = currentSteps.filter(step => step.id !== stepId);
    
    console.log('卵・・繧ｹ繝・ャ繝怜炎髯､:', { stepId, oldLength: currentSteps.length, newLength: updatedSteps.length });
    setSteps(updatedSteps);
  }, []);

  const handleConditionAdd = useCallback((stepId: string) => {
    const currentSteps = stepsRef.current;
    const stepIndex = currentSteps.findIndex(step => step.id === stepId);
    
    if (stepIndex === -1) {
      console.error('笶・繧ｹ繝・ャ繝励′隕九▽縺九ｊ縺ｾ縺帙ｓ:', stepId);
      return;
    }

    const step = currentSteps[stepIndex];
    const newCondition = {
      label: '',
      nextId: '',
    };

    const updatedStep = {
      ...step,
      conditions: [...(step.conditions || []), newCondition]
    };

    const updatedSteps = [...currentSteps];
    updatedSteps[stepIndex] = updatedStep;
    
    console.log('筐・譚｡莉ｶ霑ｽ蜉:', { stepId, newCondition });
    setSteps(updatedSteps);
  }, []);

  const handleConditionDelete = useCallback((stepId: string, conditionIndex: number) => {
    const currentSteps = stepsRef.current;
    const stepIndex = currentSteps.findIndex(step => step.id === stepId);
    
    if (stepIndex === -1) {
      console.error('笶・繧ｹ繝・ャ繝励′隕九▽縺九ｊ縺ｾ縺帙ｓ:', stepId);
      return;
    }

    const step = currentSteps[stepIndex];
    const updatedConditions = (step.conditions || []).filter((_, index) => index !== conditionIndex);

    const updatedStep = {
      ...step,
      conditions: updatedConditions
    };

    const updatedSteps = [...currentSteps];
    updatedSteps[stepIndex] = updatedStep;
    
    console.log('卵・・譚｡莉ｶ蜑企勁:', { stepId, conditionIndex });
    setSteps(updatedSteps);
  }, []);

  const handleConditionEdit = useCallback((stepId: string, conditionIndex: number, updatedCondition: any) => {
    const currentSteps = stepsRef.current;
    const stepIndex = currentSteps.findIndex(step => step.id === stepId);
    
    if (stepIndex === -1) {
      console.error('笶・繧ｹ繝・ャ繝励′隕九▽縺九ｊ縺ｾ縺帙ｓ:', stepId);
      return;
    }

    const step = currentSteps[stepIndex];
    const updatedConditions = [...(step.conditions || [])];
    updatedConditions[conditionIndex] = { ...updatedConditions[conditionIndex], ...updatedCondition };

    const updatedStep = {
      ...step,
      conditions: updatedConditions
    };

    const updatedSteps = [...currentSteps];
    updatedSteps[stepIndex] = updatedStep;
    
    console.log('笨擾ｸ・譚｡莉ｶ邱ｨ髮・', { stepId, conditionIndex, updatedCondition });
    setSteps(updatedSteps);
  }, []);

  // This useEffect will trigger the autosave whenever 'steps' changes and there are pending changes.
  useEffect(() => {
    if (hasChanges && isInitialized) {
      console.log('売 `steps`縺ｮ螟画峩繧呈､懃衍縺励∪縺励◆縲り・蜍穂ｿ晏ｭ倥ｒ繧ｹ繧ｱ繧ｸ繝･繝ｼ繝ｫ縺励∪縺吶・);
      const handler = setTimeout(() => {
        // 2. autoSave縺ｫ蠑墓焚繧呈ｸ｡縺輔★縲∝ｸｸ縺ｫRef縺九ｉ譛譁ｰ縺ｮsteps繧定ｪｭ繧繧医≧縺ｫ縺吶ｋ
        autoSave();
      }, 3000); // 3-second debounce

      return () => {
        console.log('売 閾ｪ蜍穂ｿ晏ｭ倥・繧ｿ繧､繝槭・繧偵け繝ｪ繧｢縺励∪縺励◆縲・);
        clearTimeout(handler);
      };
    }
  }, [steps, hasChanges, isInitialized]); // Depend on 'steps' to react to its changes

  const autoSave = useCallback(async () => {
    const currentSteps = stepsRef.current; 

    if (!hasChanges || !flowData) {
      console.log('竢ｭ・・閾ｪ蜍穂ｿ晏ｭ倥ｒ繧ｹ繧ｭ繝・・縺励∪縺・(螟画峩縺ｪ縺・or 繝輔Ο繝ｼ繝・・繧ｿ縺ｪ縺・');
      return;
    }

    console.log('売 閾ｪ蜍穂ｿ晏ｭ倥ｒ螳溯｡後＠縺ｾ縺・..');
    
    const cleanedSteps = currentSteps.map(step => {
      const images = step.images?.map(img => ({
        url: img.url && img.url.trim() !== '' ? img.url : undefined,
        fileName: img.fileName && img.fileName.trim() !== '' ? img.fileName : undefined,
      })).filter(img => img.url && img.fileName);

      // 蜿､縺・・繝ｭ繝代ユ繧｣繧・ｸ崎ｦ√↑繝励Ο繝代ユ繧｣繧堤｢ｺ螳溘↓髯､蜴ｻ
      const { imageUrl, imageFileName, options, ...restOfStep } = step;
      
      return {
        ...restOfStep,
        images: images && images.length > 0 ? images : undefined,
        // options縺ｯdecision繧ｿ繧､繝励・譎ゅ□縺台ｿ晄戟縺吶ｋ縺ｪ縺ｩ縺ｮ繝ｭ繧ｸ繝・け縺ｯ縺薙％縺ｧ縺ｯ縺ｪ縺・
      };
    });

    // 1. flowData縺九ｉ蜿､縺гlides繝励Ο繝代ユ繧｣繧堤｢ｺ螳溘↓髯､蜴ｻ縺吶ｋ
    const { slides, ...restOfFlowData } = flowData;

    const saveData = {
      ...restOfFlowData,
      title,
      description,
      steps: cleanedSteps,
      updatedAt: new Date().toISOString(),
    };
    
    const payload = {
      filePath: `knowledge-base/troubleshooting/${flowData.id}.json`,
      ...saveData,
    };
    console.log('売 [AutoSave] 騾∽ｿ｡繝壹う繝ｭ繝ｼ繝・', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/${flowData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log('笨・閾ｪ蜍穂ｿ晏ｭ伜ｮ御ｺ・);
        setHasChanges(false);
        setOriginalSteps(cleanedSteps);
      } else {
        const errorData = await response.json();
        console.error('笶・閾ｪ蜍穂ｿ晏ｭ伜､ｱ謨・', errorData.error);
        alert(`閾ｪ蜍穂ｿ晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆: ${errorData.error}`);
      }
    } catch (error) {
      console.error('笶・閾ｪ蜍穂ｿ晏ｭ倅ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ:', error);
    }
  }, [flowData, title, description, hasChanges]);
  
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setHasChanges(true);
  }, []);

  const handleDescriptionChange = useCallback((newDescription: string) => {
    setDescription(newDescription);
    setHasChanges(true);
  }, []);

  const handleSave = async (updatedSteps = steps) => {
    try {
      console.log('沈 繝輔Ο繝ｼ菫晏ｭ倬幕蟋・', {
        flowId: flowData?.id,
        title,
        description,
        stepsCount: updatedSteps.length,
        hasChanges
      });

      const flowDataToSave = {
        id: flowData?.id,
        title,
        description,
        triggerKeywords: flowData?.triggerKeywords || [],
        steps: updatedSteps,
        updatedAt: new Date().toISOString()
      };

      console.log('沈 菫晏ｭ倥☆繧九ョ繝ｼ繧ｿ:', flowDataToSave);
      onSave(flowDataToSave);
    } catch (error) {
      console.error('笶・繝輔Ο繝ｼ菫晏ｭ倥お繝ｩ繝ｼ:', error);
    }
  };

  const handleCancel = () => {
    console.log('笶・繧ｭ繝｣繝ｳ繧ｻ繝ｫ蜃ｦ逅・幕蟋・);
    setTitle(originalTitle);
    setDescription(originalDescription);
    setSteps(originalSteps);
    setHasChanges(false);
    console.log('笨・繧ｭ繝｣繝ｳ繧ｻ繝ｫ蜃ｦ逅・ｮ御ｺ・);
  };

  // 譛ｪ菴ｿ逕ｨ逕ｻ蜒上・繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・讖溯・
  const handleCleanupUnusedImages = async () => {
    console.log('ｧｹ 譛ｪ菴ｿ逕ｨ逕ｻ蜒上け繝ｪ繝ｼ繝ｳ繧｢繝・・髢句ｧ・);
    // 譛ｪ菴ｿ逕ｨ逕ｻ蜒上・繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・蜃ｦ逅・ｒ螳溯｣・
    console.log('笨・譛ｪ菴ｿ逕ｨ逕ｻ蜒上け繝ｪ繝ｼ繝ｳ繧｢繝・・螳御ｺ・);
  };

  // 繝・ヰ繝・げ諠・ｱ繧定｡ｨ遉ｺ
  console.log('売 EmergencyFlowEditor 繝ｬ繝ｳ繝繝ｪ繝ｳ繧ｰ:', {
    flowDataId: flowData?.id,
    flowDataTitle: flowData?.title,
    hasFlowData: !!flowData,
    stepsLength: steps.length,
    isInitialized: isInitialized,
    currentTab: currentTab,
    hasChanges: hasChanges,
    title: title,
    description: description,
    selectedFilePath: selectedFilePath
  });

  // 繧ｹ繝ｩ繧､繝臥ｷｨ髮・ち繝・
  if (currentTab === 'slides') {
    return (
      <div className="h-full flex flex-col">
        {/* 繝・ヰ繝・げ諠・ｱ */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">繝・ヰ繝・げ諠・ｱ</h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p>flowData.id: {flowData?.id || '縺ｪ縺・}</p>
            <p>flowData.title: {flowData?.title || '縺ｪ縺・}</p>
            <p>flowData.steps: {flowData?.steps?.length || 0}</p>
            <p>steps驟榊・縺ｮ蜀・ｮｹ: {JSON.stringify(steps.map(s => ({ id: s.id, title: s.title, type: s.type })))}</p>
            <p>isInitialized: {isInitialized.toString()}</p>
            <p>currentTab: {currentTab}</p>
            <p>hasChanges: {hasChanges.toString()}</p>
            <p>selectedFilePath: {selectedFilePath || '縺ｪ縺・}</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">繧ｹ繝ｩ繧､繝臥ｷｨ髮・/h2>
          <div className="flex gap-2">
            <Button
              onClick={handleCancel}
              variant="outline"
              size="sm"
            >
              <X className="w-4 h-4 mr-2" />
              繧ｭ繝｣繝ｳ繧ｻ繝ｫ
            </Button>
            <Button
              onClick={() => handleSave()}
              disabled={!hasChanges}
              size="sm"
            >
              菫晏ｭ・
            </Button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {steps.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">繧ｹ繝ｩ繧､繝峨′縺ゅｊ縺ｾ縺帙ｓ</p>
              <div className="flex justify-center gap-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddStep('step')}
                  className="h-10 px-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  騾壼ｸｸ繧ｹ繝ｩ繧､繝峨ｒ霑ｽ蜉
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddStep('decision')}
                  className="h-10 px-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  譚｡莉ｶ蛻・ｲ舌ｒ霑ｽ蜉
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded mb-4">
                <p className="text-blue-800 font-medium">StepEditor 繝ｬ繝ｳ繝繝ｪ繝ｳ繧ｰ諠・ｱ:</p>
                <p className="text-blue-700 text-sm">steps.length: {steps.length}</p>
                <p className="text-blue-700 text-sm">flowId: {flowData?.id}</p>
                <p className="text-blue-700 text-sm">steps蜀・ｮｹ: {steps.map(s => s.title).join(', ')}</p>
              </div>
              <div className="flex-1 min-h-0">
                <StepEditor
                  steps={steps}
                  onStepUpdate={handleStepUpdate}
                  onStepsReorder={handleStepsReorder}
                  onStepDelete={handleStepDelete}
                  onConditionAdd={handleConditionAdd}
                  onConditionDelete={handleConditionDelete}
                  onConditionEdit={handleConditionEdit}
                  flowId={flowData?.id}
                  onAddStepBetween={handleAddStepBetween}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* 繧ｹ繝ｩ繧､繝芽ｿｽ蜉繝懊ち繝ｳ */}
        <div className="flex justify-center gap-4 mt-4 p-6 bg-gray-50 rounded-lg border">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAddStep('step')}
            className="h-12 px-6 text-base-2x"
          >
            <Plus className="w-6 h-6 mr-2" />
            騾壼ｸｸ繧ｹ繝ｩ繧､繝峨ｒ霑ｽ蜉
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAddStep('decision')}
            className="h-12 px-6 text-base-2x"
          >
            <Plus className="w-6 h-6 mr-2" />
            譚｡莉ｶ蛻・ｲ舌ｒ霑ｽ蜉
          </Button>
        </div>
        
        {hasChanges && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mt-4">
            <p className="text-base-2x text-yellow-800">
              笞・・螟画峩縺梧､懷・縺輔ｌ縺ｾ縺励◆縲ゆｿ晏ｭ倥・繧ｿ繝ｳ繧偵け繝ｪ繝・け縺励※螟画峩繧剃ｿ晏ｭ倥＠縺ｦ縺上□縺輔＞縲・
            </p>
          </div>
        )}
      </div>
    );
  }

  // 繝・ヵ繧ｩ繝ｫ繝医・繝｡繧ｿ繝・・繧ｿ繧ｿ繝・
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="title" className="text-base-2x">繧ｿ繧､繝医Ν</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="繝輔Ο繝ｼ縺ｮ繧ｿ繧､繝医Ν繧貞・蜉・
          className="text-base-2x h-12"
        />
      </div>

      <div>
        <Label htmlFor="description" className="text-base-2x">隱ｬ譏・/Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="繝輔Ο繝ｼ縺ｮ隱ｬ譏弱ｒ蜈･蜉・
          rows={3}
          className="text-base-2x min-h-24"
        />
      </div>

      {hasChanges && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-base-2x text-yellow-800">
            笞・・螟画峩縺梧､懷・縺輔ｌ縺ｾ縺励◆縲ゆｿ晏ｭ倥・繧ｿ繝ｳ繧偵け繝ｪ繝・け縺励※螟画峩繧剃ｿ晏ｭ倥＠縺ｦ縺上□縺輔＞縲・
          </p>
        </div>
      )}
      
      {/* 菫晏ｭ倥・繧ｭ繝｣繝ｳ繧ｻ繝ｫ繝懊ち繝ｳ */}
      <div className="flex justify-end gap-4 pt-6 border-t">
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={!hasChanges}
          className="text-base-2x h-12 px-6"
        >
          繧ｭ繝｣繝ｳ繧ｻ繝ｫ
        </Button>
        <Button
          onClick={() => handleSave()}
          disabled={!hasChanges}
          className="text-base-2x h-12 px-6"
        >
          菫晏ｭ・
        </Button>
      </div>
    </div>
  );
};

export default EmergencyFlowEditor;