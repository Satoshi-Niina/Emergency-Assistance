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

  // ドラフトメチE��ージを更新する�E�ユーザー入力用�E�E
  const updateDraftMessage = (content: string) => {
    // 手動入力�E場合�EみコンチE��スト直接更新�E�音声認識との重褁E��止�E�E
    if (setDraftMessage) {
      console.log('手動入力からドラフトメチE��ージを更新:', content);
      setDraftMessage({
        content,
        media: draftMessage?.media || []
      });
    }
  };
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 選択されたチE��ストが変更されたら入力欁E��反映
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
    // カメラモーダルを開ぁE
    window.dispatchEvent(new CustomEvent('open-camera'));
  };

  // チE��スト�E力欁E��クリアする
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

        {/* 入力エリア - 小さめ固定高さでオーバ�Eフロー時�Eスクロール */}
        <div className="flex-1 flex items-center bg-white border border-blue-200 rounded-full px-3 py-1 shadow-inner">
          {isMobile ? (
            /* モバイル用チE��ストエリア�E�E.5倍�E高さと斁E��サイズ�E�E*/
            <div className="flex-1 relative h-[48px]"> {/* 高さめE.5倍に */}
              <Textarea
                ref={textareaRef}
                className="absolute inset-0 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none py-1 overflow-y-auto text-lg"
                placeholder={"メチE��ージを�E劁E.."}
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
              {/* チE��ストがある場合にのみクリアボタンを表示 */}
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
            /* チE��クトップ用インプット！E.5倍�E高さと斁E��サイズ�E�E*/
            <div className="flex-1 h-[48px] flex items-center relative"> {/* 高さめE.5倍に */}
              <Input
                ref={inputRef}
                type="text"
                className="w-full h-full bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-lg"
                placeholder={"メチE��ージを�E劁E.."}
                value={message}
                onChange={handleInputChange}
                disabled={isLoading}
              />
              {/* チE��ストがある場合にのみクリアボタンを表示 */}
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

        {/* モバイル向けカメラボタン - 右配置 - コンパクト化 */}
        <div className="md:hidden flex flex-col items-center ml-2">
          <span className="text-xs font-medium text-indigo-700 mb-0.5">カメラ</span>
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

        {/* チE��クトップ向け�Eカメラボタン - 右配置 - コンパクト化 */}
        <div className="hidden md:flex md:flex-col md:items-center md:ml-2">
          <span className="text-xs font-medium text-indigo-700 mb-0.5">カメラ</span>
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
