import { useEffect, useState } from "react";
import { useChat } from "@/context/chat-context";
import { useAuth } from "@/context/auth-context";
import MessageBubble from "@/components/chat/message-bubble";
import MessageInput from "@/components/chat/message-input";
import TextSelectionControls from "@/components/chat/text-selection-controls";
import SearchResults from "@/components/chat/search-results";
import CameraModal from "@/components/chat/camera-modal";
import ImagePreviewModal from "@/components/chat/image-preview-modal";
import TroubleshootingSelector from "@/components/troubleshooting/troubleshooting-selector";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Trash2, Heart, FileText, Menu, Settings, LifeBuoy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Chat() {
  const {
    messages,
    setMessages,
    isLoading,
    selectedText,
    setSelectedText,
    searchBySelectedText,
    searchResults,
    clearSearchResults,
    exportChatHistory,
    isExporting,
    hasUnexportedMessages,
    draftMessage,
    setDraftMessage,
    clearChatHistory,
    isClearing,
    isRecording
  } = useChat();

  const { user } = useAuth();
  const [isEndChatDialogOpen, setIsEndChatDialogOpen] = useState(false);

  // Fetch messages for the current chat
  const { data, isLoading: messagesLoading } = useQuery({
    queryKey: ['/api/chats/1/messages'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    // Handle text selection
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length > 0) {
        setSelectedText(selection.toString().trim());
      } else {
        setSelectedText("");
      }
    };

    document.addEventListener("mouseup", handleSelection);
    return () => {
      document.removeEventListener("mouseup", handleSelection);
    };
  }, [setSelectedText]);

  // Show messages from the context or from the query
  const displayMessages = isClearing 
    ? [] 
    : (messages?.length > 0 ? messages : (data as any[] || []));

  const [, setLocation] = useLocation();

  const handleEndChat = () => {
    if (hasUnexportedMessages) {
      setIsEndChatDialogOpen(true);
    } else {
      fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      })
      .then(() => {
        console.log("ログアウト成功 - ログイン画面に遷移します");
        queryClient.clear();
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith('rq-')) {
            localStorage.removeItem(key);
          }
        }
        window.location.href = "/login";
      })
      .catch(error => {
        console.error("ログアウトエラー:", error);
        window.location.href = "/login";
      });
    }
  };

  const handleSendAndEnd = async () => {
    try {
      await exportChatHistory();
      setIsEndChatDialogOpen(false);

      console.log("チャットエクスポート完了。ログアウト処理をスキップしてチャット画面を維持します。");

                // 成功トーストを表示
                //toast({
                //  title: "エクスポート完了",
                //  description: "応急処置の記録を送信しました",
                //});

                // ダイアログを閉じる
                //setShowEndDialog(false);


    } catch (error) {
      console.error("チャット終了エラー:", error);
      window.location.href = "/login";
    }
  };

  const isMobile = useIsMobile();
  const [emergencyGuideOpen, setEmergencyGuideOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");

  return (
    <div className="flex flex-col w-full h-full overflow-auto bg-blue-900 chat-layout-container overflow-scroll-container" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
      {/* ボタン行 - 左に履歴クリア、右に履歴送信とチャット終了 */}
      <div className="bg-gray-100 border-b border-gray-200 px-4 py-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {/* 履歴クリアボタン - 濃い青塗りつぶし白文字白枠線スタイル */}
            <Button 
              variant="outline"
              size="sm"
              onClick={async () => {
                // チャット履歴をクリア（この中でローカル状態もクリアされる）
                await clearChatHistory();
              }}
              disabled={isClearing || !displayMessages.length}
              className="flex items-center gap-1 bg-blue-800 text-white border-white hover:bg-blue-900 text-sm h-8 py-0 px-3"
            >
              {isClearing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">クリア中</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span className="text-sm">履歴クリア</span>
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* 履歴送信ボタン - 緑色 */}
            <Button 
              variant="outline"
              size="sm"
              onClick={exportChatHistory}
              disabled={isExporting || !hasUnexportedMessages}
              className="flex items-center gap-2 border-green-400 bg-green-50 hover:bg-green-100 text-green-700 h-8 py-0 px-3"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                  <span className="text-sm">送信中</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 text-green-600" />
                  <span className="text-sm">履歴送信</span>
                </>
              )}
            </Button>

            {/* チャット終了ボタン - オレンジ色 */}
            <Button 
              variant="destructive"
              size="sm"
              onClick={handleEndChat}
              className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white border-0 h-8 py-0 px-3"
            >
              <span className="text-sm">チャット終了</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 応急処置ガイドボタン - 中央に配置 */}
      <div className="w-full flex justify-center items-center p-4 bg-gradient-to-r from-blue-100 to-blue-50 border-b border-blue-200">
        <Button
          variant="default"
          size="lg"
          onClick={() => {
            // 現在のテキストボックスの内容を取得
            const messageInput = document.querySelector('textarea, input[type="text"]') as HTMLInputElement | HTMLTextAreaElement;
            if (messageInput) {
              const inputText = messageInput.value.trim();
              setSearchKeyword(inputText);
            } else {
              setSearchKeyword("");
            }
            setEmergencyGuideOpen(true);
          }}
          className="flex items-center gap-2 border-2 border-white bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 shadow-md rounded-lg"
        >
          <Heart className="h-6 w-6 text-white" />
          <span className="text-lg font-bold">応急処置ガイド</span>
        </Button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-auto chat-layout-container" style={{ minHeight: '75vh' }}>
        {/* Chat Messages Area - 領域を2/3に縮小し、縦を元に戻す */}
        <div className="flex-1 flex flex-col h-full min-h-[75vh] overflow-auto md:w-2/3 bg-white chat-messages-container" style={{ maxWidth: '100%', overflowX: 'hidden' }}>

          {/* Chat Messages - 高さを1.5倍に */}
          <div id="chatMessages" className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 md:px-6 space-y-4 min-w-[300px]" style={{ minHeight: '60vh' }}>
            {messagesLoading || isLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-blue-700">メッセージを読み込み中...</p>
              </div>
            ) : !displayMessages || displayMessages.length === 0 ? (
              <div className={`flex items-center justify-center h-full text-center ${isRecording ? 'hidden' : ''}`}>
                <div>
                  <p className="text-xl font-semibold mb-2 text-blue-800">会話を始めましょう</p>
                  <p className="text-sm text-blue-500">保守用車に関する質問を入力するか、マイクボタンをタップして話しかけてください。</p>
                </div>
              </div>
            ) : (
              <>
                {/* 通常のメッセージリスト */}
                {displayMessages.map((message: any, index: number) => (
                  <div key={index} className="w-full md:max-w-2xl mx-auto">
                    <MessageBubble message={message} />
                  </div>
                ))}
              </>
            )}

            {/* プレビュー用の一時メッセージ (録音中テキストと撮影した画像のプレビュー) */}
            {draftMessage && draftMessage.content && (
              <div className="w-full md:max-w-2xl mx-auto">
                <MessageBubble
                  message={{
                    id: -1, // 一時的なID
                    content: draftMessage.content,
                    senderId: 1, // 現在のユーザーID
                    isAiResponse: false,
                    timestamp: new Date(),
                    media: draftMessage.media?.map((m, idx) => ({
                      id: idx,
                      messageId: -1,
                      ...m
                    }))
                  }}
                  isDraft={true}
                />
              </div>
            )}

            {/* デバッグ表示 - ドラフトメッセージの状態を確認 */}
            <div className="hidden">
              <p>draftMessage: {draftMessage ? JSON.stringify(draftMessage) : 'null'}</p>
            </div>

          </div>

          {/* エクスポート状態表示 */}
          {/* Text Selection Controls - Only show when text is selected */}
          {selectedText && <TextSelectionControls text={selectedText} onSearch={searchBySelectedText} />}

          {/* Message Input */}
          <MessageInput />
        </div>

        {/* 関係画像エリア - 右側に1/3のスペースを確保して常に表示 */}
        <div className="hidden md:block md:w-1/3 border-l border-blue-200 bg-blue-50 overflow-y-auto search-results-panel" style={{ minHeight: '75vh' }}>
          <div className="w-full h-full">
            <div className="sticky top-0 bg-blue-600 text-white py-2 px-4 font-medium z-10">
              <h2 className="text-lg">関係画像</h2>
            </div>
            <div className="p-2">
              <SearchResults results={searchResults || []} onClear={clearSearchResults} />
            </div>
          </div>
        </div>

        {/* モバイル用検索結果スライダー - 縦向き表示の時のみフローティングボタンを表示 */}

      </div>

      {/* 未送信のチャット履歴がある場合の警告ダイアログ */}
      <Dialog open={isEndChatDialogOpen} onOpenChange={setIsEndChatDialogOpen}>
        <DialogContent className="bg-blue-50 border border-blue-200">
          <DialogHeader className="border-b border-blue-200 pb-3">
            <DialogTitle className="text-blue-800 text-lg font-bold">チャット履歴が未送信です</DialogTitle>
            <DialogDescription className="text-blue-700">
              まだ送信されていないチャット履歴があります。このまま終了すると、履歴が保存されません。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-between mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsEndChatDialogOpen(false)}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              キャンセル
            </Button>
            <div className="flex gap-2">
              <Button 
                variant="destructive" 
                onClick={() => {
                  setIsEndChatDialogOpen(false);
                  console.log("送信せずに終了が選択されました - ダイアログを閉じるのみ");
                }}
                className="bg-red-500 hover:bg-red-600"
              >
                送信せずに終了
              </Button>
              <Button 
                variant="default" 
                onClick={handleSendAndEnd}
                disabled={isExporting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>送信中...</span>
                  </>
                ) : (
                  <span>送信して終了</span>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <CameraModal />
      <ImagePreviewModal />

      {/* 応急処置ガイドモーダル（モバイル・デスクトップ共通） */}
      <Dialog open={emergencyGuideOpen} onOpenChange={setEmergencyGuideOpen}>
        <DialogContent className={`bg-blue-50 border border-blue-200 ${isMobile ? 'w-[95%] max-w-md' : 'max-w-3xl'}`}>
          <DialogHeader className="border-b border-blue-200 pb-3">
            <DialogTitle className="text-blue-800 text-lg font-bold flex items-center gap-2">
              <Heart className="h-5 w-5 text-red-500" />
              <span>応急処置ガイド</span>
            </DialogTitle>
            <DialogDescription className="text-blue-700">
              症状を選択するか、キーワードで検索してください
            </DialogDescription>
          </DialogHeader>
          <div className={`overflow-y-auto py-2 ${isMobile ? 'max-h-[70vh]' : 'max-h-[75vh]'}`}>
            <TroubleshootingSelector initialSearchKeyword={searchKeyword} />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEmergencyGuideOpen(false)}
              className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}