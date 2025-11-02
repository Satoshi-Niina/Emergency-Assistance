#!/usr/bin/env node
// -*- coding: utf-8 -*-

// 統合開発サーバー - unified-hot-reload-server.js へのエントリーポイント
// 本番と同じリソースとしてホットリロードで起動
// 起動コマンド: node server/unified-server.js

// unified-hot-reload-server.js を実行
import('./unified-hot-reload-server.js').catch(error => {
  console.error('❌ Failed to load unified-hot-reload-server.js:', error);
  console.error('詳細:', error.message);
  console.error('スタック:', error.stack);
  process.exit(1);
});

