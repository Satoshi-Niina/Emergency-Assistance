import { useState, useRef, useEffect } from "react";
import { useChat } from "../../context/chat-context";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Send, Camera, Mic, X } from "lucide-react";
import { useIsMobile } from "../../hooks/use-mobile";

export default function MessageInput() {
  const [message, setMessage] = useState("");
  const { 
    sendMessage, 
    isLoading, 
    recordedText, 
    selectedText, 
    searchBySelectedText,
    startRecording,
    stopRecording,
    isRecording,
    draftMessage,
    setDraftMessage
  } = useChat();

  // ドラフトメッセージを更新する（ユーザー入力用）
  const updateDraftMessage = (content: string) => {
    // 手動入力の場合のみコンテキスト直接更新（音声認識との重複防止）
    if (setDraftMessage && !isRecording) {
      console.log('手動入力からドラフトメッセージを更新:', content);
      setDraftMessage({
        content,
        media: draftMessage?.media || []
      });
    } else if (isRecording) {
      console.log('録音中のため手動ドラフト更新をスキップ:', content);
    }
  };
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 選択されたテキストが変更されたら入力欄に反映
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

  // 録音テキストをリアルタイムでチャットエリア（左側）のみに反映する
  useEffect(() => {
    if (isRecording && recordedText) {
      // 入力欄には反映せず、チャット側（左側）にのみドラフトメッセージとして表示
      if (recordedText.trim()) {
        // 新しい関数を使用してドラフトメッセージを更新（イベント発火とコンテキスト更新を両方行う）
        console.log('関数から直接ドラフトメッセージを設定:', recordedText);
        updateDraftMessage(recordedText);

        // デバッグログ
        if (isRecording) {
          console.log('録音中のテキストをチャット側のみに表示:', recordedText);
        }
      }
    }
  }, [recordedText, isRecording, draftMessage, setDraftMessage, updateDraftMessage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 録音テキストか入力テキストのいずれかを使用
    // 入力欄にテキストがある場合は優先的に使用し、なければ録音テキストを使用
    const textToSend = message.trim() || recordedText.trim();
    if (!textToSend || isLoading) return;

    console.log('送信するテキスト:', textToSend);

    // メッセージを送信
    await sendMessage(textToSend);

    // 自動画像検索は完全無効化（安定性のため）
    console.log('💬 チャット入力から送信:', textToSend, '（画像検索完全無効）');
    
    // 検索関連の処理をすべてキャンセル・無効化
    try {
      if (typeof window !== 'undefined') {
        // 検索処理の強制停止
        window.dispatchEvent(new CustomEvent('cancel-image-search'));
        window.dispatchEvent(new CustomEvent('clear-search-results'));
        window.dispatchEvent(new CustomEvent('disable-auto-search'));
        
        // Fuse検索のデバウンス処理もクリア
        clearTimeout((window as any)._fuseSearchTimeout);
        (window as any)._fuseSearchDisabled = true;
      }
    } catch (error) {
      console.warn('検索キャンセル処理でエラー:', error);
    }

    // 入力欄をクリア
    setMessage("");

    // フォーカス処理
    if (isMobile && textareaRef.current) {
      textareaRef.current.focus();
      // モバイルでキーボードが消えないように少し遅延
      setTimeout(() => {
        textareaRef.current?.blur();
      }, 100);
    } else if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleCameraClick = () => {
    // カメラモーダルを開く
    window.dispatchEvent(new CustomEvent('open-camera'));
  };

  const handleMicClick = async () => {
    try {
      // マイク権限の確認
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // 確認後すぐに停止

      // マイク録音機能の切り替え
      if (!isRecording) {
        console.log('録音開始');
        startRecording();
      } else {
        console.log('録音停止');
        stopRecording();

        if (recordedText.trim()) {
          console.log('録音停止：ドラフトメッセージを設定:', recordedText.trim());
          updateDraftMessage(recordedText.trim());
        }
      }
    } catch (error) {
      console.error('マイクアクセスエラー:', error);
      // エラーメッセージをユーザーに表示
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        alert('マイクの使用が許可されていません。ブラウザの設定でマイクの使用を許可してください。');
      } else {
        alert('マイクの初期化中にエラーが発生しました。');
      }
    }
  };

  // テキスト入力欄をクリアする
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
        {/* モバイル向けマイクボタン - 左配置 - コンパクト化 */}
        <div className="md:hidden flex flex-col items-center mr-2">
          <span className="text-xs font-medium text-orange-700 mb-0.5">マイク</span>
          <Button 
            type="button" 
            onClick={handleMicClick}
            size="icon"
            variant={isRecording ? "default" : "ghost"}
            className={`p-2 h-10 w-10 rounded-full ${isRecording 
              ? "bg-gradient-to-r from-red-500 to-pink-500" 
              : "bg-gradient-to-r from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 border border-orange-300"}`}
          >
            <Mic className={`h-5 w-5 ${isRecording ? "text-white" : "text-orange-600"}`} />
          </Button>
        </div>

        {/* デスクトップ向けマイクボタン - 左配置 - コンパクト化 */}
        <div className="hidden md:flex md:flex-col md:items-center md:mr-2">
          <span className="text-xs font-medium text-orange-700 mb-0.5">マイク</span>
          <Button 
            type="button" 
            onClick={handleMicClick}
            size="icon"
            variant={isRecording ? "default" : "ghost"}
            className={`p-2 h-10 w-10 rounded-full ${isRecording 
              ? "bg-gradient-to-r from-red-500 to-pink-500" 
              : "bg-gradient-to-r from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 border border-orange-300"}`}
          >
            <Mic className={`h-5 w-5 ${isRecording ? "text-white" : "text-orange-600"}`} />
          </Button>
        </div>

        {/* 入力エリア - 小さめ固定高さでオーバーフロー時はスクロール */}
        <div className="flex-1 flex items-center bg-white border border-blue-200 rounded-full px-3 py-1 shadow-inner">
          {isMobile ? (
            /* モバイル用テキストエリア（より小さく） */
            <div className="flex-1 relative h-[32px]"> {/* 高さを小さく */}
              <Textarea
                ref={textareaRef}
                className="absolute inset-0 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 resize-none py-1 overflow-y-auto text-sm"
                placeholder={isRecording ? "話しかけてください..." : "メッセージを入力..."}
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
              {/* テキストがある場合にのみクリアボタンを表示 */}
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
            /* デスクトップ用インプット（より小さく） */
            <div className="flex-1 h-[32px] flex items-center relative"> {/* 高さを小さく */}
              <Input
                ref={inputRef}
                type="text"
                className="w-full h-full bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                placeholder={isRecording ? "話しかけてください..." : "メッセージを入力..."}
                value={message}
                onChange={handleInputChange}
                disabled={isLoading}
              />
              {/* テキストがある場合にのみクリアボタンを表示 */}
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
            disabled={isLoading || (!message.trim() && !recordedText.trim())}
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

        {/* デスクトップ向けのカメラボタン - 右配置 - コンパクト化 */}
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