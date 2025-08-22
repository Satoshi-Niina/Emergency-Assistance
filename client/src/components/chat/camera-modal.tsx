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
  // 常に背面カメラを使用する�E��E替機�Eなし！E
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
      console.log('📸 CameraModal: open-camera イベントを受信しました', event);
      setIsOpen(true);
    };
    
    console.log('📸 CameraModal: open-camera イベントリスナ�Eを登録しました');
    window.addEventListener('open-camera', handleOpenCamera);

    return () => {
      console.log('📸 CameraModal: open-camera イベントリスナ�Eを削除しました');
      window.removeEventListener('open-camera', handleOpenCamera);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      // カメラ権限を事前にチェチE��
      const checkCameraPermission = async () => {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          console.log('📸 カメラ権限状慁E', permission.state);
          
          if (permission.state === 'denied') {
            toast({
              title: "カメラ権限が拒否されてぁE��ぁE,
              description: "ブラウザの設定でカメラアクセスを許可してください、E,
              variant: "destructive",
            });
            return;
          }
        } catch (err) {
          console.log('📸 権限APIが利用できません:', err);
        }
        
        // モーダルが開ぁE��らカメラを起勁E
        // 少し遁E��させることでスチE�Eト�E適用を確実にする
        setTimeout(() => {
          startCamera();
        }, 300);
      };
      
      checkCameraPermission();
    } else {
      // モーダルが閉じたらカメラを停止
      stopCamera();
    }
  }, [isOpen]);

  const startCamera = async () => {
    try {
      console.log('📸 カメラアクセス開姁E);
      
      // ブラウザの対応状況を確誁E
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('こ�Eブラウザはカメラ機�Eをサポ�EトしてぁE��せん');
      }

      // HTTPSの確誁E
      const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
      console.log('🔒 セキュアコンチE��スチE', isSecure, 'プロトコル:', location.protocol, 'ホスチE', location.hostname);
      
      if (!isSecure) {
        throw new Error('カメラアクセスにはHTTPS接続が忁E��でぁE);
      }

      // ストリームが既に存在する場合�E停止
      if (stream) {
        console.log('🛑 既存�Eストリームを停止');
        stream.getTracks().forEach(track => track.stop());
      }

      console.log('📸 カメラ制紁E��宁E', {
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

      // カメラ制紁E��明示皁E��設宁E
      const constraints = { 
        video: { 
          facingMode: useBackCamera ? "environment" : "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: isVideoMode 
      };

      console.log('📸 getUserMedia呼び出し開姁E);
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✁EgetUserMedia成功:', {
        streamActive: mediaStream.active,
        videoTracks: mediaStream.getVideoTracks().length,
        audioTracks: mediaStream.getAudioTracks().length
      });

      setStream(mediaStream);

      if (videoRef.current) {
        console.log('📺 ビデオ要素にストリーム設宁E);
        videoRef.current.srcObject = mediaStream;
        
        // ビデオが�E生開始されるのを征E��
        videoRef.current.onloadedmetadata = () => {
          console.log('✁EビデオメタチE�Eタ読み込み完亁E);
          videoRef.current?.play().catch(err => {
            console.error('❁Eビデオ再生エラー:', err);
          });
        };
      }
    } catch (error) {
      console.error('❁Eカメラアクセスエラー:', error);
      
      let errorMessage = 'カメラにアクセスできませんでした';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'カメラの使用が許可されてぁE��せん。ブラウザの設定でカメラアクセスを許可してください、E;
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'カメラが見つかりません。デバイスにカメラが接続されてぁE��か確認してください、E;
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'カメラが他�Eアプリケーションによって使用されてぁE��す、E;
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = 'カメラの設定に問題があります。別のカメラを試してください、E;
        } else if (error.name === 'SecurityError') {
          errorMessage = 'セキュリチE��上�E琁E��でカメラにアクセスできません、ETTPSで接続してください、E;
        } else {
          errorMessage = `カメラエラー: ${error.message}`;
        }
      }

      toast({
        title: "カメラエラー",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // カメラ刁E��替え機�Eは削除�E�常に背面カメラのみを使用�E�E

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
      // Capture image - 150dpi相当（紁E74px ÁE1240px�E�に圧縮
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      
      // 150dpi相当�E最大解像度に制陁E
      const maxWidth = 874;   // 150dpi相当�E幁E
      const maxHeight = 1240; // 150dpi相当�E高さ
      let { videoWidth, videoHeight } = video;
      
      // アスペクト比を保持してリサイズ
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
          // より高い圧縮玁E��ファイルサイズを最小化�E�品質0.4�E�E
          const imageData = canvas.toDataURL('image/jpeg', 0.4);
          
          // Base64チE�Eタが正しい形式になってぁE��かチェチE��
          if (!imageData.startsWith('data:image/')) {
            console.error('Base64チE�Eタの形式が不正でぁE', imageData.substring(0, 50));
            console.error('canvas.toDataURL()の結果:', typeof imageData, imageData.length);
            return;
          }
          
          console.log('✁E撮影画像をBase64形式で生�E成功:', {
            format: 'image/jpeg',
            quality: 0.4,
            resolution: '150dpi相彁E,
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
          console.error('canvas.toDataURL()でエラーが発甁E', error);
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
        console.log('撮影した画像をチャチE��に送信しまぁE);

        // capturedImageが既にBase64形式かチェチE��
        let finalImageData = capturedImage;
        
        if (!capturedImage.startsWith('data:image/')) {
          console.log('画像データがBase64形式ではありません。変換しまぁE', typeof capturedImage);
          // もしObjectやBlobの場合�E、ここで変換処琁E��追加
          if (typeof capturedImage === 'object') {
            console.error('画像データがオブジェクト形式です、Ease64変換が忁E��です、E);
            return;
          }
          finalImageData = `data:image/jpeg;base64,${capturedImage}`;
        }

        console.log('送信する画像データ:', {
          isBase64: finalImageData.startsWith('data:image/'),
          urlLength: finalImageData.length,
          mimeType: finalImageData.split(';')[0],
          preview: finalImageData.substring(0, 50) + '...'
        });

        // 完�EなBase64チE�EタURLを直接contentに格納して送信
        await sendMessage(finalImageData);

        setIsOpen(false);
        setCapturedImage(null);
      } catch (error) {
        console.error('画像送信エラー:', error);
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
        <DialogTitle className="sr-only">カメラ</DialogTitle>
        <div id="camera-modal-desc" className="sr-only">写真めE��画を撮影するためのカメラモーダル</div>
        <DialogHeader className="p-4 border-b border-blue-200 flex flex-row justify-between items-center bg-blue-100">
          <DialogTitle className="text-indigo-600 text-lg font-bold">カメラ起勁E/DialogTitle>
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

          {/* カメラ刁E��替え�Eタンは削除 - 常に背面カメラを使用 */}

          {/* Camera Controls - Different for Photo and Video modes */}
          {!capturedImage && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
              {isVideoMode ? (
                // ビデオモード�Eコントロール
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
                // 写真モード�Eコントロール
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
              送信する
            </Button>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-700 font-medium">
                {isVideoMode ? 
                  (isRecording ? "録画中... 停止するには□をタチE�E" : "◁EをタチE�Eして録画開姁E) : 
                  "◁EをタチE�Eして写真撮影"}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
