import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Calendar,
  User,
  MessageSquare,
  Image as ImageIcon,
  Download,
} from 'lucide-react';

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
        throw new Error('チャットエクスポートファイルの取得に失敗しました');
      }

      const data = await response.json();
      setChatData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
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
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto'></div>
          <p className='mt-4 text-gray-600'>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !chatData) {
    return (
      <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
        <div className='text-center'>
          <p className='text-red-600 mb-4'>エラー: {error}</p>
          <Button onClick={() => window.history.back()}>戻る</Button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-50 p-4'>
      <div className='max-w-4xl mx-auto'>
        {/* ヘッダー */}
        <Card className='mb-6'>
          <CardHeader>
            <div className='flex justify-between items-start'>
              <div>
                <CardTitle className='text-2xl font-bold text-gray-800'>
                  チャットエクスポート詳細
                </CardTitle>
                <p className='text-gray-600 mt-2'>ファイル名: {fileName}</p>
              </div>
              <Button onClick={() => window.history.back()} variant='outline'>
                戻る
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div className='flex items-center gap-2'>
                <Calendar className='h-4 w-4 text-gray-500' />
                <span>
                  エクスポート日時: {formatDate(chatData.exportTimestamp)}
                </span>
              </div>
              <div className='flex items-center gap-2'>
                <User className='h-4 w-4 text-gray-500' />
                <span>ユーザーID: {chatData.userId}</span>
              </div>
              <div className='flex items-center gap-2'>
                <MessageSquare className='h-4 w-4 text-gray-500' />
                <span>メッセージ数: {chatData.chatData.messages.length}件</span>
              </div>
              <div className='flex items-center gap-2'>
                <ImageIcon className='h-4 w-4 text-gray-500' />
                <span>画像数: {chatData.savedImages?.length || 0}件</span>
              </div>
            </div>

            {/* 機種情報 */}
            {chatData.chatData.machineInfo && (
              <div className='mt-4 p-3 bg-blue-50 rounded-lg'>
                <h3 className='font-semibold text-blue-800 mb-2'>機種情報</h3>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-2 text-sm'>
                  <span>
                    機種:{' '}
                    {chatData.chatData.machineInfo.machineTypeName || '未設定'}
                  </span>
                  <span>
                    機械番号:{' '}
                    {chatData.chatData.machineInfo.machineNumber || '未設定'}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* チャット履歴 */}
        <Card>
          <CardHeader>
            <CardTitle className='text-xl font-bold text-gray-800'>
              チャット履歴
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {chatData.chatData.messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg ${
                    message.isAiResponse
                      ? 'bg-blue-50 border-l-4 border-blue-400'
                      : 'bg-gray-50 border-l-4 border-gray-400'
                  }`}
                >
                  <div className='flex justify-between items-start mb-2'>
                    <Badge
                      variant={message.isAiResponse ? 'default' : 'secondary'}
                    >
                      {message.isAiResponse ? 'AI' : 'ユーザー'}
                    </Badge>
                    <span className='text-xs text-gray-500'>
                      {formatDate(message.timestamp)}
                    </span>
                  </div>

                  <div className='space-y-2'>
                    {/* テキストメッセージ */}
                    {!isImageMessage(message.content) && (
                      <p className='text-gray-800 whitespace-pre-wrap'>
                        {message.content}
                      </p>
                    )}

                    {/* 画像メッセージ */}
                    {isImageMessage(message.content) && (
                      <div className='space-y-2'>
                        <p className='text-sm text-gray-600'>
                          📷 画像メッセージ
                        </p>
                        <div className='relative'>
                          <img
                            src={message.content}
                            alt='チャット画像'
                            className='max-w-full h-auto rounded-lg border'
                            style={{ maxHeight: '300px' }}
                          />

                          {/* 保存された画像ファイルへのリンク */}
                          {chatData.savedImages && (
                            <div className='mt-2'>
                              {chatData.savedImages
                                .filter(img => img.messageId === message.id)
                                .map((image, imgIndex) => (
                                  <div
                                    key={imgIndex}
                                    className='flex items-center gap-2'
                                  >
                                    <Button
                                      size='sm'
                                      variant='outline'
                                      onClick={() =>
                                        downloadImage(image.url, image.fileName)
                                      }
                                      className='text-xs'
                                    >
                                      <Download className='h-3 w-3 mr-1' />
                                      画像をダウンロード
                                    </Button>
                                    <span className='text-xs text-gray-500'>
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

        {/* 保存された画像一覧 */}
        {chatData.savedImages && chatData.savedImages.length > 0 && (
          <Card className='mt-6'>
            <CardHeader>
              <CardTitle className='text-xl font-bold text-gray-800'>
                保存された画像一覧
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {chatData.savedImages.map((image, index) => (
                  <div key={index} className='border rounded-lg p-3'>
                    <img
                      src={image.url}
                      alt={`保存画像 ${index + 1}`}
                      className='w-full h-48 object-cover rounded-lg mb-2'
                    />
                    <div className='space-y-1'>
                      <p className='text-sm font-medium'>{image.fileName}</p>
                      <p className='text-xs text-gray-500'>
                        メッセージID: {image.messageId}
                      </p>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => downloadImage(image.url, image.fileName)}
                        className='w-full text-xs'
                      >
                        <Download className='h-3 w-3 mr-1' />
                        ダウンロード
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
