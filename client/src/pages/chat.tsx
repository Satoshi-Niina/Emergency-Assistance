import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useChat } from "../context/chat-context";
import MessageBubble from "../components/chat/message-bubble";
import MessageInput from "../components/chat/message-input";
import CameraModal from "../components/chat/camera-modal";
import ImagePreviewModal from "../components/chat/image-preview-modal";
import { Button } from "../components/ui/button";
import { RotateCcw, Download, Upload, FileText, BookOpen, Activity } from "lucide-react";
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

  const handleEmergencyGuide = () => {
    navigate('/troubleshooting');
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* ヘッダーエリア */}
      <div className="bg-white shadow-sm border-b p-2 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-red-500" />
          </div>
          <div className="flex gap-1">
            <Button 
              onClick={handleEmergencyGuide}
              className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-1 text-xs px-2 py-1"
              size="sm"
            >
              <BookOpen className="h-3 w-3" />
              応急処置ガイド
            </Button>
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