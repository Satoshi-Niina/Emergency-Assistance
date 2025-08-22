import { useState, useRef, useEffect } from "react";
import { useChat } from "../../context/chat-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Camera, X } from "lucide-react";
import { useIsMobile } from "../../hooks/use-mobile";

interface MessageInputProps {
  onSendMessage: (content: string, media?: any[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function MessageInput({ onSendMessage, isLoading = false, disabled = false }: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [media, setMedia] = useState<any[]>([]);
  const { 
    recordedText, 
    selectedText, 
    draftMessage,
    setDraftMessage
  } = useChat();

  // 繝峨Λ繝輔ヨ繝｡繝・そ繝ｼ繧ｸ繧呈峩譁ｰ縺吶ｋ・医Θ繝ｼ繧ｶ繝ｼ蜈･蜉帷畑・・
  const updateDraftMessage = (content: string) => {
    // 謇句虚蜈･蜉帙・蝣ｴ蜷医・縺ｿ繧ｳ繝ｳ繝・く繧ｹ繝育峩謗･譖ｴ譁ｰ・磯浹螢ｰ隱崎ｭ倥→縺ｮ驥崎､・亟豁｢・・
    if (setDraftMessage) {
      console.log('謇句虚蜈･蜉帙°繧峨ラ繝ｩ繝輔ヨ繝｡繝・そ繝ｼ繧ｸ繧呈峩譁ｰ:', content);
      setDraftMessage({
        content,
        media: draftMessage?.media || []
      });
    }
  };
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 驕ｸ謚槭＆繧後◆繝・く繧ｹ繝医′螟画峩縺輔ｌ縺溘ｉ蜈･蜉帶ｬ・↓蜿肴丐
  useEffect(() => {
    if (selectedText) {
      setMessage(selectedText);
      if (isMobile && textareaRef.current) {
        textareaRef.current.focus();
      } else if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [selectedText, isMobile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && media.length === 0) return;
    if (isLoading || disabled) return;

    const currentMessage = message;
    const currentMedia = [...media];
    
    setMessage('');
    setMedia([]);
    
    await onSendMessage(currentMessage, currentMedia);
  };

  const handleCameraClick = () => {
    // 繧ｫ繝｡繝ｩ繝｢繝ｼ繝繝ｫ繧帝幕縺・
    window.dispatchEvent(new CustomEvent('open-camera'));
  };

  // 繝・く繧ｹ繝亥・蜉帶ｬ・ｒ繧ｯ繝ｪ繧｢縺吶ｋ
  const handleClearText = () => {
    setMessage("");
    if (isMobile && textareaRef.current) {
      textareaRef.current.focus();
    } else if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-t border-blue-200 p-2 message-input-container">
      <form onSubmit={handleSubmit} className="flex items-center">

        {/* 蜈･蜉帙お繝ｪ繧｢ - 蟆上＆繧∝崋螳夐ｫ倥＆縺ｧ繧ｪ繝ｼ繝舌・繝輔Ο繝ｼ譎ゅ・繧ｹ繧ｯ繝ｭ繝ｼ繝ｫ */}
        <div className="flex-1 flex items-center bg-white border border-blue-200 rounded-full px-3 py-1 shadow-inner">
          {isMobile ? (
            /* 繝｢繝舌う繝ｫ逕ｨ繝・く繧ｹ繝医お繝ｪ繧｢・・.5蛟阪・鬮倥＆縺ｨ譁・ｭ励し繧､繧ｺ・・*/
            <div className="flex-1 relative h-[48px]"> {/* 鬮倥＆繧・.5蛟阪↓ */}
              <Textarea
                ref={textareaRef}
                className="absolute inset-0 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none py-1 overflow-y-auto text-lg"
                placeholder={"繝｡繝・そ繝ｼ繧ｸ繧貞・蜉・.."}
                value={message}
                onChange={handleInputChange}
                disabled={isLoading}
                rows={1}
                style={{ lineHeight: '1.2' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              {/* 繝・く繧ｹ繝医′縺ゅｋ蝣ｴ蜷医↓縺ｮ縺ｿ繧ｯ繝ｪ繧｢繝懊ち繝ｳ繧定｡ｨ遉ｺ */}
              {message.trim() && (
                <button
                  type="button"
                  onClick={handleClearText}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ) : (
            /* 繝・せ繧ｯ繝医ャ繝礼畑繧､繝ｳ繝励ャ繝茨ｼ・.5蛟阪・鬮倥＆縺ｨ譁・ｭ励し繧､繧ｺ・・*/
            <div className="flex-1 h-[48px] flex items-center relative"> {/* 鬮倥＆繧・.5蛟阪↓ */}
              <Input
                ref={inputRef}
                type="text"
                className="w-full h-full bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-lg"
                placeholder={"繝｡繝・そ繝ｼ繧ｸ繧貞・蜉・.."}
                value={message}
                onChange={handleInputChange}
                disabled={isLoading}
              />
              {/* 繝・く繧ｹ繝医′縺ゅｋ蝣ｴ蜷医↓縺ｮ縺ｿ繧ｯ繝ｪ繧｢繝懊ち繝ｳ繧定｡ｨ遉ｺ */}
              {message.trim() && (
                <button
                  type="button"
                  onClick={handleClearText}
                  className="absolute right-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
          <Button 
            type="submit" 
            disabled={isLoading || !message.trim()}
            size="icon"
            variant="ghost"
            className="ml-1 p-1 min-w-[28px] min-h-[28px] h-7 w-7 bg-gradient-to-r from-sky-100 to-blue-100 hover:from-sky-200 hover:to-blue-200 rounded-full border border-blue-300"
          >
            <Send className="h-4 w-4 text-blue-600" />
          </Button>
        </div>

        {/* 繝｢繝舌う繝ｫ蜷代￠繧ｫ繝｡繝ｩ繝懊ち繝ｳ - 蜿ｳ驟咲ｽｮ - 繧ｳ繝ｳ繝代け繝亥喧 */}
        <div className="md:hidden flex flex-col items-center ml-2">
          <span className="text-xs font-medium text-indigo-700 mb-0.5">繧ｫ繝｡繝ｩ</span>
          <Button 
            type="button" 
            onClick={handleCameraClick}
            size="icon"
            variant="ghost"
            className="p-2 h-10 w-10 rounded-full bg-gradient-to-r from-indigo-100 to-cyan-100 hover:from-indigo-200 hover:to-cyan-200 border border-indigo-300"
          >
            <Camera className="h-5 w-5 text-indigo-600" />
          </Button>
        </div>

        {/* 繝・せ繧ｯ繝医ャ繝怜髄縺代・繧ｫ繝｡繝ｩ繝懊ち繝ｳ - 蜿ｳ驟咲ｽｮ - 繧ｳ繝ｳ繝代け繝亥喧 */}
        <div className="hidden md:flex md:flex-col md:items-center md:ml-2">
          <span className="text-xs font-medium text-indigo-700 mb-0.5">繧ｫ繝｡繝ｩ</span>
          <Button 
            type="button" 
            onClick={handleCameraClick}
            size="icon"
            variant="ghost"
            className="p-2 h-10 w-10 rounded-full bg-gradient-to-r from-indigo-100 to-cyan-100 hover:from-indigo-200 hover:to-cyan-200 border border-indigo-300"
          >
            <Camera className="h-5 w-5 text-indigo-600" />
          </Button>
        </div>
      </form>
    </div>
  );
}
