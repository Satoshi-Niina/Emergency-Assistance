
import React from 'react';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-300">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800 mt-4">
            ページが見つかりません
          </h2>
          <p className="text-gray-600 mt-2">
            お探しのページは存在しないか、移動された可能性があります。
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleGoHome}
            className="w-full flex items-center justify-center space-x-2"
          >
            <Home className="h-4 w-4" />
            <span>ホームに戻る</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={handleGoBack}
            className="w-full flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>前のページに戻る</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
