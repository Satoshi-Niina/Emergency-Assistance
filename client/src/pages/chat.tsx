import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useChat } from "../context/chat-context";
import MessageBubble from "../components/chat/message-bubble";
import MessageInput from "../components/chat/message-input";
import CameraModal from "../components/chat/camera-modal";
import ImagePreviewModal from "../components/chat/image-preview-modal";
import EmergencyGuideDisplay from "../components/emergency-guide/emergency-guide-display";
import { Button } from "../components/ui/button";
import { RotateCcw, Download, Upload, FileText, BookOpen, Activity, ArrowLeft } from "lucide-react";
import { useToast } from "../hooks/use-toast";

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
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);

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
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/emergency-flow/list`);
      if (response.ok) {
        const guides = await response.json();
        setAvailableGuides(Array.isArray(guides) ? guides : []);
      }
    } catch (error) {
      console.error('ガイド一覧の取得に失敗:', error);
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
  };

  // 応急処置ガイド表示中の場合
  if (showEmergencyGuide) {
    if (selectedGuideId) {
      return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="container mx-auto px-4 py-8">
            <EmergencyGuideDisplay
              guideId={selectedGuideId}
              onExit={handleExitGuide}
            />
          </div>
        </div>
      );
    } else {
      // ガイド一覧表示
      return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="bg-white shadow-sm border-b p-2 flex-shrink-0">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleExitGuide}
                  variant="outline"
                  className="flex items-center gap-1 text-sm px-3 py-2"
                  size="sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                  チャットに戻る
                </Button>
                <h1 className="text-lg font-bold text-gray-800">応急処置ガイド選択</h1>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableGuides.map((guide) => (
                <div
                  key={guide.id}
                  className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg cursor-pointer transition-shadow"
                  onClick={() => handleSelectGuide(guide.id)}
                >
                  <h3 className="font-semibold text-lg mb-2">{guide.title}</h3>
                  {guide.description && (
                    <p className="text-gray-600 text-sm mb-3">{guide.description}</p>
                  )}
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{guide.steps?.length || 0} ステップ</span>
                    <Button size="sm" className="text-xs">
                      ガイドを開く
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {availableGuides.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">利用可能な応急処置ガイドがありません</p>
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* ヘッダーエリア */}
      <div className="bg-white shadow-sm border-b p-2 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleEmergencyGuide}
              className="bg-yellow-500 hover:bg-yellow-600 text-black flex items-center gap-1 text-sm px-3 py-2 font-bold"
              size="sm"
              style={{ fontSize: '1.5em', fontWeight: 'bold' }}
            >
              <BookOpen className="h-4 w-4" />
              応急処置ガイド
            </Button>
          </div>
          <div className="flex gap-1">
            <Button 
              onClick={clearChat} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1 text-xs px-2 py-1"
            >
              <RotateCcw className="h-3 w-3" />
              クリア
            </Button>
            <Button 
              onClick={handleExport} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1 text-xs px-2 py-1"
            >
              <Download className="h-3 w-3" />
              エクスポート
            </Button>
            <Button 
              onClick={handleImport} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1 text-xs px-2 py-1"
            >
              <Upload className="h-3 w-3" />
              インポート
            </Button>
          </div>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex-1 flex flex-col min-h-0">
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
    </div>
  );
}