# Emergency Assistance System - クリーンビルド手順

## 修正があった際のクリーンビルド手順

### ローカル開発環境

```bash
# 完全なクリーンビルド（推奨）
npm run clean-build
```

**手順**:
1. Node.jsプロセスを停止
2. フロントエンドのビルドファイルを削除
3. サーバーのpublicフォルダを削除
4. node_modulesキャッシュをクリア
5. フロントエンドをビルド
6. サーバーを起動

### Docker環境

```bash
# Docker用クリーンビルド
npm run clean-build:docker
```

**手順**:
1. 既存のDockerコンテナとイメージを停止・削除
2. フロントエンドのビルドファイルを削除
3. サーバーのpublicフォルダを削除
4. node_modulesキャッシュをクリア
5. Dockerイメージをビルド
6. Dockerコンテナを起動

## 通常の起動手順

### ローカル開発
```bash
npm run dev
```

### Docker
```bash
npm run docker:build
npm run docker:run
```

## アクセス先

- **ローカル**: `http://localhost:8080`
- **Docker**: `http://localhost:8080`

## 注意事項

- 修正があった際は必ずクリーンビルドを実行してください
- ブラウザでハードリフレッシュ（`Ctrl + Shift + R`）を実行してください
- 古いビルドファイルが残っていると修正内容が反映されません
