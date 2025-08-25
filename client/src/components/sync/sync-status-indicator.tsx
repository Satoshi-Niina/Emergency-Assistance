import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, CloudOff, CloudSun, Wifi, WifiOff } from 'lucide-react';
import { useToast } from "../../hooks/use-toast.ts";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";
import { cn } from '../../lib/utils.ts';
import { Card, CardContent } from "../../components/ui/card";
import { isChatSynced } from "../../lib/offline-storage";
import { syncChat } from "../../lib/sync-api";

interface SyncStatusIndicatorProps {
  chatId: number;
  className?: string;
  onComplete?: () => void;
}

type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'pending';

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  chatId,
  className,
  onComplete
}) => {
  const [status, setStatus] = useState<SyncStatus>('synced');
  const [progress, setProgress] = useState(100);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasPendingMessages, setHasPendingMessages] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const { toast } = useToast();

  // 繧ｪ繝ｳ繝ｩ繧､繝ｳ迥ｶ諷九ｒ逶｣隕・
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: '繧ｪ繝ｳ繝ｩ繧､繝ｳ縺ｫ謌ｻ繧翫∪縺励◆',
        description: '繝阪ャ繝医Ρ繝ｼ繧ｯ謗･邯壹′蠕ｩ譌ｧ縺励∪縺励◆縲り・蜍慕噪縺ｫ蜷梧悄繧帝幕蟋九＠縺ｾ縺吶・,
        variant: 'default'
      });
      checkSyncStatus();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: '繧ｪ繝輔Λ繧､繝ｳ縺ｫ縺ｪ繧翫∪縺励◆',
        description: '繝阪ャ繝医Ρ繝ｼ繧ｯ謗･邯壹′蛻・妙縺輔ｌ縺ｾ縺励◆縲よ磁邯壹′蠕ｩ譌ｧ縺吶ｋ縺ｨ閾ｪ蜍慕噪縺ｫ蜷梧悄縺励∪縺吶・,
        variant: 'destructive'
      });
      setStatus('offline');
    };

    const handleSyncStatusUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, error } = customEvent.detail;

      if (type === 'sync-started') {
        setStatus('syncing');
        setProgress(20);
      } else if (type === 'sync-complete') {
        setStatus('synced');
        setProgress(100);
        setHasPendingMessages(false);
        toast({
          title: '蜷梧悄螳御ｺ・,
          description: '縺吶∋縺ｦ縺ｮ繝｡繝・そ繝ｼ繧ｸ縺梧ｭ｣蟶ｸ縺ｫ蜷梧悄縺輔ｌ縺ｾ縺励◆縲・,
          variant: 'default'
        });
        if (onComplete) onComplete();
      } else if (type === 'sync-error') {
        setStatus('error');
        setSyncError(error);
        toast({
          title: '蜷梧悄繧ｨ繝ｩ繝ｼ',
          description: `蜷梧悄荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆: ${error}`,
          variant: 'destructive'
        });
      } else if (type === 'sync-progress') {
        setProgress(customEvent.detail.progress);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-status-update', handleSyncStatusUpdate);

    // 蛻晄悄迥ｶ諷九ｒ遒ｺ隱・
    checkSyncStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-status-update', handleSyncStatusUpdate);
    };
  }, [chatId, toast, onComplete]);

  // 蜷梧悄迥ｶ諷九ｒ遒ｺ隱・
  const checkSyncStatus = async () => {
    try {
      const synced = await isChatSynced(chatId);
      if (synced) {
        setStatus('synced');
        setHasPendingMessages(false);
      } else {
        setStatus('pending');
        setHasPendingMessages(true);
        
        if (isOnline) {
          // 繧ｪ繝ｳ繝ｩ繧､繝ｳ縺ｮ蝣ｴ蜷医・閾ｪ蜍慕噪縺ｫ蜷梧悄繧帝幕蟋・
          handleManualSync();
        }
      }
    } catch (error) {
      console.error('蜷梧悄迥ｶ諷九・遒ｺ隱堺ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:', error);
    }
  };

  // 謇句虚蜷梧悄
  const handleManualSync = async () => {
    if (!isOnline) {
      toast({
        title: '繧ｪ繝輔Λ繧､繝ｳ迥ｶ諷九〒縺・,
        description: '繝阪ャ繝医Ρ繝ｼ繧ｯ謗･邯壹′縺ゅｊ縺ｾ縺帙ｓ縲よ磁邯壹′蠕ｩ譌ｧ縺吶ｋ縺ｨ閾ｪ蜍慕噪縺ｫ蜷梧悄縺励∪縺吶・,
        variant: 'destructive'
      });
      return;
    }

    setStatus('syncing');
    setProgress(10);

    try {
      // 蜷梧悄髢句ｧ九う繝吶Φ繝医ｒ逋ｺ轣ｫ
      window.dispatchEvent(new CustomEvent('sync-status-update', {
        detail: { type: 'sync-started' }
      }));

      // 蜷梧悄螳溯｡・
      const result = await syncChat(chatId);

      if (result.success) {
        // 螳御ｺ・う繝吶Φ繝・
        window.dispatchEvent(new CustomEvent('sync-status-update', {
          detail: { 
            type: 'sync-complete',
            totalSynced: result.totalSynced
          }
        }));
        
        if (result.totalSynced > 0) {
          toast({
            title: '蜷梧悄螳御ｺ・,
            description: `${result.totalSynced}莉ｶ縺ｮ繝｡繝・そ繝ｼ繧ｸ縺悟酔譛溘＆繧後∪縺励◆縲Ａ,
            variant: 'default'
          });
        } else {
          // 譌｢縺ｫ蜷梧悄貂医∩
          setStatus('synced');
        }
      } else {
        // 繧ｨ繝ｩ繝ｼ繧､繝吶Φ繝・
        window.dispatchEvent(new CustomEvent('sync-status-update', {
          detail: { 
            type: 'sync-error',
            error: result.error ? (result.error as Error).message : '蜷梧悄縺ｫ螟ｱ謨励＠縺ｾ縺励◆'
          }
        }));
      }
    } catch (error: any) {
      // 繧ｨ繝ｩ繝ｼ繧､繝吶Φ繝・
      window.dispatchEvent(new CustomEvent('sync-status-update', {
        detail: { 
          type: 'sync-error',
          error: error?.message || '蜷梧悄荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆'
        }
      }));
    }
  };

  // 繧ｹ繝・・繧ｿ繧ｹ縺ｫ蠢懊§縺溘い繧､繧ｳ繝ｳ縺ｨ繝・く繧ｹ繝・
  const getStatusInfo = () => {
    switch (status) {
      case 'synced':
        return {
          icon: <CheckCircle className="w-4 h-4 text-green-500" />,
          text: '蜷梧悄貂医∩',
          color: 'text-green-500'
        };
      case 'syncing':
        return {
          icon: <CloudSun className="w-4 h-4 text-blue-500 animate-spin" />,
          text: '蜷梧悄荳ｭ...',
          color: 'text-blue-500'
        };
      case 'offline':
        return {
          icon: <WifiOff className="w-4 h-4 text-amber-500" />,
          text: '繧ｪ繝輔Λ繧､繝ｳ',
          color: 'text-amber-500'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-4 h-4 text-red-500" />,
          text: '蜷梧悄繧ｨ繝ｩ繝ｼ',
          color: 'text-red-500'
        };
      case 'pending':
        return {
          icon: <CloudOff className="w-4 h-4 text-amber-500" />,
          text: '譛ｪ蜷梧悄',
          color: 'text-amber-500'
        };
      default:
        return {
          icon: <Wifi className="w-4 h-4" />,
          text: '謗･邯壻ｸｭ',
          color: 'text-gray-500'
        };
    }
  };

  const statusInfo = getStatusInfo();

  // 繧ｳ繝ｳ繝代け繝郁｡ｨ遉ｺ・医い繧､繧ｳ繝ｳ縺ｮ縺ｿ・・
  if (!hasPendingMessages && status === 'synced') {
    return (
      <div className={cn("flex items-center", className)} title="蜷梧悄貂医∩">
        {statusInfo.icon}
      </div>
    );
  }

  // 隧ｳ邏ｰ陦ｨ遉ｺ・医せ繝・・繧ｿ繧ｹ縺ｨ謫堺ｽ懊・繧ｿ繝ｳ・・
  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {statusInfo.icon}
            <span className={cn("text-sm font-medium", statusInfo.color)}>
              {statusInfo.text}
            </span>
            {status === 'syncing' && (
              <Progress
                value={progress}
                className="h-2 w-20"
              />
            )}
          </div>
          
          {(status === 'error' || status === 'pending' || status === 'offline') && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={!isOnline}
            >
              蜀榊酔譛・
            </Button>
          )}
        </div>
        
        {syncError && (
          <p className="text-xs text-red-500 mt-1">
            繧ｨ繝ｩ繝ｼ: {syncError}
          </p>
        )}
      </CardContent>
    </Card>
  );
};