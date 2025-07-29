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
            <h1 className="text-lg font-bold text-gray-800">応急処置支援システム</h1>
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
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[300px]">
              <div className="bg-white rounded-lg p-6 shadow-md max-w-lg w-full mx-auto">
                <Activity className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <div className="text-gray-700 mb-3 text-lg font-semibold text-center">
                  応急処置支援システム
                </div>
                <div className="text-sm text-gray-600 mb-4 text-center">
                  緊急時の応急処置をサポートします。<br />
                  テキスト入力、音声入力、画像撮影で状況をお知らせください。
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>📝</span>
                    <span>テキストで症状を入力</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>🎤</span>
                    <span>音声で状況を説明</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📷</span>
                    <span>患部の写真を撮影</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📖</span>
                    <span>応急処置ガイドを参照</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
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