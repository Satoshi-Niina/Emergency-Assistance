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
      <div className="bg-white shadow-sm border-b p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <Activity className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-800">応急処置サポート</h1>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleEmergencyGuide}
              className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-2"
              size="sm"
            >
              <BookOpen className="h-4 w-4" />
              応急処置ガイド
            </Button>
            <Button 
              onClick={clearChat} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              クリア
            </Button>
            <Button 
              onClick={handleExport} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              エクスポート
            </Button>
            <Button 
              onClick={handleImport} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              インポート
            </Button>
          </div>
        </div>
      </div>

      {/* チャットエリア */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="bg-white rounded-lg p-8 shadow-md max-w-md mx-auto">
              <Activity className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <div className="text-gray-700 mb-4 text-lg font-semibold">
                応急処置サポートシステム
              </div>
              <div className="text-sm text-gray-600 mb-6">
                緊急時の応急処置をサポートします。<br />
                テキスト入力、音声入力、画像撮影で状況をお知らせください。
              </div>
              <div className="space-y-2 text-xs text-gray-500">
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