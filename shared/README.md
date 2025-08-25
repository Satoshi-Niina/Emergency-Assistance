# Emergency Assistance Shared Library

縺薙・繝ｩ繧､繝悶Λ繝ｪ縺ｯ縲・mergency Assistance System縺ｮ蜈ｱ譛峨さ繝ｳ繝昴・繝阪Φ繝医∝梛螳夂ｾｩ縲√ヰ繝ｪ繝・・繧ｷ繝ｧ繝ｳ繧ｹ繧ｭ繝ｼ繝槭√Θ繝ｼ繝・ぅ繝ｪ繝・ぅ髢｢謨ｰ繧呈署萓帙＠縺ｾ縺吶・

## 讒矩

```
shared/
笏懌楳笏 src/
笏・  笏懌楳笏 schema.ts      # 繝・・繧ｿ繝吶・繧ｹ繧ｹ繧ｭ繝ｼ繝槫ｮ夂ｾｩ
笏・  笏懌楳笏 types.ts       # TypeScript蝙句ｮ夂ｾｩ
笏・  笏懌楳笏 validation.ts  # Zod繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｹ繧ｭ繝ｼ繝・
笏・  笏懌楳笏 utils.ts       # 蜈ｱ騾壹Θ繝ｼ繝・ぅ繝ｪ繝・ぅ髢｢謨ｰ
笏・  笏披楳笏 index.ts       # 繝｡繧､繝ｳ繧ｨ繝ｳ繝医Μ繝ｼ繝昴う繝ｳ繝・
笏懌楳笏 dist/              # 繝薙Ν繝牙・蜉・
笏懌楳笏 package.json       # 繝代ャ繧ｱ繝ｼ繧ｸ險ｭ螳・
笏懌楳笏 tsconfig.json      # TypeScript險ｭ螳・
笏披楳笏 README.md          # 縺薙・繝輔ぃ繧､繝ｫ
```

## 繧､繝ｳ繧ｹ繝医・繝ｫ

```bash
# 蜈ｱ譛峨Λ繧､繝悶Λ繝ｪ縺ｮ繝薙Ν繝・
npm run build:shared

# 縺ｾ縺溘・縲∝・譛峨Λ繧､繝悶Λ繝ｪ繝・ぅ繝ｬ繧ｯ繝医Μ縺ｧ逶ｴ謗･繝薙Ν繝・
cd shared && npm run build
```

## 菴ｿ逕ｨ譁ｹ豕・

### 蝓ｺ譛ｬ逧・↑繧､繝ｳ繝昴・繝・

```typescript
// 蜈ｨ縺ｦ縺ｮ繧ｨ繧ｯ繧ｹ繝昴・繝医ｒ繧､繝ｳ繝昴・繝・
import * as Shared from '@emergency-assistance/shared';

// 迚ｹ螳壹・繝｢繧ｸ繝･繝ｼ繝ｫ繧偵う繝ｳ繝昴・繝・
import { schema } from '@emergency-assistance/shared/schema';
import { types } from '@emergency-assistance/shared/types';
import { validation } from '@emergency-assistance/shared/validation';
import { utils } from '@emergency-assistance/shared/utils';
```

### 繝・・繧ｿ繝吶・繧ｹ繧ｹ繧ｭ繝ｼ繝・

```typescript
import { users, chats, messages, emergencyFlows } from '@emergency-assistance/shared/schema';

// 繧ｹ繧ｭ繝ｼ繝槭・菴ｿ逕ｨ萓・
const userTable = users;
const chatTable = chats;
```

### 蝙句ｮ夂ｾｩ

```typescript
import type { User, Chat, Message, EmergencyFlow } from '@emergency-assistance/shared/types';

// 蝙九・菴ｿ逕ｨ萓・
const user: User = {
  id: 'user-123',
  username: 'john_doe',
  display_name: 'John Doe',
  role: 'employee',
  created_at: new Date()
};
```

### 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ

```typescript
import { loginSchema, insertUserSchema } from '@emergency-assistance/shared/validation';

// 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ縺ｮ菴ｿ逕ｨ萓・
const loginData = loginSchema.parse({
  username: 'john_doe',
  password: 'password123'
});
```

### 繝ｦ繝ｼ繝・ぅ繝ｪ繝・ぅ髢｢謨ｰ

```typescript
import { 
  formatDate, 
  generateUUID, 
  createSuccessResponse,
  validatePasswordStrength 
} from '@emergency-assistance/shared/utils';

// 繝ｦ繝ｼ繝・ぅ繝ｪ繝・ぅ髢｢謨ｰ縺ｮ菴ｿ逕ｨ萓・
const formattedDate = formatDate(new Date(), 'long');
const uuid = generateUUID();
const response = createSuccessResponse({ message: 'Success' });
const passwordCheck = validatePasswordStrength('MyPassword123!');
```

## 蠕梧婿莠呈鋤諤ｧ

譌｢蟄倥・繧ｳ繝ｼ繝峨→縺ｮ莠呈鋤諤ｧ繧剃ｿ昴▽縺溘ａ縲∽ｻ･荳九・繧､繝ｳ繝昴・繝医ヱ繧ｹ繧ょｼ輔″邯壹″繧ｵ繝昴・繝医＆繧後※縺・∪縺呻ｼ・

```typescript
// 譌｢蟄倥・繧､繝ｳ繝昴・繝医ヱ繧ｹ・亥ｾ梧婿莠呈鋤諤ｧ・・
import { schema, users, messages } from '../shared/schema';
```

## 髢狗匱

### 繝薙Ν繝・

```bash
npm run build
```

### 髢狗匱繝｢繝ｼ繝会ｼ医え繧ｩ繝・メ・・

```bash
npm run dev
```

### 繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・

```bash
npm run clean
```

## 繧ｨ繧ｯ繧ｹ繝昴・繝・

### 繧ｹ繧ｭ繝ｼ繝・(`./schema`)

- `users` - 繝ｦ繝ｼ繧ｶ繝ｼ繝・・繝悶Ν
- `chats` - 繝√Ε繝・ヨ繝・・繝悶Ν
- `messages` - 繝｡繝・そ繝ｼ繧ｸ繝・・繝悶Ν
- `media` - 繝｡繝・ぅ繧｢繝・・繝悶Ν
- `emergencyFlows` - 邱頑･繝輔Ο繝ｼ繝・・繝悶Ν
- `images` - 逕ｻ蜒上ユ繝ｼ繝悶Ν
- `documents` - 繝峨く繝･繝｡繝ｳ繝医ユ繝ｼ繝悶Ν
- `keywords` - 繧ｭ繝ｼ繝ｯ繝ｼ繝峨ユ繝ｼ繝悶Ν
- `chatExports` - 繝√Ε繝・ヨ繧ｨ繧ｯ繧ｹ繝昴・繝医ユ繝ｼ繝悶Ν
- `schema` - 蜈ｨ繧ｹ繧ｭ繝ｼ繝槭・邨ｱ蜷医が繝悶ず繧ｧ繧ｯ繝・

### 蝙句ｮ夂ｾｩ (`./types`)

- `User`, `InsertUser` - 繝ｦ繝ｼ繧ｶ繝ｼ髢｢騾｣縺ｮ蝙・
- `Chat`, `InsertChat` - 繝√Ε繝・ヨ髢｢騾｣縺ｮ蝙・
- `Message`, `InsertMessage` - 繝｡繝・そ繝ｼ繧ｸ髢｢騾｣縺ｮ蝙・
- `EmergencyFlow`, `InsertEmergencyFlow` - 邱頑･繝輔Ο繝ｼ髢｢騾｣縺ｮ蝙・
- `ChatMessage` - 邨ｱ荳縺輔ｌ縺溘メ繝｣繝・ヨ繝｡繝・そ繝ｼ繧ｸ蝙・
- `ApiResponse<T>` - API繝ｬ繧ｹ繝昴Φ繧ｹ蝙・
- `SearchResult<T>` - 讀懃ｴ｢邨先棡蝙・
- `SystemConfig` - 繧ｷ繧ｹ繝・Β險ｭ螳壼梛

### 繝舌Μ繝・・繧ｷ繝ｧ繝ｳ (`./validation`)

- `loginSchema` - 繝ｭ繧ｰ繧､繝ｳ繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
- `insertUserSchema` - 繝ｦ繝ｼ繧ｶ繝ｼ菴懈・繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
- `insertMessageSchema` - 繝｡繝・そ繝ｼ繧ｸ菴懈・繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
- `insertEmergencyFlowSchema` - 邱頑･繝輔Ο繝ｼ菴懈・繝舌Μ繝・・繧ｷ繝ｧ繝ｳ
- 縺昴・莉悶・繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｹ繧ｭ繝ｼ繝・

### 繝ｦ繝ｼ繝・ぅ繝ｪ繝・ぅ (`./utils`)

- `formatDate()` - 譌･莉倥ヵ繧ｩ繝ｼ繝槭ャ繝・
- `generateUUID()` - UUID逕滓・
- `createSuccessResponse()` - 謌仙粥繝ｬ繧ｹ繝昴Φ繧ｹ菴懈・
- `createErrorResponse()` - 繧ｨ繝ｩ繝ｼ繝ｬ繧ｹ繝昴Φ繧ｹ菴懈・
- `validatePasswordStrength()` - 繝代せ繝ｯ繝ｼ繝牙ｼｷ蠎ｦ繝√ぉ繝・け
- `formatFileSize()` - 繝輔ぃ繧､繝ｫ繧ｵ繧､繧ｺ繝輔か繝ｼ繝槭ャ繝・
- `debounce()` - 繝・ヰ繧ｦ繝ｳ繧ｹ髢｢謨ｰ
- `throttle()` - 繧ｹ繝ｭ繝・ヨ繝ｫ髢｢謨ｰ
- 縺昴・莉悶・繝ｦ繝ｼ繝・ぅ繝ｪ繝・ぅ髢｢謨ｰ

## 豕ｨ諢丈ｺ矩・

1. **蠕梧婿莠呈鋤諤ｧ**: 譌｢蟄倥・繧ｳ繝ｼ繝峨↓蠖ｱ髻ｿ繧剃ｸ弱∴縺ｪ縺・ｈ縺・∵里蟄倥・繧､繝ｳ繝昴・繝医ヱ繧ｹ縺ｯ蠑輔″邯壹″繧ｵ繝昴・繝医＆繧後※縺・∪縺吶・

2. **蝙句ｮ牙・諤ｧ**: 蜈ｨ縺ｦ縺ｮ蝙句ｮ夂ｾｩ縺ｯ蜴ｳ蟇・↓螳夂ｾｩ縺輔ｌ縺ｦ縺翫ｊ縲ゝypeScript縺ｮ蝙九メ繧ｧ繝・け繧呈ｴｻ逕ｨ縺ｧ縺阪∪縺吶・

3. **繝舌Μ繝・・繧ｷ繝ｧ繝ｳ**: Zod繧剃ｽｿ逕ｨ縺励◆蝣・欧縺ｪ繝舌Μ繝・・繧ｷ繝ｧ繝ｳ繧ｹ繧ｭ繝ｼ繝槭ｒ謠蝉ｾ帙＠縺ｦ縺・∪縺吶・

4. **繝代ヵ繧ｩ繝ｼ繝槭Φ繧ｹ**: 繝ｦ繝ｼ繝・ぅ繝ｪ繝・ぅ髢｢謨ｰ縺ｯ譛驕ｩ蛹悶＆繧後※縺翫ｊ縲∵悽逡ｪ迺ｰ蠅・〒縺ｮ菴ｿ逕ｨ縺ｫ驕ｩ縺励※縺・∪縺吶・

## 繝ｩ繧､繧ｻ繝ｳ繧ｹ

MIT License 

