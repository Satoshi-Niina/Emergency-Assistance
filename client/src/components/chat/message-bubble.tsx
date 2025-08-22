import { useState } from "react";
import { useAuth } from "../../context/auth-context";
import { useChat } from "../../context/chat-context";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Copy, Volume2 } from "lucide-react";
import { useToast } from "../../hooks/use-toast.ts";
import { speakText, stopSpeaking } from "../../lib/text-to-speech.ts";

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

  // 応急処置ガイドメチE��ージかどぁE��を判宁E
  const isEmergencyGuideMessage = message.content && message.content.includes('応急処置ガイド実施記録');

  // チE��チE��用�E�応急処置ガイドメチE��ージの場合�Eログ出劁E
  if (isEmergencyGuideMessage) {
    console.log('🔵 応急処置ガイドメチE��ージを表示しまぁE', {
      id: message.id,
      isAiResponse: message.isAiResponse,
      contentStart: message.content.substring(0, 50) + '...',
      timestamp: message.timestamp
    });
  }

  // 日時フォーマット�Eエラーハンドリング
  let formattedTime = "--:--";
  try {
    // timestampまた�EcreatedAtから有効な日時を取征E
    const timestamp = message.timestamp || (message as any).createdAt;
    if (timestamp) {
      const date = new Date(timestamp);
      // 無効な日時�E場合�E現在時刻を使用
      if (!isNaN(date.getTime())) {
        formattedTime = format(date, "HH:mm", { locale: ja });
      } else {
        formattedTime = format(new Date(), "HH:mm", { locale: ja });
      }
    } else {
      // timestampがなぁE��合�E現在時刻を使用
      formattedTime = format(new Date(), "HH:mm", { locale: ja });
    }
  } catch (error) {
    console.error('日時フォーマットエラー:', error, 'timestamp:', message.timestamp);
    formattedTime = format(new Date(), "HH:mm", { locale: ja });
  }

  // Handle text selection within this message
  const handleMouseUp = () => {
    const selection = window.getSelection();
    const selectionText = selection?.toString();
    if (selection && selectionText && selectionText.trim().length > 0) {
      const selectedTextValue = selectionText.trim();
      setLocalSelectedText(selectedTextValue);
      setShowCopyButton(true);
    } else {
      setLocalSelectedText("");
      setShowCopyButton(false);
    }
  };

  // チE��ストをメチE��ージ入力欁E��コピ�Eする
  const copyToInput = () => {
    if (localSelectedText) {
      setSelectedText(localSelectedText);
      toast({
        title: "チE��ストをコピ�Eしました",
        description: "選択したテキストが入力欁E��コピ�Eされました、E,
      });
      setShowCopyButton(false);
    }
  };

  // チE��ストを音声で読み上げめE
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
      // AIの回答�Eみ読み上げ可能�E�Eull/undefinedチェチE��強化！E
      const messageContent = message.content || (message as any).text || '';
      if (!isUserMessage && messageContent && typeof messageContent === 'string' && messageContent.trim()) {
        setIsSpeaking(true);
        toast({
          title: "音声読み上げを開始しまぁE,
          duration: 2000,
        });

        try {
          await speakText(messageContent, {
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
    // 全スライドデータをメチE��ア配�Eから作�E
    const allMediaUrls = message.media?.map(m => m.url) || [];

    // イベントを発火して画像�Eレビューモーダルを表示
    window.dispatchEvent(new CustomEvent('preview-image', { 
      detail: { 
        url: mediaUrl,
        all_slides: allMediaUrls.length > 1 ? allMediaUrls : undefined,
        title: '応急処置ガイチE,
        content: message.content
      } 
    }));
  };

  const renderMedia = () => {
    // チE��チE��ログ�E�メチE��ア惁E��を�E劁E
    if (message.media && message.media.length > 0) {
      console.log('メチE��ア表示:', {
        messageId: message.id,
        mediaCount: message.media.length,
        mediaDetails: message.media.map((m, i) => ({
          index: i,
          type: m.type,
          urlPrefix: m.url.substring(0, 50) + '...',
          urlLength: m.url.length,
          isBase64: m.url.startsWith('data:'),
          title: m.title,
          fileName: (m as any).fileName
        }))
      });
    }

    return (
      <>
        {message.media && message.media.length > 0 && (
          <div className="mt-3">
            {/* 応急処置ガイドメチE��ージの場合�E特別な表示 */}
            {isEmergencyGuideMessage && message.media.length > 0 && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-700 font-medium mb-2">
                  📋 応急処置ガイド画僁E({message.media.length}件)
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {message.media.map((media, index) => (
                    <div key={`${message.id}-guide-media-${index}`} className="relative">
                      {media.type === 'image' && (
                        <div className="group cursor-pointer">
                          <img
                            src={media.url}
                            alt={(media as any).title || `ガイド画僁E{index + 1}`}
                            className="w-full h-20 object-cover rounded border border-blue-300 shadow-sm group-hover:shadow-md transition-shadow"
                            onClick={() => handleImagePreview(media.url)}
                            onLoad={(e) => {
                              console.log('応急処置ガイド画像読み込み成功:', {
                                messageId: message.id,
                                mediaIndex: index,
                                title: (media as any).title,
                                fileName: (media as any).fileName
                              });
                            }}
                            onError={(e) => {
                              console.error('応急処置ガイド画像読み込みエラー:', {
                                messageId: message.id,
                                mediaIndex: index,
                                url: media.url.substring(0, 100) + '...',
                                title: (media as any).title
                              });

                              const img = e.target as HTMLImageElement;
                              img.onerror = null; // Prevent infinite loop
                              img.style.display = 'none';
                              
                              // エラー表示用の要素を作�E
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'w-full h-20 bg-gray-100 border border-gray-300 rounded flex items-center justify-center';
                              errorDiv.innerHTML = `
                                <div class="text-center text-gray-500 text-xs">
                                  <div class="mb-1">⚠�E�E/div>
                                  <div>${(media as any).fileName || '画僁E}</div>
                                </div>
                              `;
                              img.parentNode?.insertBefore(errorDiv, img);
                            }}
                          />
                          {/* ホバー時�Eプレビューアイコン */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-20 rounded">
                            <div className="bg-white bg-opacity-80 p-1 rounded">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                          </div>
                          {/* ファイル名表示 */}
                          {(media as any).fileName && (
                            <div className="text-xs text-gray-600 mt-1 truncate">
                              {(media as any).fileName}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 通常のメチE��ア表示 */}
            {(!isEmergencyGuideMessage || message.media.length === 0) && message.media && message.media.length > 0 && (
              <>
                {message.media.map((media, index) => (
                  <div key={`${message.id}-media-${index}`} className="mt-2">
                    {media.type === 'image' && (
                      <div className="relative">
                        <img
                          src={media.url}
                          alt="添付画僁E
                          className="rounded-lg w-full max-w-xs cursor-pointer border border-blue-200 shadow-md"
                          style={{ maxHeight: '300px', objectFit: 'contain' }}
                          onClick={() => handleImagePreview(media.url)}
                          onLoad={(e) => {
                            console.log('画像読み込み成功:', {
                              messageId: message.id,
                              mediaIndex: index,
                              width: (e.target as HTMLImageElement).naturalWidth,
                              height: (e.target as HTMLImageElement).naturalHeight,
                              urlType: media.url.startsWith('data:') ? 'base64' : 'url'
                            });
                          }}
                          onError={(e) => {
                            console.warn('画像読み込みエラー:', {
                              messageId: message.id,
                              mediaIndex: index,
                              url: media.url.substring(0, 100) + '...',
                              isBase64: media.url.startsWith('data:'),
                              error: e
                            });

                            const img = e.target as HTMLImageElement;
                            img.onerror = null; // Prevent infinite loop

                            // エラー時�E処琁E��改喁E
                            if (media.url.startsWith('data:image/')) {
                              // Base64画像�E場合�Eエラー表示
                              img.style.display = 'none';
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'flex items-center justify-center bg-gray-100 border border-gray-300 rounded-lg p-4 max-w-xs';
                              errorDiv.innerHTML = '<span class="text-gray-500 text-sm">画像�E表示に失敗しました</span>';
                              img.parentNode?.insertBefore(errorDiv, img);
                            } else if (media.url.includes('/api/')) {
                              // API経由の画像�E場合�Eプレースホルダーを表示
                              img.style.display = 'none';
                              const placeholderDiv = document.createElement('div');
                              placeholderDiv.className = 'flex items-center justify-center bg-gray-100 border border-gray-300 rounded-lg p-4 max-w-xs';
                              placeholderDiv.innerHTML = '<span class="text-gray-500 text-sm">画像が見つかりません</span>';
                              img.parentNode?.insertBefore(placeholderDiv, img);
                            } else if (!img.src.includes('/placeholder-image.png')) {
                              // そ�E他�E場合�Eプレースホルダー画像を試衁E
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
                          style={{ maxHeight: '300px' }}
                          onClick={(e) => {
                            // Stop propagation to prevent both video control and preview
                            e.stopPropagation();
                          }}
                          onLoadedMetadata={(e) => {
                            console.log('動画メタチE�Eタ読み込み成功:', {
                              messageId: message.id,
                              mediaIndex: index,
                              duration: (e.target as HTMLVideoElement).duration,
                              urlType: media.url.startsWith('blob:') ? 'blob' : 'url'
                            });
                          }}
                          onError={(e) => {
                            console.error('動画読み込みエラー:', {
                              messageId: message.id,
                              mediaIndex: index,
                              url: media.url.substring(0, 100) + '...',
                              isBlob: media.url.startsWith('blob:')
                            });
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
              </>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <div 
      className={`flex items-end mb-4 ${isUserMessage ? "justify-start" : "justify-end"} min-w-[250px] ${isDraft ? "draft-message animate-pulse" : ""}`}
      onMouseUp={handleMouseUp}
    >
      <div className={`mx-2 flex flex-col ${isUserMessage ? "items-start" : "items-end"} max-w-[70%] min-w-[230px]`}>
        <div className="flex items-center gap-2 mb-1">
          {/* AIメチE��ージの場合に音声読み上げボタンを表示 */}
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
              ? `chat-bubble-user bg-blue-500 text-white rounded-[18px_18px_18px_4px] border border-blue-500` 
              : "chat-bubble-ai bg-white rounded-[18px_18px_4px_18px] border border-gray-200"
          }`}
        >
          <div className="relative">
            {/* シンプルなコンチE��チE��示 */}
            {(() => {
              const content = message.content || '';
              
              // 画像データの判宁E
              const isImage = content.startsWith('data:image/') || 
                             content.includes('.jpg') || 
                             content.includes('.png') || 
                             content.includes('/knowledge-base/images/');

              if (isImage) {
                return (
                  <img
                    src={content}
                    alt="画僁E
                    className="rounded-lg max-w-xs cursor-pointer"
                    style={{ maxHeight: '300px', objectFit: 'contain' }}
                    onClick={() => handleImagePreview(content)}
                  />
                );
              }

              // チE��スト�E場吁E
              return (
                <p className={isUserMessage ? "text-white" : "text-gray-900"}>
                  {content}
                </p>
              );
            })()}

            {/* チE��スト選択時のコピ�Eボタン */}
            {showCopyButton && (
              <button
                onClick={copyToInput}
                className="absolute -top-2 -right-2 bg-blue-600 text-white p-1.5 rounded-full shadow-md hover:bg-blue-700 transition-colors"
                title="入力欁E��コピ�E"
              >
                <Copy size={14} />
              </button>
            )}
          </div>

          {/* Display media attachments if any */}
          {renderMedia()}
        </div>
        <span className={`text-xs ${isUserMessage ? "text-blue-400" : "text-gray-400"}`}>{formattedTime}</span>
      </div>
      <div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          isUserMessage ? "bg-blue-500" : "bg-gray-500"
        }`}>
          <span className="text-white text-sm">
            {isUserMessage ? "👤" : "🤁E}
          </span>
        </div>
      </div>
    </div>
  );
}
