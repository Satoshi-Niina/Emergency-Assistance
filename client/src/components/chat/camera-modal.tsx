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
  // 常に背面カメラを使用する（切替機能なし）
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
    
    console.log('📸 CameraModal: open-camera イベントリスナーを登録しました');
    window.addEventListener('open-camera', handleOpenCamera);

    return () => {
      console.log('📸 CameraModal: open-camera イベントリスナーを削除しました');
      window.removeEventListener('open-camera', handleOpenCamera);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      // カメラ権限を事前にチェック
      const checkCameraPermission = async () => {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          console.log('📸 カメラ権限状態:', permission.state);
          
          if (permission.state === 'denied') {
            toast({
              title: "カメラ権限が拒否されています",
              description: "ブラウザの設定でカメラアクセスを許可してください。",
              variant: "destructive",
            });
            return;
          }
        } catch (err) {
          console.log('📸 権限APIが利用できません:', err);
        }
        
        // モーダルが開いたらカメラを起動
        // 少し遅延させることでステートの適用を確実にする
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
      console.log('📸 カメラアクセス開始');
      
      // ブラウザの対応状況を確認
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('このブラウザはカメラ機能をサポートしていません');
      }

      // HTTPSの確認
      const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
      console.log('🔒 セキュアコンテキスト:', isSecure, 'プロトコル:', location.protocol, 'ホスト:', location.hostname);
      
      if (!isSecure) {
        throw new Error('カメラアクセスにはHTTPS接続が必要です');
      }

      // ストリームが既に存在する場合は停止
      if (stream) {
        console.log('🛑 既存のストリームを停止');
        stream.getTracks().forEach(track => track.stop());
      }

      console.log('📸 カメラ制約設定:', {
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

      // カメラ制約を明示的に設定
      const constraints = { 
        video: { 
          facingMode: useBackCamera ? "environment" : "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: isVideoMode 
      };

      console.log('📸 getUserMedia呼び出し開始');
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ getUserMedia成功:', {
        streamActive: mediaStream.active,
        videoTracks: mediaStream.getVideoTracks().length,
        audioTracks: mediaStream.getAudioTracks().length
      });

      setStream(mediaStream);

      if (videoRef.current) {
        console.log('📺 ビデオ要素にストリーム設定');
        videoRef.current.srcObject = mediaStream;
        
        // ビデオが再生開始されるのを待つ
        videoRef.current.onloadedmetadata = () => {
          console.log('✅ ビデオメタデータ読み込み完了');
          videoRef.current?.play().catch(err => {
            console.error('❌ ビデオ再生エラー:', err);
          });
        };
      }
    } catch (error) {
      console.error('❌ カメラアクセスエラー:', error);
      
      let errorMessage = 'カメラにアクセスできませんでした';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'カメラの使用が許可されていません。ブラウザの設定でカメラアクセスを許可してください。';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'カメラが見つかりません。デバイスにカメラが接続されているか確認してください。';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'カメラが他のアプリケーションによって使用されています。';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage = 'カメラの設定に問題があります。別のカメラを試してください。';
        } else if (error.name === 'SecurityError') {
          errorMessage = 'セキュリティ上の理由でカメラにアクセスできません。HTTPSで接続してください。';
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

  // カメラ切り替え機能は削除（常に背面カメラのみを使用）

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
      // Capture image - 150dpi相当（約874px × 1240px）に圧縮
      const canvas = document.createElement('canvas');
      const video = videoRef.current;
      
      // 150dpi相当の最大解像度に制限
      const maxWidth = 874;   // 150dpi相当の幅
      const maxHeight = 1240; // 150dpi相当の高さ
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
          // より高い圧縮率でファイルサイズを最小化（品質0.4）
          const imageData = canvas.toDataURL('image/jpeg', 0.4);
          
          // Base64データが正しい形式になっているかチェック
          if (!imageData.startsWith('data:image/')) {
            console.error('Base64データの形式が不正です:', imageData.substring(0, 50));
            console.error('canvas.toDataURL()の結果:', typeof imageData, imageData.length);
            return;
          }
          
          console.log('✅ 撮影画像をBase64形式で生成成功:', {
            format: 'image/jpeg',
            quality: 0.4,
            resolution: '150dpi相当',
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
          console.error('canvas.toDataURL()でエラーが発生:', error);
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
        console.log('撮影した画像をチャットに送信します');

        // capturedImageが既にBase64形式かチェック
        let finalImageData = capturedImage;
        
        if (!capturedImage.startsWith('data:image/')) {
          console.log('画像データがBase64形式ではありません。変換します:', typeof capturedImage);
          // もしObjectやBlobの場合は、ここで変換処理を追加
          if (typeof capturedImage === 'object') {
            console.error('画像データがオブジェクト形式です。Base64変換が必要です。');
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

        // 完全なBase64データURLを直接contentに格納して送信
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
        <div id="camera-modal-desc" className="sr-only">写真や動画を撮影するためのカメラモーダル</div>
        <DialogHeader className="p-4 border-b border-blue-200 flex flex-row justify-between items-center bg-blue-100">
          <DialogTitle className="text-indigo-600 text-lg font-bold">カメラ起動</DialogTitle>
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

          {/* カメラ切り替えボタンは削除 - 常に背面カメラを使用 */}

          {/* Camera Controls - Different for Photo and Video modes */}
          {!capturedImage && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
              {isVideoMode ? (
                // ビデオモードのコントロール
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
                // 写真モードのコントロール
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
                  (isRecording ? "録画中... 停止するには□をタップ" : "◎ をタップして録画開始") : 
                  "○ をタップして写真撮影"}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}