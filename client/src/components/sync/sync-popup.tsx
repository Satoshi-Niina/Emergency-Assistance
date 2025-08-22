import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle,
  X,
  CloudSun,
  Upload,
  AlertTriangle
} from 'lucide-react';
import { Progress } from "../../components/ui/progress";
import { Card, CardContent, CardFooter } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useToast } from "../../hooks/use-toast.ts";
import { AnimatePresence, motion } from 'framer-motion';

interface SyncPopupProps {
  visible: boolean;
  onClose: () => void;
  totalItems: number;
  syncedItems: number;
  status: 'idle' | 'syncing' | 'success' | 'error' | 'partial'; 
  errorMessage?: string;
}

export const SyncPopup: React.FC<SyncPopupProps> = ({
  visible,
  onClose,
  totalItems,
  syncedItems,
  status,
  errorMessage
}) => {
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (totalItems > 0) {
      setProgress(Math.floor((syncedItems / totalItems) * 100));
    } else {
      setProgress(0);
    }
  }, [syncedItems, totalItems]);

  // 閾ｪ蜍暮哩縺倥ｋ繧ｿ繧､繝槭・・域・蜉滓凾・・
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === 'success' && visible) {
      timer = setTimeout(() => {
        onClose();
      }, 3000); // 3遘貞ｾ後↓閾ｪ蜍慕噪縺ｫ髢峨§繧・
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [status, visible, onClose]);

  const getStatusIcon = () => {
    switch (status) {
      case 'syncing':
        return <CloudSun className="h-6 w-6 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      case 'partial':
        return <AlertTriangle className="h-6 w-6 text-amber-500" />;
      default:
        return <Upload className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'syncing':
        return '蜷梧悄荳ｭ...';
      case 'success':
        return '蜷梧悄螳御ｺ・;
      case 'error':
        return '蜷梧悄繧ｨ繝ｩ繝ｼ';
      case 'partial':
        return '荳驛ｨ蜷梧悄螳御ｺ・;
      default:
        return '蜷梧悄貅門ｙ荳ｭ';
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case 'syncing':
        return `${totalItems}莉ｶ荳ｭ${syncedItems}莉ｶ縺悟酔譛溘＆繧後∪縺励◆...`;
      case 'success':
        return `${totalItems}莉ｶ縺ｮ繝・・繧ｿ縺後☆縺ｹ縺ｦ蜷梧悄縺輔ｌ縺ｾ縺励◆`;
      case 'error':
        return errorMessage || '蜷梧悄荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆';
      case 'partial':
        return `${totalItems}莉ｶ荳ｭ${syncedItems}莉ｶ縺ｮ縺ｿ蜷梧悄縺輔ｌ縺ｾ縺励◆`;
      default:
        return '蜷梧悄繧帝幕蟋九＠縺ｾ縺・..';
    }
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <Card className="w-80 shadow-lg">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex gap-3 items-center">
                  {getStatusIcon()}
                  <div>
                    <h3 className="font-semibold text-sm">{getStatusTitle()}</h3>
                    <p className="text-xs text-gray-500">{getStatusDescription()}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0" 
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {status === 'syncing' && (
                <div className="mt-3">
                  <Progress value={progress} className="h-1.5" />
                  <p className="text-xs text-right mt-1 text-gray-500">{progress}%</p>
                </div>
              )}
            </CardContent>
            
            {(status === 'error' || status === 'partial') && (
              <CardFooter className="p-3 pt-0 flex justify-end">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    // 蜀崎ｩｦ陦後い繧ｯ繧ｷ繝ｧ繝ｳ
                    toast({
                      title: "蜷梧悄繧貞・隧ｦ陦後＠縺ｦ縺・∪縺・,
                      description: "譛ｪ蜷梧悄縺ｮ繝・・繧ｿ縺ｮ蜷梧悄繧貞・隧ｦ陦後＠縺ｾ縺・.."
                    });
                    // 螳滄圀縺ｮ蜀崎ｩｦ陦後Ο繧ｸ繝・け縺ｯ縺薙％縺ｫ螳溯｣・ｼ郁ｦｪ繧ｳ繝ｳ繝昴・繝阪Φ繝医°繧画ｸ｡縺吶％縺ｨ繧ょ庄閭ｽ・・
                  }}
                >
                  蜀崎ｩｦ陦・
                </Button>
              </CardFooter>
            )}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
