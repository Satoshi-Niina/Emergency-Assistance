import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ArrowLeft, Wrench } from 'lucide-react';

export default function MachineManagementPage() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-7xl mx-auto w-full">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          設定に戻る
        </Button>
        
        <h1 className="text-3xl font-bold flex items-center mt-4">
          <Wrench className="mr-3 h-8 w-8" />
          機種機械番号管理
        </h1>
        <p className="mt-2">機種と機械番号の管理を行います</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>機種機械番号データ</CardTitle>
        </CardHeader>
        <CardContent>
          <p>データベースに接続して機種機械番号データを表示します。</p>
        </CardContent>
      </Card>
    </div>
  );
}
