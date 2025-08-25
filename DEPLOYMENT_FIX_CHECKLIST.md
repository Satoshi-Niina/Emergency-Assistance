# 繝・・繝ｭ繧､繝｡繝ｳ繝井ｿｮ豁｣繝√ぉ繝・け繝ｪ繧ｹ繝・

## 螳滓命縺励◆菫ｮ豁｣

### 1. backend-deploy.yml 縺ｮ菫ｮ豁｣
- 笨・譛蟆上し繝ｼ繝舌・逕滓・繧呈彫蟒・
- 笨・譛ｬ譚･縺ｮAPI繧ｳ繝ｼ繝牙・菴薙ｒ繝・・繝ｭ繧､縺吶ｋ繧医≧縺ｫ螟画峩
- 笨・繧ｵ繝ｼ繝舌・縲∝・譛峨ヵ繧｡繧､繝ｫ縲√リ繝ｬ繝・ず繝吶・繧ｹ縲√・繧､繧ｰ繝ｬ繝ｼ繧ｷ繝ｧ繝ｳ繝輔ぃ繧､繝ｫ繧貞性繧螳悟・縺ｪ繝代ャ繧ｱ繝ｼ繧ｸ蛹・
- 笨・npm run build 縺ｧTypeScript繧ｳ繝ｳ繝代う繝ｫ繧貞ｮ溯｡・

### 2. DB逍朱夂｢ｺ隱阪お繝ｳ繝峨・繧､繝ｳ繝医・螳溯｣・
- 笨・`/db-ping` 繧ｨ繝ｳ繝峨・繧､繝ｳ繝医ｒ霑ｽ蜉
- 笨・`SELECT NOW()` 繧ｯ繧ｨ繝ｪ縺ｧDB謗･邯夂｢ｺ隱・
- 笨・繧ｨ繝ｩ繝ｼ蜃ｦ逅・→繝ｬ繧ｹ繝昴Φ繧ｹ隧ｳ邏ｰ諠・ｱ繧貞性繧

### 3. 繝・・繧ｿ繝吶・繧ｹ險ｭ螳壹・謾ｹ蝟・
- 笨・Azure PostgreSQL蟇ｾ蠢懊・SSL險ｭ螳・
- 笨・譛ｬ逡ｪ迺ｰ蠅・畑縺ｮprepare: false險ｭ螳・
- 笨・迺ｰ蠅・､画焚縺ｮ隧ｳ邏ｰ繝ｭ繧ｰ蜃ｺ蜉・

### 4. 繝輔Ο繝ｳ繝医お繝ｳ繝芽ｨｭ螳壹・謾ｹ蝟・
- 笨・Azure Static Web Apps 竊・Azure App Service 縺ｮ豁｣縺励＞謗･邯夊ｨｭ螳・
- 笨・譛ｬ逡ｪ迺ｰ蠅・畑縺ｮ VITE_API_BASE_URL 險ｭ螳・
- 笨・蝙句ｮ夂ｾｩ繝輔ぃ繧､繝ｫ (vite-env.d.ts) 繧定ｿｽ蜉

## Azure App Settings 縺ｧ險ｭ螳壹′蠢・ｦ√↑迺ｰ蠅・､画焚

### 繝舌ャ繧ｯ繧ｨ繝ｳ繝・(emergency-backend-webapp)
```
DATABASE_URL=postgresql://username:password@servername.postgres.database.azure.com:5432/databasename?sslmode=require
OPENAI_API_KEY=your_openai_api_key
NODE_ENV=production
SESSION_SECRET=emergency-assistance-session-secret-production-2024
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net
```

### 繝輔Ο繝ｳ繝医お繝ｳ繝・(Static Web Apps)
```
VITE_API_BASE_URL=https://emergency-backend-webapp.azurewebsites.net
```

## 逍朱夂｢ｺ隱咲畑繧ｨ繝ｳ繝峨・繧､繝ｳ繝・

### 1. DB逍朱夂｢ｺ隱・
```
GET https://emergency-backend-webapp.azurewebsites.net/db-ping
```

### 2. API蝓ｺ譛ｬ繝倥Ν繧ｹ繝√ぉ繝・け
```
GET https://emergency-backend-webapp.azurewebsites.net/health
GET https://emergency-backend-webapp.azurewebsites.net/api/health
```

### 3. 繝・・繧ｿ繝吶・繧ｹ繝√ぉ繝・け
```
GET https://emergency-backend-webapp.azurewebsites.net/api/db-check
```

## 繝・・繝ｭ繧､蠕後・遒ｺ隱肴焔鬆・

1. **繝舌ャ繧ｯ繧ｨ繝ｳ繝陰PI遒ｺ隱・*
   ```bash
   curl https://emergency-backend-webapp.azurewebsites.net/health
   curl https://emergency-backend-webapp.azurewebsites.net/db-ping
   ```

2. **繝輔Ο繝ｳ繝医お繝ｳ繝臥｢ｺ隱・*
   - Azure Static Web Apps 縺ｫ繧｢繧ｯ繧ｻ繧ｹ
   - 繝悶Λ繧ｦ繧ｶ縺ｮ髢狗匱閠・ヤ繝ｼ繝ｫ縺ｧAPI謗･邯壹Ο繧ｰ繧堤｢ｺ隱・

3. **CORS險ｭ螳夂｢ｺ隱・*
   - 繝輔Ο繝ｳ繝医お繝ｳ繝峨°繧峨ヰ繝・け繧ｨ繝ｳ繝陰PI縺ｸ縺ｮ繝ｪ繧ｯ繧ｨ繧ｹ繝医′豁｣蟶ｸ縺ｫ騾壹ｋ縺狗｢ｺ隱・

## 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ

### 繝・・繧ｿ繝吶・繧ｹ謗･邯壹お繝ｩ繝ｼ縺ｮ蝣ｴ蜷・
1. DATABASE_URL 縺ｮ險ｭ螳壹ｒ遒ｺ隱・
2. PostgreSQL繧ｵ繝ｼ繝舌・縺ｮ繝輔ぃ繧､繧｢繧ｦ繧ｩ繝ｼ繝ｫ險ｭ螳壹ｒ遒ｺ隱・
3. SSL險ｼ譏取嶌縺ｮ險ｭ螳壹ｒ遒ｺ隱・

### API謗･邯壹お繝ｩ繝ｼ縺ｮ蝣ｴ蜷・
1. CORS險ｭ螳壹ｒ遒ｺ隱・
2. VITE_API_BASE_URL 縺ｮ險ｭ螳壹ｒ遒ｺ隱・
3. Azure App Service 縺ｮ襍ｷ蜍慕憾豕√ｒ遒ｺ隱・

### 迺ｰ蠅・､画焚險ｭ螳壹・遒ｺ隱・
1. Azure Portal 竊・App Services 竊・險ｭ螳・竊・讒区・
2. 蠢・ｦ√↑迺ｰ蠅・､画焚縺後☆縺ｹ縺ｦ險ｭ螳壹＆繧後※縺・ｋ縺狗｢ｺ隱・
