# 譛ｬ逡ｪ繝・・繝ｭ繧､逕ｨ繧､繝ｳ繝昴・繝井ｿｮ豁｣繧ｬ繧､繝・

## 蠢・ｦ√↑菫ｮ豁｣邂・園

### 1. Server 蛛ｴ縺ｮ菫ｮ豁｣

```typescript
// 菫ｮ豁｣蜑・
import { schema } from "../shared/schema.js";
import {
  insertMessageSchema,
  insertMediaSchema,
  insertChatSchema,
  messages,
} from "../../shared/schema.js";

// 菫ｮ豁｣蠕・
import {
  schema,
  insertMessageSchema,
  insertMediaSchema,
  insertChatSchema,
  messages,
} from "@emergency-assistance/shared";
```

### 2. Client 蛛ｴ縺ｮ菫ｮ豁｣

```typescript
// 菫ｮ豁｣蜑・
import { LoginCredentials } from "@shared/schema";
import { Message } from "@shared/schema";

// 菫ｮ豁｣蠕・
import { LoginCredentials, Message } from "@emergency-assistance/shared";
```

### 3. package.json 菫ｮ豁｣

shared 繝代ャ繧ｱ繝ｼ繧ｸ繧帝←蛻・↓蜿ら・縺吶ｋ繧医≧菫ｮ豁｣:

```json
{
  "dependencies": {
    "@emergency-assistance/shared": "file:../shared"
  }
}
```

### 4. tsconfig.json 菫ｮ豁｣

```json
{
  "compilerOptions": {
    "paths": {
      "@emergency-assistance/shared/*": ["../shared/src/*"],
      "@emergency-assistance/shared": ["../shared/src/index"]
    }
  }
}
```

### 5. Vite.config.ts 菫ｮ豁｣・・lient・・

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@emergency-assistance/shared': path.resolve(__dirname, '../shared/src'),
  }
}
```

## 繧ｯ繝ｩ繧ｦ繝峨ョ繝励Ο繧､譎ゅ・蟇ｾ蠢・

### 譛ｬ逡ｪ迺ｰ蠅・〒縺ｯ莉･荳九′謗ｨ螂ｨ:

1. **shared 繝代ャ繧ｱ繝ｼ繧ｸ縺ｮ莠句燕繝薙Ν繝・*
2. **Docker 繧ｳ繝ｳ繝・リ蛹匁凾縺ｮ COPY 繧ｳ繝槭Φ繝芽ｪｿ謨ｴ**
3. **迺ｰ蠅・､画焚縺ｫ繧医ｋ API 繧ｨ繝ｳ繝峨・繧､繝ｳ繝郁ｨｭ螳・*
