# GitHub Actions ログクリア手順

## 問題
- GitHub Actions の過去のログが自動的に表示される
- 新しいデプロイの邪魔になっている
- キャッシュや履歴が残っている

## 解決策

### 1. GitHub リポジトリでの操作

#### 1.1 Actions タブでの操作
1. **GitHub リポジトリ** → **Actions** タブ
2. **「すべてのワークフローをクリア」** をクリック
3. **「削除」** をクリックして確認

#### 1.2 個別のワークフロー実行を削除
1. **Actions** タブ → **Backend CI/CD** を選択
2. **各実行** の右側の **「...」** をクリック
3. **「Delete run」** をクリック

### 2. ローカルでの操作

#### 2.1 Git 履歴のクリア
```bash
# ローカルの Git 履歴をクリア
git log --oneline -10

# リモートの履歴を確認
git log --oneline origin/main -10
```

#### 2.2 ブランチの確認
```bash
# 現在のブランチを確認
git branch -a

# リモートブランチを確認
git remote -v
```

### 3. GitHub Actions の設定確認

#### 3.1 ワークフローのトリガー確認
```yaml
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  workflow_dispatch:
```

#### 3.2 手動実行の設定
- **workflow_dispatch** が設定されている
- **GitHub の Actions タブ** から手動実行可能

### 4. 新しいデプロイの実行

#### 4.1 手動実行
1. **GitHub リポジトリ** → **Actions** タブ
2. **Backend CI/CD** を選択
3. **「Run workflow」** をクリック
4. **「Run workflow」** をクリックして実行

#### 4.2 プッシュでの実行
```bash
# 空のコミットでワークフローを実行
git commit --allow-empty -m "Trigger deployment"
git push origin main
```

### 5. キャッシュのクリア

#### 5.1 GitHub Actions キャッシュのクリア
1. **GitHub リポジトリ** → **Actions** タブ
2. **「Caches」** をクリック
3. **各キャッシュ** の右側の **「Delete」** をクリック

#### 5.2 ブラウザキャッシュのクリア
1. **Ctrl + Shift + R** でハードリフレッシュ
2. **開発者ツール** → **Application** → **Storage** → **Clear storage**

### 6. トラブルシューティング

#### 6.1 ログが表示され続ける場合
- **ブラウザのキャッシュをクリア**
- **GitHub のセッションを再ログイン**
- **別のブラウザで確認**

#### 6.2 新しいデプロイが実行されない場合
- **GitHub Actions の権限を確認**
- **リポジトリの設定を確認**
- **手動実行を試行**

## 重要なポイント

- **GitHub Actions の履歴は自動的に表示される**
- **手動でクリアする必要がある**
- **新しいデプロイは手動実行が確実**
- **キャッシュのクリアも重要**

## 推奨手順

1. **GitHub Actions の履歴をクリア**
2. **ブラウザキャッシュをクリア**
3. **手動でワークフローを実行**
4. **新しいデプロイのログを確認**
