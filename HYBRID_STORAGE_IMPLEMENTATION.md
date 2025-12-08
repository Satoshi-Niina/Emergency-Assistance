# ハイブリッドストレージ対応完了レポート

## 概要
ローカル環境（ファイルシステム）と本番環境（Azure Blob Storage）の両方で完全に機能するように、サーバーサイドのコード（`unified-hot-reload-server.js`）を修正しました。
これにより、ローカルでの開発体験を損なうことなく、本番環境でのデータ永続化を実現しています。

## 対応方針
各APIエンドポイントにおいて、環境変数 `NODE_ENV` が `production` かつ `blobServiceClient` が利用可能な場合は Azure Blob Storage を使用し、それ以外の場合は従来のローカルファイルシステム（`fs`）を使用するように分岐処理を実装しました。

## 修正されたエンドポイント一覧

### 1. 応急処置フロー (Emergency Flow)
| メソッド | エンドポイント | 対応内容 |
| --- | --- | --- |
| `GET` | `/emergency-flow/list` | 本番: `knowledge-base` コンテナからJSON一覧を取得<br>ローカル: `knowledge-base/troubleshooting` から取得 |
| `POST` | `/emergency-flow/generate` | 本番: 生成されたフローをBlobに保存<br>ローカル: ファイルシステムに保存 |
| `POST` | `/emergency-flow/upload-image` | 本番: `images` コンテナに画像をアップロード<br>ローカル: `knowledge-base/images` に保存 |
| `PUT` | `/emergency-flow/:id` | 本番: Blob上のフローJSONを更新<br>ローカル: ファイルシステム上のJSONを更新 |

### 2. 履歴管理 (History)
| メソッド | エンドポイント | 対応内容 |
| --- | --- | --- |
| `GET` | `/history` | 本番: `history` コンテナから履歴一覧を取得<br>ローカル: `knowledge-base/exports` から取得 |
| `GET` | `/history/:id` | 本番: 指定されたIDのBlobを取得<br>ローカル: 指定されたIDのJSONファイルを取得 |
| `POST` | `/history/upload-image` | 本番: `history` コンテナ（またはimages）に画像を保存<br>ローカル: `knowledge-base/exports` に画像を保存 |
| `DELETE` | `/history/:id` | 本番: Blobを削除<br>ローカル: ファイルを削除 |
| `PUT` | `/history/update-item/:id` | 本番: Blobの内容を更新<br>ローカル: ファイルの内容を更新 |

### 3. AI支援設定 (AI Assist Settings)
| メソッド | エンドポイント | 対応内容 |
| --- | --- | --- |
| `GET` | `/ai-assist/settings` | 本番: `config` コンテナの `ai-assist-settings.json` を参照<br>ローカル: `data/ai-assist-settings.json` を参照 |
| `POST` | `/ai-assist/settings` | 本番: `config` コンテナに設定を保存<br>ローカル: `data/ai-assist-settings.json` に保存 |

## コンテナ構成（本番環境）
Azure Blob Storage上で以下のコンテナが使用されます：
- `knowledge-base`: フロー定義JSON (`troubleshooting/`)
- `images`: フロー用画像 (`emergency-flows/`)
- `history`: 履歴データJSONおよび履歴用画像
- `config`: 設定ファイル (`ai-assist-settings.json`)

## 次のステップ
1. ローカル環境でアプリケーションを起動し、全ての機能（フロー生成、履歴保存、設定変更など）が正常に動作することを確認してください。
2. 本番環境へデプロイし、同様に動作確認を行ってください。
