import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, RotateCcw, X, Download, Upload, Settings, Zap, Eye, EyeOff, Volume2, VolumeX, TabletSmartphone, Video, Pause, Square, Circle } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useChat } from '../../context/chat-context';
import { useAuth } from '../../context/auth-context';
import { useIsMobile } from '../../hooks/use-mobile';
import { useIsTablet } from '../../hooks/use-tablet';
import { useIsDesktop } from '../../hooks/use-desktop';
import { useIsLargeScreen } from '../../hooks/use-large-screen';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useOrientation } from "../../hooks/use-orientation";

export default function CameraModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  // 蟶ｸ縺ｫ閭碁擇繧ｫ繝｡繝ｩ繧剃ｽｿ逕ｨ縺吶ｋ・亥・譖ｿ讖溯・縺ｪ縺暦ｼ・
  const [useBackCamera] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);

  const { captureImage, sendMessage } = useChat();
  const { toast } = useToast();
  const orientation = useOrientation();

  useEffect(() => {
    // Listen for open-camera event
    const handleOpenCamera = (event) => {
      console.log('萄 CameraModal: open-camera 繧､繝吶Φ繝医ｒ蜿嶺ｿ｡縺励∪縺励◆', event);
      setIsOpen(true);
    };
    
    console.log('萄 CameraModal: open-camera 繧､繝吶Φ繝医Μ繧ｹ繝翫・繧堤匳骭ｲ縺励∪縺励◆');
    window.addEventListener('open-camera', handleOpenCamera);

    return () => {
      console.log('萄 CameraModal: open-camera 繧､繝吶Φ繝医Μ繧ｹ繝翫・繧貞炎髯､縺励∪縺励◆');
      window.removeEventListener('open-camera', handleOpenCamera);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      // 繧ｫ繝｡繝ｩ讓ｩ髯舌ｒ莠句燕縺ｫ繝√ぉ繝・け
      const checkCameraPermission = async () => {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          console.log('萄 繧ｫ繝｡繝ｩ讓ｩ髯千憾諷・', permission.state);
          
          if (permission.state === 'denied') {
            toast({
              title: "繧ｫ繝｡繝ｩ讓ｩ髯舌′諡貞凄縺輔ｌ縺ｦ縺・∪縺・,
              description: "繝悶Λ繧ｦ繧ｶ縺ｮ險ｭ螳壹〒繧ｫ繝｡繝ｩ繧｢繧ｯ繧ｻ繧ｹ繧定ｨｱ蜿ｯ縺励※縺上□縺輔＞縲・,
              variant: "destructive",
            });
            return;
          }
        } catch (err) {
          console.log('萄 讓ｩ髯植PI縺悟茜逕ｨ縺ｧ縺阪∪縺帙ｓ:', err);
        }
        
        // 繝｢繝ｼ繝繝ｫ縺碁幕縺・◆繧峨き繝｡繝ｩ繧定ｵｷ蜍・
        // 蟆代＠驕・ｻｶ縺輔○繧九％縺ｨ縺ｧ繧ｹ繝・・繝医・驕ｩ逕ｨ繧堤｢ｺ螳溘↓縺吶ｋ
        setTimeout(() => {
          startCamera();
        }, 300);
      };
      
      checkCameraPermission();
    } else {
      // 繝｢繝ｼ繝繝ｫ縺碁哩縺倥◆繧峨き繝｡繝ｩ繧貞●豁｢
      stopCamera();
    }
  }, [isOpen]);

  const startCamera = async () => {
    try {
      console.log('萄 繧ｫ繝｡繝ｩ繧｢繧ｯ繧ｻ繧ｹ髢句ｧ・);
      
      // 繝悶Λ繧ｦ繧ｶ縺ｮ蟇ｾ蠢懃憾豕√ｒ遒ｺ隱・
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('縺薙・繝悶Λ繧ｦ繧ｶ縺ｯ繧ｫ繝｡繝ｩ讖溯・繧偵し繝昴・繝医＠縺ｦ縺・∪縺帙ｓ');
      }

      // HTTPS縺ｮ遒ｺ隱・
      const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
      console.log('白 繧ｻ繧ｭ繝･繧｢繧ｳ繝ｳ繝・く繧ｹ繝・', isSecure, '繝励Ο繝医さ繝ｫ:', location.protocol, '繝帙せ繝・', location.hostname);
      
      if (!isSecure) {
        throw new Error('繧ｫ繝｡繝ｩ繧｢繧ｯ繧ｻ繧ｹ縺ｫ縺ｯHTTPS謗･邯壹′蠢・ｦ√〒縺・);
      }

      // 繧ｹ繝医Μ繝ｼ繝縺梧里縺ｫ蟄伜惠縺吶ｋ蝣ｴ蜷医・蛛懈ｭ｢
      if (stream) {
        console.log('尅 譌｢蟄倥・繧ｹ繝医Μ繝ｼ繝繧貞●豁｢');
        stream.getTracks().forEach(track => track.stop());
      }

      console.log('萄 繧ｫ繝｡繝ｩ蛻ｶ邏・ｨｭ螳・', {
        facingMode: useBackCamera ? "environment" : "user",
        videoMode: isVideoMode,
        constraints: {
          video: { 
            facingMode: useBackCamera ? "environment" : "user",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: isVideoMode 
        }
      });

      // 繧ｫ繝｡繝ｩ蛻ｶ邏・ｒ譏守､ｺ逧・↓險ｭ螳・
      const constraints = { 
        video: { 
          facingMode: useBackCamera ? "environment" : "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: isVideoMode 
      };

      console.log('萄 getUserMedia蜻ｼ縺ｳ蜃ｺ縺鈴幕蟋・);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('笨・getUserMedia謌仙粥:', {
        streamActive: mediaStream.active,
        videoTracks: mediaStream.getVideoTracks().length,
        audioTracks: mediaStream.getAudioTracks().length
      });

      setStream(mediaStream);

      if (videoRef.current) {
        console.log('銅 繝薙ョ繧ｪ隕∫ｴ縺ｫ繧ｹ繝医Μ繝ｼ繝險ｭ螳・);
        videoRef.current.srcObject = mediaStream;
        
        // 繝薙ョ繧ｪ縺悟・逕滄幕蟋九＆繧後ｋ縺ｮ繧貞ｾ・▽
        videoRef.current.onloadedmetadata = () => {
          console.log('笨・繝薙ョ繧ｪ繝｡繧ｿ繝・・繧ｿ隱ｭ縺ｿ霎ｼ縺ｿ螳御ｺ・);
          videoRef.current?.play().catch(err => {
            console.error('笶・繝薙ョ繧ｪ蜀咲函繧ｨ繝ｩ繝ｼ:', err);
          });
        };
      }
    } catch (error) {
      console.error('笶・繧ｫ繝｡繝ｩ繧｢繧ｯ繧ｻ繧ｹ繧ｨ繝ｩ繝ｼ:', error);
      
      let errorMessage = '繧ｫ繝｡繝ｩ縺ｫ繧｢繧ｯ繧ｻ繧ｹ縺ｧ縺阪∪縺帙ｓ縺ｧ縺励◆';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = '繧ｫ繝｡繝ｩ縺ｮ菴ｿ逕ｨ縺瑚ｨｱ蜿ｯ縺輔ｌ縺ｦ縺・∪縺帙ｓ縲ゅヶ繝ｩ繧ｦ繧ｶ縺ｮ險ｭ螳壹〒繧ｫ繝｡繝ｩ繧｢繧ｯ繧ｻ繧ｹ繧定ｨｱ蜿ｯ縺励※縺上□縺輔＞縲・;
        } else if (error.name === 'NotFoundError') {
          errorMessage = '繧ｫ繝｡繝ｩ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ縲ゅョ繝舌う繧ｹ縺ｫ繧ｫ繝｡繝ｩ縺梧磁邯壹＆繧後※縺・ｋ縺狗｢ｺ隱阪＠縺ｦ縺上□縺輔＞縲・;
        } else if (error.name === 'NotReadableError') {
          errorMessage = '繧ｫ繝｡繝ｩ縺御ｻ悶・繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ縺ｫ繧医▲縺ｦ菴ｿ逕ｨ縺輔ｌ縺ｦ縺・∪縺吶・;
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = '繧ｫ繝｡繝ｩ縺ｮ險ｭ螳壹↓蝠城｡後′縺ゅｊ縺ｾ縺吶ょ挨縺ｮ繧ｫ繝｡繝ｩ繧定ｩｦ縺励※縺上□縺輔＞縲・;
        } else if (error.name === 'SecurityError') {
          errorMessage = '繧ｻ繧ｭ繝･繝ｪ繝・ぅ荳翫・逅・罰縺ｧ繧ｫ繝｡繝ｩ縺ｫ繧｢繧ｯ繧ｻ繧ｹ縺ｧ縺阪∪縺帙ｓ縲・TTPS縺ｧ謗･邯壹＠縺ｦ縺上□縺輔＞縲・;
        } else {
          errorMessage = `繧ｫ繝｡繝ｩ繧ｨ繝ｩ繝ｼ: ${error.message}`;
        }
      }

      toast({
        title: "繧ｫ繝｡繝ｩ繧ｨ繝ｩ繝ｼ",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // 繧ｫ繝｡繝ｩ蛻・ｊ譖ｿ縺域ｩ溯・縺ｯ蜑企勁・亥ｸｸ縺ｫ閭碁擇繧ｫ繝｡繝ｩ縺ｮ縺ｿ繧剃ｽｿ逕ｨ・・

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    if (isRecording) {
      stopRecording();
    }

    setCapturedImage(null);
  };

  const handleCapture = () => {
    if (!videoRef.current) return;

    if (isVideoMode) {
      // Toggle video recording
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    } else {
      // Capture image - 150dpi逶ｸ蠖難ｼ育ｴ・74px ﾃ・1240px・峨↓蝨ｧ邵ｮ
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      
      // 150dpi逶ｸ蠖薙・譛螟ｧ隗｣蜒丞ｺｦ縺ｫ蛻ｶ髯・
      const maxWidth = 874;   // 150dpi逶ｸ蠖薙・蟷・
      const maxHeight = 1240; // 150dpi逶ｸ蠖薙・鬮倥＆
      let { videoWidth, videoHeight } = video;
      
      // 繧｢繧ｹ繝壹け繝域ｯ斐ｒ菫晄戟縺励※繝ｪ繧ｵ繧､繧ｺ
      if (videoWidth > maxWidth || videoHeight > maxHeight) {
        const aspectRatio = videoWidth / videoHeight;
        if (videoWidth > videoHeight) {
          videoWidth = maxWidth;
          videoHeight = maxWidth / aspectRatio;
        } else {
          videoHeight = maxHeight;
          videoWidth = maxHeight * aspectRatio;
        }
      }
      
      canvas.width = videoWidth;
      canvas.height = videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx && video) {
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
        
        try {
          // 繧医ｊ鬮倥＞蝨ｧ邵ｮ邇・〒繝輔ぃ繧､繝ｫ繧ｵ繧､繧ｺ繧呈怙蟆丞喧・亥刀雉ｪ0.4・・
          const imageData = canvas.toDataURL('image/jpeg', 0.4);
          
          // Base64繝・・繧ｿ縺梧ｭ｣縺励＞蠖｢蠑上↓縺ｪ縺｣縺ｦ縺・ｋ縺九メ繧ｧ繝・け
          if (!imageData.startsWith('data:image/')) {
            console.error('Base64繝・・繧ｿ縺ｮ蠖｢蠑上′荳肴ｭ｣縺ｧ縺・', imageData.substring(0, 50));
            console.error('canvas.toDataURL()縺ｮ邨先棡:', typeof imageData, imageData.length);
            return;
          }
          
          console.log('笨・謦ｮ蠖ｱ逕ｻ蜒上ｒBase64蠖｢蠑上〒逕滓・謌仙粥:', {
            format: 'image/jpeg',
            quality: 0.4,
            resolution: '150dpi逶ｸ蠖・,
            originalSize: `${video.videoWidth}x${video.videoHeight}`,
            compressedSize: `${videoWidth}x${videoHeight}`,
            maxResolution: `${maxWidth}x${maxHeight}`,
            dataLength: imageData.length,
            dataSizeMB: (imageData.length / 1024 / 1024).toFixed(2),
            isValidBase64: imageData.startsWith('data:image/jpeg;base64,'),
            mimeType: imageData.split(';')[0],
            preview: imageData.substring(0, 50) + '...'
          });
          
          setCapturedImage(imageData);
        } catch (error) {
          console.error('canvas.toDataURL()縺ｧ繧ｨ繝ｩ繝ｼ縺檎匱逕・', error);
        }
      }
    }
  };

  const startRecording = () => {
    recordedChunksRef.current = [];

    if (stream) {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/mp4' });
        const videoUrl = URL.createObjectURL(blob);
        setCapturedImage(videoUrl);
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSend = async () => {
    if (capturedImage) {
      try {
        console.log('謦ｮ蠖ｱ縺励◆逕ｻ蜒上ｒ繝√Ε繝・ヨ縺ｫ騾∽ｿ｡縺励∪縺・);

        // capturedImage縺梧里縺ｫBase64蠖｢蠑上°繝√ぉ繝・け
        let finalImageData = capturedImage;
        
        if (!capturedImage.startsWith('data:image/')) {
          console.log('逕ｻ蜒上ョ繝ｼ繧ｿ縺沓ase64蠖｢蠑上〒縺ｯ縺ゅｊ縺ｾ縺帙ｓ縲ょ､画鋤縺励∪縺・', typeof capturedImage);
          // 繧ゅ＠Object繧Вlob縺ｮ蝣ｴ蜷医・縲√％縺薙〒螟画鋤蜃ｦ逅・ｒ霑ｽ蜉
          if (typeof capturedImage === 'object') {
            console.error('逕ｻ蜒上ョ繝ｼ繧ｿ縺後が繝悶ず繧ｧ繧ｯ繝亥ｽ｢蠑上〒縺吶・ase64螟画鋤縺悟ｿ・ｦ√〒縺吶・);
            return;
          }
          finalImageData = `data:image/jpeg;base64,${capturedImage}`;
        }

        console.log('騾∽ｿ｡縺吶ｋ逕ｻ蜒上ョ繝ｼ繧ｿ:', {
          isBase64: finalImageData.startsWith('data:image/'),
          urlLength: finalImageData.length,
          mimeType: finalImageData.split(';')[0],
          preview: finalImageData.substring(0, 50) + '...'
        });

        // 螳悟・縺ｪBase64繝・・繧ｿURL繧堤峩謗･content縺ｫ譬ｼ邏阪＠縺ｦ騾∽ｿ｡
        await sendMessage(finalImageData);

        setIsOpen(false);
        setCapturedImage(null);
      } catch (error) {
        console.error('逕ｻ蜒城∽ｿ｡繧ｨ繝ｩ繝ｼ:', error);
      }
    }
  };

  const toggleCameraMode = () => {
    if (isRecording) {
      stopRecording();
    }

    setIsVideoMode(!isVideoMode);
    setCapturedImage(null);

    // Restart camera with new settings
    stopCamera();
    setTimeout(() => startCamera(), 300);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className={`${orientation === 'landscape' ? 'max-w-3xl' : 'max-w-md'} p-0 overflow-hidden bg-blue-50 border border-blue-200 camera-modal`} aria-describedby="camera-modal-desc">
        <DialogTitle className="sr-only">繧ｫ繝｡繝ｩ</DialogTitle>
        <div id="camera-modal-desc" className="sr-only">蜀咏悄繧・虚逕ｻ繧呈聴蠖ｱ縺吶ｋ縺溘ａ縺ｮ繧ｫ繝｡繝ｩ繝｢繝ｼ繝繝ｫ</div>
        <DialogHeader className="p-4 border-b border-blue-200 flex flex-row justify-between items-center bg-blue-100">
          <DialogTitle className="text-indigo-600 text-lg font-bold">繧ｫ繝｡繝ｩ襍ｷ蜍・/DialogTitle>
          <div className="flex items-center space-x-4">
            <div className="flex items-center bg-white px-2 py-1 rounded-full">
              <TabletSmartphone className="h-6 w-6 mr-2 text-indigo-600" />
              <Switch 
                id="camera-mode" 
                checked={isVideoMode}
                onCheckedChange={toggleCameraMode}
              />
              <Video className="h-6 w-6 ml-2 text-indigo-600" />
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="p-2 rounded-full hover:bg-blue-200 text-blue-700"
              onClick={() => setIsOpen(false)}
            >
              <X />
            </Button>
          </div>
        </DialogHeader>

        <div className="relative bg-black">
          {!capturedImage ? (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full ${orientation === 'landscape' ? 'h-64' : 'h-80'} bg-neutral-800 object-cover`}
            />
          ) : (
            isVideoMode ? (
              <video 
                src={capturedImage} 
                controls 
                className={`w-full ${orientation === 'landscape' ? 'h-64' : 'h-80'} bg-neutral-800 object-contain`}
                onClick={() => window.dispatchEvent(new CustomEvent('preview-image', { detail: { url: capturedImage } }))}
              />
            ) : (
              <img 
                src={capturedImage} 
                alt="Captured" 
                className={`w-full ${orientation === 'landscape' ? 'h-64' : 'h-80'} bg-neutral-800 object-contain`}
                onClick={() => window.dispatchEvent(new CustomEvent('preview-image', { detail: { url: capturedImage } }))}
              />
            )
          )}

          {/* 繧ｫ繝｡繝ｩ蛻・ｊ譖ｿ縺医・繧ｿ繝ｳ縺ｯ蜑企勁 - 蟶ｸ縺ｫ閭碁擇繧ｫ繝｡繝ｩ繧剃ｽｿ逕ｨ */}

          {/* Camera Controls - Different for Photo and Video modes */}
          {!capturedImage && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
              {isVideoMode ? (
                // 繝薙ョ繧ｪ繝｢繝ｼ繝峨・繧ｳ繝ｳ繝医Ο繝ｼ繝ｫ
                <>
                  {isRecording ? (
                    <>
                      <Button 
                        className="bg-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
                        variant="outline"
                        size="icon"
                        onClick={stopRecording}
                      >
                        <Pause className="h-6 w-6 text-blue-600" />
                      </Button>
                      <Button 
                        className="bg-red-500 rounded-full w-14 h-14 flex items-center justify-center shadow-lg"
                        variant="outline"
                        size="icon"
                        onClick={stopRecording}
                      >
                        <Square className="h-6 w-6 text-white" />
                      </Button>
                    </>
                  ) : (
                    <Button 
                      className="bg-blue-600 rounded-full w-16 h-16 flex items-center justify-center shadow-lg border-2 border-white"
                      variant="outline"
                      size="icon"
                      onClick={startRecording}
                    >
                      <Circle className="h-8 w-8 text-white" />
                    </Button>
                  )}
                </>
              ) : (
                // 蜀咏悄繝｢繝ｼ繝峨・繧ｳ繝ｳ繝医Ο繝ｼ繝ｫ
                <Button 
                  className="bg-blue-600 rounded-full w-16 h-16 flex items-center justify-center shadow-lg border-2 border-white"
                  variant="outline"
                  size="icon"
                  onClick={handleCapture}
                >
                  <Circle className="h-12 w-12 text-white" />
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="p-4 bg-blue-50">
          {capturedImage ? (
            <Button 
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium text-lg"
              onClick={handleSend}
            >
              騾∽ｿ｡縺吶ｋ
            </Button>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-700 font-medium">
                {isVideoMode ? 
                  (isRecording ? "骭ｲ逕ｻ荳ｭ... 蛛懈ｭ｢縺吶ｋ縺ｫ縺ｯ笆｡繧偵ち繝・・" : "笳・繧偵ち繝・・縺励※骭ｲ逕ｻ髢句ｧ・) : 
                  "笳・繧偵ち繝・・縺励※蜀咏悄謦ｮ蠖ｱ"}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
