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
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* ヘッダーエリア */}
      <div className="bg-white shadow-sm border-b p-3">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-red-500" />
            <h1 className="text-xl font-bold text-gray-800">応急処置支援システム</h1>
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

      {/* チャットエリア */}
      <div className="flex-1 overflow-auto p-3 space-y-3 max-h-[calc(100vh-200px)]">
        {messages.length === 0 ? (
          <div className="text-center py-4">
            <div className="bg-white rounded-lg p-4 shadow-md max-w-lg mx-auto">
              <Activity className="h-12 w-12 text-red-500 mx-auto mb-3" />
              <div className="text-gray-700 mb-3 text-base font-semibold">
                応急処置支援システム
              </div>
              <div className="text-sm text-gray-600 mb-4">
                緊急時の応急処置をサポートします。<br />
                テキスト入力、音声入力、画像撮影で状況をお知らせください。
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <div>📝 テキストで症状を入力</div>
                <div>🎤 音声で状況を説明</div>
                <div>📷 患部の写真を撮影</div>
                <div>📖 応急処置ガイドを参照</div>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <MessageInput sendMessage={sendMessage} isLoading={isLoading} />

      {/* カメラモーダル */}
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