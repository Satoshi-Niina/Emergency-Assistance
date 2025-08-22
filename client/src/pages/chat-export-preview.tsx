import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Calendar, User, MessageSquare, Image as ImageIcon, Download } from 'lucide-react';

interface ChatExportData {
  chatId: string;
  userId: string;
  exportType: string;
  exportTimestamp: string;
  chatData: {
    chatId: string;
    timestamp: string;
    machineInfo: {
      selectedMachineType: string;
      selectedMachineNumber: string;
      machineTypeName: string;
      machineNumber: string;
    };
    messages: Array<{
      id: number;
      content: string;
      isAiResponse: boolean;
      timestamp: string;
      media: any[];
    }>;
  };
  savedImages?: Array<{
    messageId: number;
    fileName: string;
    path: string;
    url: string;
  }>;
}

const ChatExportPreview: React.FC = () => {
  const { fileName } = useParams<{ fileName: string }>();
  const [chatData, setChatData] = useState<ChatExportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fileName) {
      fetchChatExportData(fileName);
    }
  }, [fileName]);

  const fetchChatExportData = async (fileName: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chats/exports/${fileName}`);
      
      if (!response.ok) {
        throw new Error('繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝医ヵ繧｡繧､繝ｫ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆');
      }
      
      const data = await response.json();
      setChatData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const isImageMessage = (content: string) => {
    return content && content.startsWith('data:image/');
  };

  const downloadImage = (imageUrl: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">隱ｭ縺ｿ霎ｼ縺ｿ荳ｭ...</p>
        </div>
      </div>
    );
  }

  if (error || !chatData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">繧ｨ繝ｩ繝ｼ: {error}</p>
          <Button onClick={() => window.history.back()}>謌ｻ繧・/Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 繝倥ャ繝繝ｼ */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-800">
                  繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝郁ｩｳ邏ｰ
                </CardTitle>
                <p className="text-gray-600 mt-2">繝輔ぃ繧､繝ｫ蜷・ {fileName}</p>
              </div>
              <Button onClick={() => window.history.back()} variant="outline">
                謌ｻ繧・
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>繧ｨ繧ｯ繧ｹ繝昴・繝域律譎・ {formatDate(chatData.exportTimestamp)}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span>繝ｦ繝ｼ繧ｶ繝ｼID: {chatData.userId}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                <span>繝｡繝・そ繝ｼ繧ｸ謨ｰ: {chatData.chatData.messages.length}莉ｶ</span>
              </div>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-gray-500" />
                <span>逕ｻ蜒乗焚: {chatData.savedImages?.length || 0}莉ｶ</span>
              </div>
            </div>
            
            {/* 讖溽ｨｮ諠・ｱ */}
            {chatData.chatData.machineInfo && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">讖溽ｨｮ諠・ｱ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <span>讖溽ｨｮ: {chatData.chatData.machineInfo.machineTypeName || '譛ｪ險ｭ螳・}</span>
                  <span>讖滓｢ｰ逡ｪ蜿ｷ: {chatData.chatData.machineInfo.machineNumber || '譛ｪ險ｭ螳・}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 繝√Ε繝・ヨ螻･豁ｴ */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-800">
              繝√Ε繝・ヨ螻･豁ｴ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {chatData.chatData.messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg ${
                    message.isAiResponse 
                      ? 'bg-blue-50 border-l-4 border-blue-400' 
                      : 'bg-gray-50 border-l-4 border-gray-400'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={message.isAiResponse ? 'default' : 'secondary'}>
                      {message.isAiResponse ? 'AI' : '繝ｦ繝ｼ繧ｶ繝ｼ'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatDate(message.timestamp)}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {/* 繝・く繧ｹ繝医Γ繝・そ繝ｼ繧ｸ */}
                    {!isImageMessage(message.content) && (
                      <p className="text-gray-800 whitespace-pre-wrap">
                        {message.content}
                      </p>
                    )}
                    
                    {/* 逕ｻ蜒上Γ繝・そ繝ｼ繧ｸ */}
                    {isImageMessage(message.content) && (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">胴 逕ｻ蜒上Γ繝・そ繝ｼ繧ｸ</p>
                        <div className="relative">
                          <img
                            src={message.content}
                            alt="繝√Ε繝・ヨ逕ｻ蜒・
                            className="max-w-full h-auto rounded-lg border"
                            style={{ maxHeight: '300px' }}
                          />
                          
                          {/* 菫晏ｭ倥＆繧後◆逕ｻ蜒上ヵ繧｡繧､繝ｫ縺ｸ縺ｮ繝ｪ繝ｳ繧ｯ */}
                          {chatData.savedImages && (
                            <div className="mt-2">
                              {chatData.savedImages
                                .filter(img => img.messageId === message.id)
                                .map((image, imgIndex) => (
                                  <div key={imgIndex} className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => downloadImage(image.url, image.fileName)}
                                      className="text-xs"
                                    >
                                      <Download className="h-3 w-3 mr-1" />
                                      逕ｻ蜒上ｒ繝繧ｦ繝ｳ繝ｭ繝ｼ繝・
                                    </Button>
                                    <span className="text-xs text-gray-500">
                                      {image.fileName}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 菫晏ｭ倥＆繧後◆逕ｻ蜒丈ｸ隕ｧ */}
        {chatData.savedImages && chatData.savedImages.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-800">
                菫晏ｭ倥＆繧後◆逕ｻ蜒丈ｸ隕ｧ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {chatData.savedImages.map((image, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <img
                      src={image.url}
                      alt={`菫晏ｭ倡判蜒・${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg mb-2"
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{image.fileName}</p>
                      <p className="text-xs text-gray-500">
                        繝｡繝・そ繝ｼ繧ｸID: {image.messageId}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadImage(image.url, image.fileName)}
                        className="w-full text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        繝繧ｦ繝ｳ繝ｭ繝ｼ繝・
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ChatExportPreview;
