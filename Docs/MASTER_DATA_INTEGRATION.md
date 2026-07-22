# Emergency-Assistance - Master Data Integration

## 概要

Emergency-AssistanceアプリケーションがDashboardUIのmaster_dataスキーマにある共有マスタテーブルにアクセスするための実装ガイドです。

## アーキテクチャ

- **Drizzle ORM**: Emergency-Assistanceで使用しているORM
- **master_dataスキーマ**: 全アプリで共有するマスタテーブル
- **emergencyスキーマ**: Emergency-Assistance固有の業務データ

## 実装ファイル

### 1. server/db/master-data.js
master_dataスキーマへのアクセスを提供するヘルパーモジュール

```javascript
import { getUsers, getMachineTypes, getMachines, getBases, getVehicles } from './db/master-data.js';

// ユーザー一覧取得
const users = await getUsers();

// 機種一覧取得
const machineTypes = await getMachineTypes();

// 機械番号一覧取得
const machines = await getMachines();
```

### 2. ルーティング設定（完了済み）

database: public.app_resource_routing テーブルに以下が登録済み：

```sql
app_id: 'emergency-client'
- users → master_data.users
- managements_offices → master_data.managements_offices
- bases → master_data.bases
- vehicles → master_data.vehicles
- machine_types → master_data.machine_types
- machines → master_data.machines
- emergency_records → emergency.emergency_records
```

## 使用例

### API Endpoint例

```javascript
// server/routes/masters.js
import express from 'express';
import { getUsers, getMachineTypes, getMachines, getBases, getVehicles } from '../db/master-data.js';

const router = express.Router();

// ユーザーマスタAPI
router.get('/api/masters/users', async (req, res) => {
    try {
        const users = await getUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 機種マスタAPI
router.get('/api/masters/machine-types', async (req, res) => {
    try {
        const types = await getMachineTypes();
        res.json(types);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 機械番号マスタAPI
router.get('/api/masters/machines', async (req, res) => {
    try {
        const machines = await getMachines();
        res.json(machines);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
```

### フロントエンド（React）での使用例

```typescript
// client/src/hooks/useMasterData.ts
import { useQuery } from '@tanstack/react-query';

export function useUsers() {
    return useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const res = await fetch('/api/masters/users');
            if (!res.ok) throw new Error('Failed to fetch users');
            return res.json();
        }
    });
}

export function useMachineTypes() {
    return useQuery({
        queryKey: ['machine-types'],
        queryFn: async () => {
            const res = await fetch('/api/masters/machine-types');
            if (!res.ok) throw new Error('Failed to fetch machine types');
            return res.json();
        }
    });
}

// コンポーネントでの使用
function EmergencyForm() {
    const { data: users } = useUsers();
    const { data: machineTypes } = useMachineTypes();
    
    return (
        <form>
            <select name="user">
                {users?.map(u => (
                    <option key={u.id} value={u.id}>{u.username}</option>
                ))}
            </select>
            
            <select name="machineType">
                {machineTypes?.map(mt => (
                    <option key={mt.id} value={mt.id}>{mt.machine_type_name}</option>
                ))}
            </select>
        </form>
    );
}
```

## 移行手順

### Phase 1: master_dataアクセスの追加（現在）
1. ✅ `server/db/master-data.js` 作成完了
2. ⏳ 既存のコードでmaster_dataテーブルを使用する箇所を特定
3. ⏳ API endpointの追加

### Phase 2: 既存コードの更新
1. ⏳ `server/db/schema.js` から users, machine_types, machines の重複定義を削除（オプション）
2. ⏳ 既存のAPIを master-data.js を使用するように更新
3. ⏳ フロントエンドのデータフェッチ部分を新しいAPIに切り替え

### Phase 3: テスト
1. ⏳ 全てのマスタデータ取得APIのテスト
2. ⏳ 既存機能の動作確認
3. ⏳ 統合テスト

## 注意事項

- **Drizzle ORM vs 直接SQL**: master_data テーブルは直接SQLアクセス（postgres.js）を使用
- **スキーマ分離**: Emergency-Assistance固有のデータ（emergency_records等）はemergencyスキーマで管理
- **キャッシュ**: フロントエンドでReact Queryのキャッシュ機能を活用

## トラブルシューティング

### エラー: "relation 'master_data.users' does not exist"
- DATABASE_URL環境変数が正しく設定されているか確認
- webappdb データベースに master_data スキーマが存在するか確認

### エラー: "Cannot find module './db/master-data.js'"
- ファイルパスが正しいか確認
- ES Modules (import/export) を使用しているか確認

## 次のステップ

1. 既存のserver.jsやroutes内でmaster_dataテーブルを使用している箇所を特定
2. master-data.jsのヘルパー関数を使用するようにリファクタリング
3. 新しいAPI endpointの追加と既存endpointの更新
