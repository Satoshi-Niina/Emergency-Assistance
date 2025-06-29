import { Express } from 'express';
import { registerSyncRoutes } from './sync-routes';
import emergencyFlowRouter from './emergency-flow';
import emergencyGuideRouter from './emergency-guide';
import techSupportRouter from './tech-support';
import { registerDataProcessorRoutes } from './data-processor';
import { troubleshootingRouter } from './troubleshooting';
import { registerKnowledgeBaseRoutes } from './knowledge-base';
import { registerSearchRoutes } from './search';
import fileRouter from './file';
import { flowGeneratorRouter } from './flow-generator';
import { registerChatRoutes } from './chat';

export function registerRoutes(app: Express): void {
  console.log('📡 各ルートモジュールを登録中...');
  
  try {
    // チャット関連ルート（重要：最初に登録）
    registerChatRoutes(app);
    console.log('✅ チャットルート登録完了');
    
    // 同期関連ルート
    registerSyncRoutes(app);
    console.log('✅ 同期ルート登録完了');
    
    // 緊急フロー関連ルート
    app.use('/api/emergency-flow', emergencyFlowRouter);
    console.log('✅ 緊急フールート登録完了');
    
    // 緊急ガイド関連ルート
    app.use('/api/emergency-guide', emergencyGuideRouter);
    console.log('✅ 緊急ガイドルート登録完了');
    
    // テックサポート関連ルート
    app.use('/api/tech-support', techSupportRouter);
    console.log('✅ テックサポートルート登録完了');
    
    // データ処理関連ルート
    registerDataProcessorRoutes(app);
    console.log('✅ データ処理ルート登録完了');
    
    // トラブルシューティング関連ルート
    app.use('/api/troubleshooting', troubleshootingRouter);
    console.log('✅ トラブルシューティングルート登録完了');
    
    // ナレッジベース関連ルート
    registerKnowledgeBaseRoutes(app);
    console.log('✅ ナレッジベースルート登録完了');
    
    // 検索関連ルート
    registerSearchRoutes(app);
    console.log('✅ 検索ルート登録完了');
    
    // ファイル関連ルート
    app.use('/api/file', fileRouter);
    console.log('✅ ファイルルート登録完了');
    
    // フロー生成関連ルート
    app.use('/api/flow-generator', flowGeneratorRouter);
    console.log('✅ フロー生成ルート登録完了');
    
    console.log('🎉 すべてのルート登録完了');
  } catch (error) {
    console.error('❌ ルート登録エラー:', error);
    throw error;
  }
} 