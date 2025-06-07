import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useChat } from "@/context/chat-context";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Copy, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { speakText, stopSpeaking } from "@/lib/text-to-speech";

interface MessageBubbleProps {
  message: {
    id: number;
    content: string;
    senderId: number | null;
    isAiResponse: boolean;
    timestamp: Date;
    media?: {
      id: number;
      type: string;
      url: string;
      thumbnail?: string;
    }[];
  };
  isDraft?: boolean;
}

export default function MessageBubble({ message, isDraft = false }: MessageBubbleProps) {
  const { user } = useAuth();
  const { setSelectedText } = useChat();
  const [localSelectedText, setLocalSelectedText] = useState("");
  const [showCopyButton, setShowCopyButton] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { toast } = useToast();

  const isUserMessage = !message.isAiResponse;
  
  // 応急処置ガイドメッセージかどうかを判定
  const isEmergencyGuideMessage = message.content && message.content.includes('応急処置ガイド実施記録');
  
  // デバッグ用：応急処置ガイドメッセージの場合はログ出力
  if (isEmergencyGuideMessage) {
    console.log('🔵 応急処置ガイドメッセージを表示します:', {
      id: message.id,
      isAiResponse: message.isAiResponse,
      contentStart: message.content.substring(0, 50) + '...',
      timestamp: message.timestamp
    });
  }

  // 日時フォーマットのエラーハンドリング
  let formattedTime = "--:--";
  try {
    // timestampまたはcreatedAtから有効な日時を取得
    const timestamp = message.timestamp || (message as any).createdAt;
    if (timestamp) {
      const date = new Date(timestamp);
      // 無効な日時の場合は現在時刻を使用
      if (!isNaN(date.getTime())) {
        formattedTime = format(date, "HH:mm", { locale: ja });
      } else {
        formattedTime = format(new Date(), "HH:mm", { locale: ja });
      }
    } else {
      // timestampがない場合は現在時刻を使用
      formattedTime = format(new Date(), "HH:mm", { locale: ja });
    }
  } catch (error) {
    console.error('日時フォーマットエラー:', error, 'timestamp:', message.timestamp);
    formattedTime = format(new Date(), "HH:mm", { locale: ja });
  }

  // Handle text selection within this message
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const selectedTextValue = selection.toString().trim();
      setLocalSelectedText(selectedTextValue);
      setShowCopyButton(true);
    } else {
      setLocalSelectedText("");
      setShowCopyButton(false);
    }
  };

  // テキストをメッセージ入力欄にコピーする
  const copyToInput = () => {
    if (localSelectedText) {
      setSelectedText(localSelectedText);
      toast({
        title: "テキストをコピーしました",
        description: "選択したテキストが入力欄にコピーされました。",
      });
      setShowCopyButton(false);
    }
  };

  // テキストを音声で読み上げる
  const handleTextToSpeech = async () => {
    if (isSpeaking) {
      // 読み上げ中なら停止
      stopSpeaking();
      setIsSpeaking(false);
      toast({
        title: "音声読み上げを停止しました",
        duration: 2000,
      });
    } else {
      // AIの回答のみ読み上げ可能
      if (!isUserMessage && message.content) {
        setIsSpeaking(true);
        toast({
          title: "音声読み上げを開始します",
          duration: 2000,
        });

        try {
          await speakText(message.content, {
            rate: 1.0,
            pitch: 1.0,
            lang: 'ja-JP'
          });
        } catch (error) {
          toast({
            title: "音声読み上げエラー",
            description: error instanceof Error ? error.message : "音声の読み上げに失敗しました",
            variant: "destructive",
          });
        } finally {
          setIsSpeaking(false);
        }
      }
    }
  };

  // プレビュー表示用の共通イベント発火関数
  const handleImagePreview = (mediaUrl: string) => {
    // 全スライドデータをメディア配列から作成
    const allMediaUrls = message.media?.map(m => m.url) || [];

    // イベントを発火して画像プレビューモーダルを表示
    window.dispatchEvent(new CustomEvent('preview-image', { 
      detail: { 
        url: mediaUrl,
        all_slides: allMediaUrls.length > 1 ? allMediaUrls : undefined,
        title: '応急処置ガイド',
        content: message.content
      } 
    }));
  };

  const renderMedia = () => {
    return (
      <>
        {message.media && message.media.length > 0 && (
          <div className="mt-3">
            {message.media.map((media, index) => (
              <div key={index} className="mt-2">
                {media.type === 'image' && (
                  <div className="relative">
                    <img
                      src={media.url}
                      alt="添付画像"
                      className="rounded-lg w-full max-w-xs cursor-pointer border border-blue-200 shadow-md"
                      onClick={() => handleImagePreview(media.url)}
                    />
                    <div
                      className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      onClick={() => handleImagePreview(media.url)}
                    >
                      <div className="bg-blue-600 bg-opacity-70 p-2 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
                {media.type === 'video' && (
                  <div className="relative">
                    <video
                      src={media.url}
                      controls
                      className="rounded-lg w-full max-w-xs border border-blue-200 shadow-md"
                      onClick={(e) => {
                        // Stop propagation to prevent both video control and preview
                        e.stopPropagation();
                      }}
                    />
                    <div
                      className="absolute top-2 right-2 flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
                      onClick={() => handleImagePreview(media.url)}
                    >
                      <div className="bg-blue-600 bg-opacity-70 p-2 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <div 
      className={`flex items-end mb-4 ${isUserMessage ? "" : "flex-row-reverse"} min-w-[250px] ${isDraft ? "draft-message animate-pulse" : ""}`}
      onMouseUp={handleMouseUp}
    >
      <div className={`mx-2 flex flex-col ${isUserMessage ? "items-start" : "items-end"} max-w-[70%] min-w-[230px]`}>
        <div className="flex items-center gap-2 mb-1">
          {/* AIメッセージの場合に音声読み上げボタンを表示 */}
          {!isUserMessage && (
            <button
              onClick={handleTextToSpeech}
              className={`w-8 h-8 flex items-center justify-center rounded-full shadow-sm 
                ${isSpeaking 
                  ? "bg-indigo-600 text-white animate-pulse" 
                  : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}
              title={isSpeaking ? "音声読み上げを停止" : "音声読み上げ"}
            >
              <Volume2 size={16} />
            </button>
          )}
        </div>
        <div 
          className={`px-4 py-3 mb-1 shadow-sm w-full ${
            isUserMessage 
              ? `chat-bubble-user bg-blue-50 rounded-[18px_18px_4px_18px] border ${isDraft ? "border-blue-400 border-dashed" : "border-blue-200 border-solid"}` 
              : "chat-bubble-ai bg-white rounded-[18px_18px_18px_4px] border border-blue-200 border-solid"
          }`}
        >
          <div className="relative">
            <p className={`${!isUserMessage ? "text-blue-600" : "text-black"}`}>{message.content}</p>

            {/* テキスト選択時のコピーボタン */}
            {showCopyButton && (
              <button
                onClick={copyToInput}
                className="absolute -top-2 -right-2 bg-blue-600 text-white p-1.5 rounded-full shadow-md hover:bg-blue-700 transition-colors"
                title="入力欄にコピー"
              >
                <Copy size={14} />
              </button>
            )}

            {/* ドラフトメッセージのヒントを削除し、直接入力として扱う */}
          </div>

          {/* Display media attachments if any */}
          {message.media && message.media.length > 0 && (
            <div className="mt-3">
              {message.media.map((media, index) => (
                <div key={index} className="mt-2">
                  {media.type === 'image' && (
                    <div className="relative">
                      <img 
                        src={media.url.startsWith('data:') ? media.url : `/knowledge-base/images/${media.url}`} 
                        alt="添付画像" 
                        className="rounded-lg w-full max-w-xs cursor-pointer border border-blue-200 shadow-md" 
                        onClick={() => handleImagePreview(media.url)}
                        onError={(e) => {
                          console.error('画像読み込みエラー:', media.url);
                          const img = e.target as HTMLImageElement;
                          if (!img.src.includes('/placeholder-image.png')) {
                            img.src = '/placeholder-image.png';
                          }
                        }}
                      />
                      <div 
                        className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        onClick={() => handleImagePreview(media.url)}
                      >
                        <div className="bg-blue-600 bg-opacity-70 p-2 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                  {media.type === 'video' && (
                    <div className="relative">
                      <video 
                        src={media.url} 
                        controls 
                        className="rounded-lg w-full max-w-xs border border-blue-200 shadow-md"
                        onClick={(e) => {
                          // Stop propagation to prevent both video control and preview
                          e.stopPropagation();
                        }}
                      />
                      <div 
                        className="absolute top-2 right-2 flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
                        onClick={() => handleImagePreview(media.url)}
                      >
                        <div className="bg-blue-600 bg-opacity-70 p-2 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <span className="text-xs text-blue-400">{formattedTime}</span>
      </div>
      <div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isUserMessage ? "bg-blue-500" : "bg-indigo-600"
        }`}>
          <span className={`material-icons text-white text-sm ${
            isUserMessage ? "" : ""
          }`}>
            {isUserMessage ? "person" : "smart_toy"}
          </span>
        </div>
      </div>
    </div>
  );
}