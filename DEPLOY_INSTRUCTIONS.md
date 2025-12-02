# 緊急デプロイ手順書

## 現在の状況

✅ **完了した修正:**
1. runtime-config.jsのPLACEHOLDER置換処理を追加
2. 正しいApp Service URL (emergency-assistantapp-gwgscxcca5cahyb9.japanwest-01.azurewebsites.net) を設定
3. CORS設定を強化してazurestaticapps.netからのアクセスを許可
4. ビルドスクリプトを修正してruntime-config.jsを確実に置換
5. コミット f7e3a0c5 をmainブランチにプッシュ済み

## 次のステップ: クライアントのデプロイ

### 手順1: GitHub Actionsでクライアントデプロイを手動実行

1. **GitHubリポジトリを開く:**
   https://github.com/Satoshi-Niina/Emergency-Assistance

2. **Actionsタブに移動:**
   - 上部メニューの「Actions」をクリック

3. **クライアントデプロイワークフローを選択:**
   - 左サイドバーから「**Deploy Client (Azure Static Web Apps)**」を選択

4. **手動実行:**
   - 右上の「**Run workflow**」ボタンをクリック
   - 「Use workflow from」が「**Branch: main**」になっていることを確認
   - 緑色の「**Run workflow**」ボタンをクリック

5. **デプロイ進行状況を確認:**
   - ワークフローが開始されたら、ジョブをクリックして詳細を確認
   - 各ステップが緑色のチェックマークになることを確認
   - 特に以下のステップに注目:
     * ✅ Build client
     * ✅ Verify build output
     * ✅ Deploy to Azure Static Web Apps

### 手順2: デプロイ完了確認（約5分後）

#### 2.1 runtime-config.jsが正しくデプロイされたか確認

PowerShellで以下を実行:
```powershell
Invoke-WebRequest -Uri "https://witty-river-012f39e00.1.azurestaticapps.net/runtime-config.js" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**期待される結果:**
- ✅ 404エラーが出ない
- ✅ ファイルの内容が表示される
- ✅ `emergency-assistantapp-gwgscxcca5cahyb9.japanwest-01.azurewebsites.net` が含まれている
- ❌ `PLACEHOLDER` が含まれていない

#### 2.2 ブラウザで動作確認

1. **ブラウザのキャッシュをクリア:**
   - Chrome: Ctrl+Shift+Delete → すべてのキャッシュをクリア
   - **ハードリフレッシュ: Ctrl+F5**（これが最も重要！）

2. **Static Web Appを開く:**
   https://witty-river-012f39e00.1.azurestaticapps.net

3. **開発者ツールを開く（F12）:**
   - Consoleタブを開く
   - 以下のログを確認:
     ```
     🔧 Runtime Config Applied: {
       hostname: "witty-river-012f39e00.1.azurestaticapps.net",
       environment: "production",
       API_BASE_URL: "https://emergency-assistantapp-gwgscxcca5cahyb9.japanwest-01.azurewebsites.net/api",
       isAzureStaticWebApp: true,
       origin: "https://witty-river-012f39e00.1.azurestaticapps.net"
     }
     ```

4. **ログイン:**
   - ユーザー名: `niina`
   - パスワード: （設定したパスワード）

5. **応急復旧データ管理画面に移動:**
   - 左メニューから「応急復旧データ管理」をクリック
   - ✅ フロー一覧が表示される
   - ✅ 404エラーが出ない

6. **フローを開いて編集:**
   - フローをクリックして詳細を表示
   - ✅ 画像が表示される（404エラーなし）
   - 編集ボタンをクリック
   - 画像をアップロード
   - ✅ 保存が成功する（500エラーなし）

### トラブルシューティング

#### 問題1: runtime-config.jsが404エラー

**原因:** デプロイが完了していないか、ビルド成果物が正しくコピーされていない

**解決方法:**
1. GitHub Actionsのログを確認
2. 「Deploy to Azure Static Web Apps」ステップが成功しているか確認
3. 再度ワークフローを実行

#### 問題2: まだPLACEHOLDERが表示される

**原因:** ブラウザキャッシュが残っている

**解決方法:**
1. Ctrl+Shift+Delete で完全にキャッシュをクリア
2. プライベートウィンドウ（Ctrl+Shift+N）で開く
3. ハードリフレッシュ（Ctrl+F5）を複数回実行

#### 問題3: 404エラーが続く

**原因:** APIエンドポイントのパスが間違っている

**確認方法:**
```powershell
# emergency-flow/listエンドポイントを直接テスト
Invoke-WebRequest -Uri "https://emergency-assistantapp-gwgscxcca5cahyb9.japanwest-01.azurewebsites.net/api/emergency-flow/list" -UseBasicParsing
```

**解決方法:**
1. App Serviceが起動しているか確認
2. App Serviceのログを確認:
   ```powershell
   az webapp log tail --name emergency-assistantapp-gwgscxcca5cahyb9 --resource-group <your-resource-group>
   ```

#### 問題4: 500エラー（保存失敗）

**原因:** BLOBストレージへの書き込み権限がない

**確認方法:**
```powershell
Invoke-WebRequest -Uri "https://emergency-assistantapp-gwgscxcca5cahyb9.japanwest-01.azurewebsites.net/api/_diag/blob-test" -UseBasicParsing | Select-Object -ExpandProperty Content
```

**解決方法:**
1. App Serviceの環境変数を確認
2. `AZURE_STORAGE_CONNECTION_STRING`が正しく設定されているか確認
3. BLOBコンテナ `knowledge` が存在するか確認

## デプロイ後の検証チェックリスト

完全に動作するまで以下を確認:

- [ ] runtime-config.jsが404エラーなしで取得できる
- [ ] ブラウザコンソールに正しいAPI_BASE_URLが表示される
- [ ] PLACEHOLDERの警告メッセージが表示されない
- [ ] ログインが成功する
- [ ] 応急復旧データ管理画面が表示される
- [ ] フロー一覧が取得できる（404エラーなし）
- [ ] フローの詳細が表示される
- [ ] 画像が正しく表示される（404エラーなし）
- [ ] フローの編集ができる
- [ ] 画像のアップロードができる
- [ ] 保存が成功する（500エラーなし）
- [ ] 保存後に画像が表示される

## 成功の確認

すべてのチェックリストが✅になったら、以下のスクリーンショットを撮影:

1. ブラウザコンソールのRuntime Config Applied ログ
2. 応急復旧データ管理画面のフロー一覧
3. フロー詳細画面の画像表示
4. 編集後の保存成功メッセージ

---

**作成日:** 2025-12-02  
**コミット:** f7e3a0c5  
**対象環境:** Azure Production
