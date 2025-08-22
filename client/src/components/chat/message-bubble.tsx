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

  // 蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨Γ繝・そ繝ｼ繧ｸ縺九←縺・°繧貞愛螳・
  const isEmergencyGuideMessage = message.content && message.content.includes('蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝牙ｮ滓命險倬鹸');

  // 繝・ヰ繝・げ逕ｨ・壼ｿ懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨Γ繝・そ繝ｼ繧ｸ縺ｮ蝣ｴ蜷医・繝ｭ繧ｰ蜃ｺ蜉・
  if (isEmergencyGuideMessage) {
    console.log('鳩 蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨Γ繝・そ繝ｼ繧ｸ繧定｡ｨ遉ｺ縺励∪縺・', {
      id: message.id,
      isAiResponse: message.isAiResponse,
      contentStart: message.content.substring(0, 50) + '...',
      timestamp: message.timestamp
    });
  }

  // 譌･譎ゅヵ繧ｩ繝ｼ繝槭ャ繝医・繧ｨ繝ｩ繝ｼ繝上Φ繝峨Μ繝ｳ繧ｰ
  let formattedTime = "--:--";
  try {
    // timestamp縺ｾ縺溘・createdAt縺九ｉ譛牙柑縺ｪ譌･譎ゅｒ蜿門ｾ・
    const timestamp = message.timestamp || (message as any).createdAt;
    if (timestamp) {
      const date = new Date(timestamp);
      // 辟｡蜉ｹ縺ｪ譌･譎ゅ・蝣ｴ蜷医・迴ｾ蝨ｨ譎ょ綾繧剃ｽｿ逕ｨ
      if (!isNaN(date.getTime())) {
        formattedTime = format(date, "HH:mm", { locale: ja });
      } else {
        formattedTime = format(new Date(), "HH:mm", { locale: ja });
      }
    } else {
      // timestamp縺後↑縺・ｴ蜷医・迴ｾ蝨ｨ譎ょ綾繧剃ｽｿ逕ｨ
      formattedTime = format(new Date(), "HH:mm", { locale: ja });
    }
  } catch (error) {
    console.error('譌･譎ゅヵ繧ｩ繝ｼ繝槭ャ繝医お繝ｩ繝ｼ:', error, 'timestamp:', message.timestamp);
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

  // 繝・く繧ｹ繝医ｒ繝｡繝・そ繝ｼ繧ｸ蜈･蜉帶ｬ・↓繧ｳ繝斐・縺吶ｋ
  const copyToInput = () => {
    if (localSelectedText) {
      setSelectedText(localSelectedText);
      toast({
        title: "繝・く繧ｹ繝医ｒ繧ｳ繝斐・縺励∪縺励◆",
        description: "驕ｸ謚槭＠縺溘ユ繧ｭ繧ｹ繝医′蜈･蜉帶ｬ・↓繧ｳ繝斐・縺輔ｌ縺ｾ縺励◆縲・,
      });
      setShowCopyButton(false);
    }
  };

  // 繝・く繧ｹ繝医ｒ髻ｳ螢ｰ縺ｧ隱ｭ縺ｿ荳翫￡繧・
  const handleTextToSpeech = async () => {
    if (isSpeaking) {
      // 隱ｭ縺ｿ荳翫￡荳ｭ縺ｪ繧牙●豁｢
      stopSpeaking();
      setIsSpeaking(false);
      toast({
        title: "髻ｳ螢ｰ隱ｭ縺ｿ荳翫￡繧貞●豁｢縺励∪縺励◆",
        duration: 2000,
      });
    } else {
      // AI縺ｮ蝗樒ｭ斐・縺ｿ隱ｭ縺ｿ荳翫￡蜿ｯ閭ｽ・・ull/undefined繝√ぉ繝・け蠑ｷ蛹厄ｼ・
      const messageContent = message.content || (message as any).text || '';
      if (!isUserMessage && messageContent && typeof messageContent === 'string' && messageContent.trim()) {
        setIsSpeaking(true);
        toast({
          title: "髻ｳ螢ｰ隱ｭ縺ｿ荳翫￡繧帝幕蟋九＠縺ｾ縺・,
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
            title: "髻ｳ螢ｰ隱ｭ縺ｿ荳翫￡繧ｨ繝ｩ繝ｼ",
            description: error instanceof Error ? error.message : "髻ｳ螢ｰ縺ｮ隱ｭ縺ｿ荳翫￡縺ｫ螟ｱ謨励＠縺ｾ縺励◆",
            variant: "destructive",
          });
        } finally {
          setIsSpeaking(false);
        }
      }
    }
  };

  // 繝励Ξ繝薙Η繝ｼ陦ｨ遉ｺ逕ｨ縺ｮ蜈ｱ騾壹う繝吶Φ繝育匱轣ｫ髢｢謨ｰ
  const handleImagePreview = (mediaUrl: string) => {
    // 蜈ｨ繧ｹ繝ｩ繧､繝峨ョ繝ｼ繧ｿ繧偵Γ繝・ぅ繧｢驟榊・縺九ｉ菴懈・
    const allMediaUrls = message.media?.map(m => m.url) || [];

    // 繧､繝吶Φ繝医ｒ逋ｺ轣ｫ縺励※逕ｻ蜒上・繝ｬ繝薙Η繝ｼ繝｢繝ｼ繝繝ｫ繧定｡ｨ遉ｺ
    window.dispatchEvent(new CustomEvent('preview-image', { 
      detail: { 
        url: mediaUrl,
        all_slides: allMediaUrls.length > 1 ? allMediaUrls : undefined,
        title: '蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝・,
        content: message.content
      } 
    }));
  };

  const renderMedia = () => {
    // 繝・ヰ繝・げ繝ｭ繧ｰ・壹Γ繝・ぅ繧｢諠・ｱ繧貞・蜉・
    if (message.media && message.media.length > 0) {
      console.log('繝｡繝・ぅ繧｢陦ｨ遉ｺ:', {
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
            {/* 蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨Γ繝・そ繝ｼ繧ｸ縺ｮ蝣ｴ蜷医・迚ｹ蛻･縺ｪ陦ｨ遉ｺ */}
            {isEmergencyGuideMessage && message.media.length > 0 && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm text-blue-700 font-medium mb-2">
                  搭 蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝臥判蜒・({message.media.length}莉ｶ)
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {message.media.map((media, index) => (
                    <div key={`${message.id}-guide-media-${index}`} className="relative">
                      {media.type === 'image' && (
                        <div className="group cursor-pointer">
                          <img
                            src={media.url}
                            alt={(media as any).title || `繧ｬ繧､繝臥判蜒・{index + 1}`}
                            className="w-full h-20 object-cover rounded border border-blue-300 shadow-sm group-hover:shadow-md transition-shadow"
                            onClick={() => handleImagePreview(media.url)}
                            onLoad={(e) => {
                              console.log('蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝臥判蜒剰ｪｭ縺ｿ霎ｼ縺ｿ謌仙粥:', {
                                messageId: message.id,
                                mediaIndex: index,
                                title: (media as any).title,
                                fileName: (media as any).fileName
                              });
                            }}
                            onError={(e) => {
                              console.error('蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝臥判蜒剰ｪｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:', {
                                messageId: message.id,
                                mediaIndex: index,
                                url: media.url.substring(0, 100) + '...',
                                title: (media as any).title
                              });

                              const img = e.target as HTMLImageElement;
                              img.onerror = null; // Prevent infinite loop
                              img.style.display = 'none';
                              
                              // 繧ｨ繝ｩ繝ｼ陦ｨ遉ｺ逕ｨ縺ｮ隕∫ｴ繧剃ｽ懈・
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'w-full h-20 bg-gray-100 border border-gray-300 rounded flex items-center justify-center';
                              errorDiv.innerHTML = `
                                <div class="text-center text-gray-500 text-xs">
                                  <div class="mb-1">笞・・/div>
                                  <div>${(media as any).fileName || '逕ｻ蜒・}</div>
                                </div>
                              `;
                              img.parentNode?.insertBefore(errorDiv, img);
                            }}
                          />
                          {/* 繝帙ヰ繝ｼ譎ゅ・繝励Ξ繝薙Η繝ｼ繧｢繧､繧ｳ繝ｳ */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-20 rounded">
                            <div className="bg-white bg-opacity-80 p-1 rounded">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                          </div>
                          {/* 繝輔ぃ繧､繝ｫ蜷崎｡ｨ遉ｺ */}
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

            {/* 騾壼ｸｸ縺ｮ繝｡繝・ぅ繧｢陦ｨ遉ｺ */}
            {(!isEmergencyGuideMessage || message.media.length === 0) && message.media && message.media.length > 0 && (
              <>
                {message.media.map((media, index) => (
                  <div key={`${message.id}-media-${index}`} className="mt-2">
                    {media.type === 'image' && (
                      <div className="relative">
                        <img
                          src={media.url}
                          alt="豺ｻ莉倡判蜒・
                          className="rounded-lg w-full max-w-xs cursor-pointer border border-blue-200 shadow-md"
                          style={{ maxHeight: '300px', objectFit: 'contain' }}
                          onClick={() => handleImagePreview(media.url)}
                          onLoad={(e) => {
                            console.log('逕ｻ蜒剰ｪｭ縺ｿ霎ｼ縺ｿ謌仙粥:', {
                              messageId: message.id,
                              mediaIndex: index,
                              width: (e.target as HTMLImageElement).naturalWidth,
                              height: (e.target as HTMLImageElement).naturalHeight,
                              urlType: media.url.startsWith('data:') ? 'base64' : 'url'
                            });
                          }}
                          onError={(e) => {
                            console.warn('逕ｻ蜒剰ｪｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:', {
                              messageId: message.id,
                              mediaIndex: index,
                              url: media.url.substring(0, 100) + '...',
                              isBase64: media.url.startsWith('data:'),
                              error: e
                            });

                            const img = e.target as HTMLImageElement;
                            img.onerror = null; // Prevent infinite loop

                            // 繧ｨ繝ｩ繝ｼ譎ゅ・蜃ｦ逅・ｒ謾ｹ蝟・
                            if (media.url.startsWith('data:image/')) {
                              // Base64逕ｻ蜒上・蝣ｴ蜷医・繧ｨ繝ｩ繝ｼ陦ｨ遉ｺ
                              img.style.display = 'none';
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'flex items-center justify-center bg-gray-100 border border-gray-300 rounded-lg p-4 max-w-xs';
                              errorDiv.innerHTML = '<span class="text-gray-500 text-sm">逕ｻ蜒上・陦ｨ遉ｺ縺ｫ螟ｱ謨励＠縺ｾ縺励◆</span>';
                              img.parentNode?.insertBefore(errorDiv, img);
                            } else if (media.url.includes('/api/')) {
                              // API邨檎罰縺ｮ逕ｻ蜒上・蝣ｴ蜷医・繝励Ξ繝ｼ繧ｹ繝帙Ν繝繝ｼ繧定｡ｨ遉ｺ
                              img.style.display = 'none';
                              const placeholderDiv = document.createElement('div');
                              placeholderDiv.className = 'flex items-center justify-center bg-gray-100 border border-gray-300 rounded-lg p-4 max-w-xs';
                              placeholderDiv.innerHTML = '<span class="text-gray-500 text-sm">逕ｻ蜒上′隕九▽縺九ｊ縺ｾ縺帙ｓ</span>';
                              img.parentNode?.insertBefore(placeholderDiv, img);
                            } else if (!img.src.includes('/placeholder-image.png')) {
                              // 縺昴・莉悶・蝣ｴ蜷医・繝励Ξ繝ｼ繧ｹ繝帙Ν繝繝ｼ逕ｻ蜒上ｒ隧ｦ陦・
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
                            console.log('蜍慕判繝｡繧ｿ繝・・繧ｿ隱ｭ縺ｿ霎ｼ縺ｿ謌仙粥:', {
                              messageId: message.id,
                              mediaIndex: index,
                              duration: (e.target as HTMLVideoElement).duration,
                              urlType: media.url.startsWith('blob:') ? 'blob' : 'url'
                            });
                          }}
                          onError={(e) => {
                            console.error('蜍慕判隱ｭ縺ｿ霎ｼ縺ｿ繧ｨ繝ｩ繝ｼ:', {
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
          {/* AI繝｡繝・そ繝ｼ繧ｸ縺ｮ蝣ｴ蜷医↓髻ｳ螢ｰ隱ｭ縺ｿ荳翫￡繝懊ち繝ｳ繧定｡ｨ遉ｺ */}
          {!isUserMessage && (
            <button
              onClick={handleTextToSpeech}
              className={`w-8 h-8 flex items-center justify-center rounded-full shadow-sm 
                ${isSpeaking 
                  ? "bg-indigo-600 text-white animate-pulse" 
                  : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}
              title={isSpeaking ? "髻ｳ螢ｰ隱ｭ縺ｿ荳翫￡繧貞●豁｢" : "髻ｳ螢ｰ隱ｭ縺ｿ荳翫￡"}
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
            {/* 繧ｷ繝ｳ繝励Ν縺ｪ繧ｳ繝ｳ繝・Φ繝・｡ｨ遉ｺ */}
            {(() => {
              const content = message.content || '';
              
              // 逕ｻ蜒上ョ繝ｼ繧ｿ縺ｮ蛻､螳・
              const isImage = content.startsWith('data:image/') || 
                             content.includes('.jpg') || 
                             content.includes('.png') || 
                             content.includes('/knowledge-base/images/');

              if (isImage) {
                return (
                  <img
                    src={content}
                    alt="逕ｻ蜒・
                    className="rounded-lg max-w-xs cursor-pointer"
                    style={{ maxHeight: '300px', objectFit: 'contain' }}
                    onClick={() => handleImagePreview(content)}
                  />
                );
              }

              // 繝・く繧ｹ繝医・蝣ｴ蜷・
              return (
                <p className={isUserMessage ? "text-white" : "text-gray-900"}>
                  {content}
                </p>
              );
            })()}

            {/* 繝・く繧ｹ繝磯∈謚樊凾縺ｮ繧ｳ繝斐・繝懊ち繝ｳ */}
            {showCopyButton && (
              <button
                onClick={copyToInput}
                className="absolute -top-2 -right-2 bg-blue-600 text-white p-1.5 rounded-full shadow-md hover:bg-blue-700 transition-colors"
                title="蜈･蜉帶ｬ・↓繧ｳ繝斐・"
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
            {isUserMessage ? "側" : "､・}
          </span>
        </div>
      </div>
    </div>
  );
}
