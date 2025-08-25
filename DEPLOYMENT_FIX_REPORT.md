# Azure Static Web Apps 縺ｸ縺ｮ繝・・繝ｭ繧､菫ｮ豁｣蝣ｱ蜻・

## 蝠城｡後・蛻・梵

1. **CORS 繧ｨ繝ｩ繝ｼ**: 繝輔Ο繝ｳ繝医お繝ｳ繝峨°繧峨ヰ繝・け繧ｨ繝ｳ繝陰PI縺ｸ縺ｮ繧｢繧ｯ繧ｻ繧ｹ縺ｧCORS繧ｨ繝ｩ繝ｼ縺檎匱逕・
2. **404 繧ｨ繝ｩ繝ｼ**: `/api/auth/login` 繧ｨ繝ｳ繝峨・繧､繝ｳ繝医′蟄伜惠縺励↑縺・
3. **險ｭ螳壹Α繧ｹ**: 螟夜ΚAzure App Service縺ｫ蜷代￠縺ｦ縺・◆API繧貞・驛ｨAPI Functions縺ｫ螟画峩縺悟ｿ・ｦ・

## 螳溯｣・＠縺滉ｿｮ豁｣

### 1. Azure Functions API 繧ｨ繝ｳ繝峨・繧､繝ｳ繝医・菴懈・

- `/api/auth/login/index.ts` - 繝ｭ繧ｰ繧､繝ｳ隱崎ｨｼAPI
- `/api/auth/me/index.ts` - 隱崎ｨｼ迥ｶ諷狗｢ｺ隱喉PI  
- `/api/health/index.ts` - 繝倥Ν繧ｹ繝√ぉ繝・けAPI

### 2. CORS險ｭ螳壹・謾ｹ蝟・

縺吶∋縺ｦ縺ｮAPI Functions縺ｧCORS繝倥ャ繝繝ｼ繧帝←蛻・↓險ｭ螳夲ｼ・
```javascript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};
```

### 3. staticwebapp.config.json 縺ｮ菫ｮ豁｣

螟夜ΚAPI繝ｪ繝繧､繝ｬ繧ｯ繝医ｒ蜑企勁縺励∝・驛ｨAPI Functions繧剃ｽｿ逕ｨ縺吶ｋ繧医≧縺ｫ險ｭ螳壼､画峩縲・

### 4. 繝輔Ο繝ｳ繝医お繝ｳ繝・API險ｭ螳壹・菫ｮ豁｣

Azure Static Web Apps迺ｰ蠅・〒縺ｮAPI URL繧貞酔荳繝峨Γ繧､繝ｳ縺ｫ險ｭ螳夲ｼ・
```typescript
// Azure Static Web Apps 縺ｧ縺ｮAPI Functions繧剃ｽｿ逕ｨ
return window.location.origin; // 蜷後§繝峨Γ繧､繝ｳ縺ｮAPI Functions繧剃ｽｿ逕ｨ
```

### 5. 隱崎ｨｼ繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ霑ｽ蜉

繝・せ繝育畑繝ｦ繝ｼ繧ｶ繝ｼ繧定ｿｽ蜉・・
- admin / password
- niina / 0077
- test / test
- demo / demo

## 谺｡縺ｮ繧ｹ繝・ャ繝・

1. **Azure Static Web Apps 縺ｸ蜀阪ョ繝励Ο繧､**
2. **API Functions縺ｮ蜍穂ｽ懃｢ｺ隱・*
3. **繝ｭ繧ｰ繧､繝ｳ讖溯・縺ｮ繝・せ繝・*

## 繝・せ繝育畑隱崎ｨｼ諠・ｱ

繝ｦ繝ｼ繧ｶ繝ｼ蜷・ `niina`  
繝代せ繝ｯ繝ｼ繝・ `0077`

縺ｾ縺溘・

繝ｦ繝ｼ繧ｶ繝ｼ蜷・ `test`  
繝代せ繝ｯ繝ｼ繝・ `test`
