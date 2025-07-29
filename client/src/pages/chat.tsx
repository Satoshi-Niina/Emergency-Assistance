import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useChat } from "../context/chat-context";
import MessageBubble from "../components/chat/message-bubble";
import MessageInput from "../components/chat/message-input";
import CameraModal from "../components/chat/camera-modal";
import ImagePreviewModal from "../components/chat/image-preview-modal";
import EmergencyGuideDisplay from "../components/emergency-guide/emergency-guide-display";
import KeywordButtons from "../components/troubleshooting/keyword-buttons";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { RotateCcw, Download, Upload, FileText, BookOpen, Activity, ArrowLeft, X, Search, Send, Camera } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { searchTroubleshootingFlows, japaneseGuideTitles } from "../lib/troubleshooting-search";

export default function ChatPage() {
  const {
    messages,
    sendMessage,
    isLoading,
    clearChat,
    exportChat,
    importChat,
    chatId
  } = useChat();

  const { toast } = useToast();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEmergencyGuide, setShowEmergencyGuide] = useState(false);
  const [availableGuides, setAvailableGuides] = useState<any[]>([]);
  const [filteredGuides, setFilteredGuides] = useState<any[]>([]);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingGuides, setIsLoadingGuides] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleExport = async () => {
    try {
      await exportChat();
      toast({
        title: "エクスポート成功",
        description: "チャット履歴をエクスポートしました。",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "エクスポートエラー",
        description: "チャット履歴のエクスポートに失敗しました。",
        variant: "destructive",
      });
    }
  };

  // サーバーへ送信する機能
  const handleSendToServer = async () => {
    try {
      if (!chatId || messages.length === 0) {
        toast({
          title: "送信エラー",
          description: "送信するチャット内容がありません。",
          variant: "destructive",
        });
        return;
      }

      // チャット内容をJSON形式で整形
      const chatData = {
        chatId: chatId,
        timestamp: new Date().toISOString(),
        messages: messages.map(msg => ({
          id: msg.id,
          content: msg.content,
          isAiResponse: msg.isAiResponse,
          timestamp: msg.timestamp,
          media: msg.media?.map(media => ({
            id: media.id,
            type: media.type,
            url: media.url,
            title: media.title,
            fileName: media.fileName || ''
          })) || []
        }))
      };

      // サーバーに送信
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chats/${chatId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          chatData: chatData,
          exportType: 'manual_send'
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "送信成功",
          description: `チャット内容をサーバーに送信しました。(${messages.length}件のメッセージ)`,
        });
        console.log('サーバー送信結果:', result);
      } else {
        throw new Error(`送信失敗: ${response.status}`);
      }
    } catch (error) {
      console.error('サーバー送信エラー:', error);
      toast({
        title: "送信エラー",
        description: "サーバーへの送信に失敗しました。",
        variant: "destructive",
      });
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await importChat(file);
        toast({
          title: "インポート成功",
          description: "チャット履歴をインポートしました。",
        });
      } catch (error) {
        console.error('Import error:', error);
        toast({
          title: "インポートエラー",
          description: "チャット履歴のインポートに失敗しました。",
          variant: "destructive",
        });
      }
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fetchAvailableGuides = async () => {
    try {
      setIsLoadingGuides(true);
      console.log('🔄 応急処置データ一覧の取得を開始');

      // トラブルシューティングデータの取得
      const timestamp = Date.now();
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/troubleshooting/list?_t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const troubleshootingData = await response.json();
        console.log('✅ トラブルシューティングデータ取得:', troubleshootingData.length + '件');

        // データを整形して表示用にフォーマット
        const formattedGuides = troubleshootingData.map((item: any) => ({
          id: item.id,
          title: item.title || japaneseGuideTitles[item.id] || item.id,
          description: item.description || '',
          keyword: item.keyword || '',
          steps: item.steps || [],
          fileName: item.fileName || '',
          createdAt: item.createdAt || ''
        }));

        setAvailableGuides(formattedGuides);
        setFilteredGuides(formattedGuides);
      } else {
        console.error('応急処置データの取得に失敗:', response.status);
        setAvailableGuides([]);
        setFilteredGuides([]);
      }
    } catch (error) {
      console.error('ガイド一覧の取得に失敗:', error);
      toast({
        title: "エラー",
        description: "応急処置データの取得に失敗しました",
        variant: "destructive",
      });
      setAvailableGuides([]);
      setFilteredGuides([]);
    } finally {
      setIsLoadingGuides(false);
    }
  };

  const handleEmergencyGuide = async () => {
    await fetchAvailableGuides();
    setShowEmergencyGuide(true);
  };

  const handleSelectGuide = (guideId: string) => {
    setSelectedGuideId(guideId);
  };

  const handleExitGuide = () => {
    setShowEmergencyGuide(false);
    setSelectedGuideId(null);
    setSearchQuery("");
  };

  // 検索処理
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setFilteredGuides(availableGuides);
      return;
    }

    try {
      // クライアントサイド検索を実行
      const searchResults = availableGuides.filter((guide) => {
        const searchText = `${guide.title} ${guide.description} ${guide.keyword || ''}`.toLowerCase();
        return searchText.includes(query.toLowerCase());
      });

      setFilteredGuides(searchResults);
      console.log(`🔍 検索結果: "${query}" -> ${searchResults.length}件`);
    } catch (error) {
      console.error('検索処理エラー:', error);
      setFilteredGuides(availableGuides);
    }
  };

  // キーワードボタンクリック時の処理
  const handleKeywordClick = (keyword: string) => {
    handleSearch(keyword);
  };



  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* ヘッダーエリア - 固定表示 */}
      <div className="bg-white shadow-sm border-b p-3 flex-shrink-0 sticky top-0 z-10">
        <div className="flex justify-between items-center w-full">
          {/* 左側のスペース */}
          <div className="flex-1"></div>

          {/* 中央のボタングループ */}
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleEmergencyGuide}
              className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-2 px-6 py-3 font-bold text-lg shadow-lg"
              size="lg"
            >
              <BookOpen className="h-6 w-6" />
              🚨 応急処置ガイド 🚨
            </Button>
            
            <Button 
              onClick={() => {
                const event = new CustomEvent('open-camera-modal');
                window.dispatchEvent(event);
              }}
              variant="outline"
              className="border-2 border-black hover:bg-gray-100 flex items-center gap-2 px-6 py-3 font-bold text-lg"
              size="lg"
            >
              <Camera className="h-6 w-6" />
              📷 カメラ
            </Button>
          </div>

          {/* サーバー送信ボタン - 右端配置 */}
          <div className="flex-1 flex justify-end">
            <Button 
              onClick={handleSendToServer} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 border-blue-300"
              disabled={messages.length === 0}
            >
              <Send className="h-3 w-3" />
              サーバーへ送信
            </Button>
          </div>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* チャットエリア */}
        <div className="flex-1 overflow-auto p-3 space-y-3">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* 入力エリア */}
        <div className="flex-shrink-0">
          <MessageInput sendMessage={sendMessage} isLoading={isLoading} />
        </div>
      </div>

      {/* モーダル類 */}
      <CameraModal />
      <ImagePreviewModal />

      {/* ファイル入力（隠し要素） */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* 応急処置ガイドポップアップ */}
      {showEmergencyGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[75vh] overflow-hidden shadow-xl">
            {selectedGuideId ? (
              // フロー実行画面
              <div className="h-full max-h-[75vh] overflow-auto">
                <EmergencyGuideDisplay
                  guideId={selectedGuideId}
                  onExit={handleExitGuide}
                  onSendToChat={() => console.log('チャットに送信されました')}
                />
              </div>
            ) : (
              // ガイド一覧表示
              <div className="flex flex-col h-full max-h-[75vh]">
                <div className="bg-white shadow-sm border-b p-4 flex-shrink-0">
                  <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-bold text-gray-800">応急処置ガイド選択</h1>
                    <Button 
                      onClick={handleExitGuide}
                      variant="outline"
                      className="flex items-center gap-1"
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                      閉じる
                    </Button>
                  </div>

                  {/* 検索エリア */}
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        type="text"
                        placeholder="応急処置を検索..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* キーワードボタン */}
                    <KeywordButtons onKeywordClick={handleKeywordClick} />
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  {isLoadingGuides ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 text-sm text-gray-600">
                        {searchQuery ? (
                          <span>検索結果: {filteredGuides.length}件 (検索語: "{searchQuery}")</span>
                        ) : (
                          <span>利用可能なガイド: {filteredGuides.length}件</span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredGuides.map((guide) => (
                          <Card
                            key={guide.id}
                            className="hover:shadow-lg cursor-pointer transition-shadow"
                            onClick={() => handleSelectGuide(guide.id)}
                          >
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg font-semibold">{guide.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {guide.description && (
                                <p className="text-gray-600 text-sm mb-3 line-clamp-3">{guide.description}</p>
                              )}
                              {guide.keyword && (
                                <div className="mb-3">
                                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                    {guide.keyword}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between items-center text-sm text-gray-500">
                                <span>{guide.steps?.length || 0} ステップ</span>
                                <Button size="sm" className="text-xs">
                                  ガイドを開く
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {filteredGuides.length === 0 && !isLoadingGuides && (
                        <div className="text-center py-8">
                          {searchQuery ? (
                            <div>
                              <p className="text-gray-500 mb-2">検索結果が見つかりませんでした</p>
                              <p className="text-sm text-gray-400">別のキーワードで検索してみてください</p>
                            </div>
                          ) : (
                            <p className="text-gray-500">利用可能な応急処置ガイドがありません</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}