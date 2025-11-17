# 🔐 Emergency Assistance - 確定ログイン情報

## ✅ 確定した正しい設定

### データベース接続（server/.env.development）

```env
DATABASE_URL=postgresql://postgres:takabeni@127.0.0.1:5432/webappdb
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=webappdb
DB_USER=postgres
DB_PASSWORD=takabeni
```

---

## 👤 実際のユーザーアカウント

### 管理者アカウント

| ユーザー名 | 表示名 | 役割 | 備考 |
|----------|--------|------|------|
| `niina` | 新納 智志 | admin | ⭐ 推奨 |
| `takabeni1` | タカベニ１ | admin | |
| `Kosei001` | 広成 本社 | admin | |

### 一般ユーザー

| ユーザー名 | 表示名 | 役割 | 備考 |
|----------|--------|------|------|
| `takabeni2` | タカベニ2 | employee | |

---

## 🔑 パスワード確認方法

パスワードはbcryptでハッシュ化されているため、実際のパスワードを確認するには：

1. **データベースに接続:**
```powershell
$env:PGPASSWORD='takabeni'
psql -U postgres -h 127.0.0.1 -p 5432 -d webappdb
```

2. **パスワードハッシュを確認:**
```sql
SELECT username, password FROM users;
```

3. **一般的なパスワードを試す:**
- `niina` のパスワード候補: `niina123`, `password`, `admin123`
- `takabeni1` のパスワード候補: `takabeni`, `takabeni123`, `admin123`

---

## 🚀 ログイン手順

1. **Docker環境を起動:**
```powershell
npm run docker:dev
```

2. **ブラウザでアクセス:**
```
http://localhost:8080
```

3. **ログイン試行:**
- ユーザー名: `niina`
- パスワード: （上記の候補を試す）

---

## ⚠️ 重要な注意点

### 2つのデータベースが存在

#### 1. `webappdb` (実際のデータ) ⭐
- **場所:** ローカルのPostgreSQL（127.0.0.1:5432）
- **ユーザー:** niina, takabeni1, takabeni2, Kosei001
- **使用中:** ✅ はい

#### 2. `emergency_assistance` (テスト用)
- **場所:** Dockerコンテナ内（postgres:5432）
- **ユーザー:** admin, testuser
- **使用中:** ❌ いいえ

---

## 🔧 パスワードをリセットする方法

もしパスワードがわからない場合：

```powershell
# 1. データベースに接続
$env:PGPASSWORD='takabeni'
psql -U postgres -h 127.0.0.1 -p 5432 -d webappdb

# 2. パスワードを更新（例: niina のパスワードを "newpassword" に変更）
# まず新しいハッシュを生成（別のターミナルで）
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('newpassword', 10).then(hash => console.log(hash));"

# 3. データベースでパスワードを更新
UPDATE users SET password = '生成されたハッシュ' WHERE username = 'niina';

# 4. 確認
SELECT username, display_name FROM users WHERE username = 'niina';
```

---

## 📝 結論

### ✅ 確定した正しい値

```env
DATABASE_URL=postgresql://postgres:takabeni@127.0.0.1:5432/webappdb
```

**ログインユーザー:**
- ユーザー名: `niina` または `takabeni1`
- パスワード: データベースに保存されている（ハッシュ化済み）

**パスワードがわからない場合は、上記の「パスワードをリセットする方法」を実行してください。**
