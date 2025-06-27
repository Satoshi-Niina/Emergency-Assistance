# Emergency Assistance System

機械故障発生時のトラブルシューティングシステム　

## 🚀 機能

- リアルタイムチャットによる故障診断
- ナレッジベース検索
- 緊急時フロー作成・管理
- 音声アシスタント
- 画像検索機能
- オフライン対応

## 📋 必要条件

- Node.js 20.x以上
- PostgreSQL 16.x以上
- npm または yarn

## 🛠️ インストール

### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd Emergency-Assistance
```

### 2. 依存関係のインストール
```bash
npm install
cd client && npm install && cd ..
```

### 3. 環境変数の設定
```bash
cp env.example .env
# .envファイルを編集して必要な設定を行ってください
```

### 4. データベースのセットアップ
```bash
npm run db:migrate
```

## 🏃‍♂️ 開発環境での実行

```bash
# 開発サーバー起動（フロントエンド + バックエンド）
npm run dev

# フロントエンドのみ
npm run dev:client

# バックエンドのみ
npm run dev:server
```

## 🚀 本番環境でのデプロイ

### Dockerを使用したデプロイ

```bash
# Dockerイメージのビルド
npm run docker:build

# Dockerコンテナの実行
npm run docker:run
```

### 手動デプロイ

```bash
# 本番用ビルド
npm run deploy:prepare

# 本番サーバー起動
npm run start:prod
```

## 🌐 クラウドデプロイ

### Vercel
```bash
# Vercel CLIのインストール
npm i -g vercel

# デプロイ
vercel --prod
```

### Railway
```bash
# Railway CLIのインストール
npm i -g @railway/cli

# デプロイ
railway up
```

### Heroku
```bash
# Heroku CLIのインストール
# https://devcenter.heroku.com/articles/heroku-cli

# デプロイ
heroku create
git push heroku main
```

## 📁 プロジェクト構造

```
Emergency-Assistance/
├── client/                 # Reactフロントエンド
│   ├── src/
│   │   ├── components/     # Reactコンポーネント
│   │   ├── pages/         # ページコンポーネント
│   │   ├── hooks/         # カスタムフック
│   │   └── lib/           # ユーティリティ
│   └── dist/              # ビルド出力
├── server/                # Expressバックエンド
│   ├── routes/            # APIルート
│   ├── middleware/        # ミドルウェア
│   └── lib/               # ライブラリ
├── knowledge-base/        # ナレッジベースデータ
├── public/                # 静的ファイル
├── uploads/               # アップロードファイル
└── dist/                  # サーバービルド出力
```

## 🔧 環境変数

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `DATABASE_URL` | PostgreSQL接続URL | ✅ |
| `SESSION_SECRET` | セッション暗号化キー | ✅ |
| `PORT` | サーバーポート | ❌ |
| `NODE_ENV` | 実行環境 | ❌ |
| `OPENAI_API_KEY` | OpenAI APIキー | ❌ |
| `AZURE_SPEECH_KEY` | Azure Speech APIキー | ❌ |

## 📊 ヘルスチェック

```bash
curl http://localhost:3001/api/health
```

## 🔍 トラブルシューティング

### ポート競合
```bash
npm run clean:ports
```

### ビルドエラー
```bash
npm run clean
npm run build
```

### データベース接続エラー
- `DATABASE_URL`の設定を確認
- PostgreSQLサービスが起動していることを確認

## 📝 ライセンス

MIT License

## 🤝 コントリビューション

1. フォークを作成
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

１.音声チャットによる、GPT及び画像検索しレスポンス
２.音声をAPIで音声認識し、チャットエリアの左にテキストを表示
３.選択したテキストを検索ワードとして、GPTとfuseに送信する
４.検索ワードにより、GPTは回答、Fuseから画像をレスポンスする
５.チャットエリア右側のエリアに関係のプレビュー画像を表示する
６.プレビュー画像をタップすることで、説明文章と拡大画像が表示される
７.チャットエリアの上にある応急処置ガイドをタップすることで、トラブルシューティングのフォームが表示させる
８.チャットで選択した、テキストをキーワードとして、トラブルシューティングファイルを検索・絞り込みを行う
９.事前に、texやエクセル、プレゼン、pdf等のファイルをGPTとfuse検索用データ処理を行う
10.ファイルを処理する時、GPT・Fues用として処理するオプションを設けている
11.応急処置ガイドは、新規のファイルを読み込むほか、既存のファイルを開き、テキスト編集または、
　　キャラクター（図）でフローを視覚的に編集が可能としている。
  