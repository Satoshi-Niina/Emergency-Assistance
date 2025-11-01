# キャッシュクリア手順

## 1. ブラウザのキャッシュを完全にクリア

### Chrome/Edgeの場合:
1. `Ctrl + Shift + Delete` を押す
2. 「閲覧履歴データの削除」ダイアログが開く
3. 「時間の範囲」を「全期間」に設定
4. 以下をチェック:
   - ✓ 閲覧履歴
   - ✓ Cookie と他のサイトデータ
   - ✓ キャッシュされた画像とファイル
5. 「データを削除」をクリック

### 開発者ツールで強制リロード:
1. `F12` で開発者ツールを開く
2. `Ctrl + Shift + R` (Windows) または `Cmd + Shift + R` (Mac) で強制リロード
3. または、リロードボタンを右クリック → 「キャッシュの消去と強制的な再読み込み」を選択

## 2. Viteのキャッシュをクリア

```powershell
# プロジェクトルートで実行
cd client
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
Write-Host "Vite cache cleared"
```

## 3. 開発サーバーの再起動

```powershell
# クライアント側の開発サーバーを再起動
cd client
npm run dev
```

別のターミナルで:
```powershell
# サーバー側を再起動
cd server
npm start
```

## 4. ファイルが更新されているか確認

ブラウザの開発者ツール（F12）のコンソールで以下を確認:
- 「💾 保存ボタンがクリックされました」というログが表示されるか
- 「🖨️ 印刷ボタンがクリックされました」というログが表示されるか

## 5. サービスワーカーが有効な場合

ブラウザの開発者ツール → Application → Service Workers → 「Unregister」をクリックしてサービスワーカーを無効化

