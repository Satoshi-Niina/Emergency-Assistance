# 噫 譛ｬ逡ｪ迺ｰ蠅・ヵ繝ｭ繝ｳ繝医・繝舌ャ繧ｯ騾｣謳ｺ螳悟・險ｭ螳壹ぎ繧､繝・

## 笨・迴ｾ蝨ｨ縺ｮ迥ｶ豕・
- **繝舌ャ繧ｯ繧ｨ繝ｳ繝・*: GitHub Actions縺ｧ繝・・繝ｭ繧､險ｭ螳壼ｮ御ｺ・
- **繝輔Ο繝ｳ繝医お繝ｳ繝・*: GitHub Actions縺ｧ繝・・繝ｭ繧､險ｭ螳壼ｮ御ｺ・
- **謗･邯夊ｨｭ螳・*: 繧ｳ繝ｼ繝牙・縺ｯ螳御ｺ・、zure險ｭ螳壹′蠢・ｦ・

## 肌 Azure App Service (繝舌ャ繧ｯ繧ｨ繝ｳ繝・ 蠢・郁ｨｭ螳・

### 1. Azure Portal 縺ｧ繝舌ャ繧ｯ繧ｨ繝ｳ繝芽ｨｭ螳・
1. Azure Portal 竊・App Services 竊・`emergency-backend-webapp`
2. 險ｭ螳・竊・讒区・ 竊・繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ險ｭ螳・

**蠢・育腸蠅・､画焚**:
```bash
# 繝・・繧ｿ繝吶・繧ｹ謗･邯・(譛驥崎ｦ・
DATABASE_URL=postgresql://username:password@servername.postgres.database.azure.com:5432/databasename?sslmode=require

# OpenAI API (讖溯・蜍穂ｽ懊↓蠢・ｦ・
OPENAI_API_KEY=your_actual_openai_api_key

# 繧ｻ繝・す繝ｧ繝ｳ險ｭ螳・(隱崎ｨｼ縺ｫ蠢・ｦ・
SESSION_SECRET=emergency-assistance-session-secret-production-2024

# 繝輔Ο繝ｳ繝医お繝ｳ繝蔚RL (CORS險ｭ螳壹↓蠢・ｦ・
FRONTEND_URL=https://witty-river-012f39e00.1.azurestaticapps.net

# 迺ｰ蠅・ｨｭ螳・
NODE_ENV=production
PORT=3001
LANG=ja_JP.UTF-8
LC_ALL=ja_JP.UTF-8
NODE_OPTIONS=--max-old-space-size=4096
```

### 2. PostgreSQL 繝・・繧ｿ繝吶・繧ｹ險ｭ螳・
**Azure Database for PostgreSQL 縺悟ｿ・ｦ・*:
- 繧ｵ繝ｼ繝舌・蜷・ `emergency-postgres-server.postgres.database.azure.com`
- 繝・・繧ｿ繝吶・繧ｹ蜷・ `emergency_assistance`
- SSL謗･邯・ 蠢・・(`sslmode=require`)

## 倹 Azure Static Web Apps (繝輔Ο繝ｳ繝医お繝ｳ繝・ 險ｭ螳・

### 閾ｪ蜍戊ｨｭ螳・(GitHub Actions邨檎罰)
- `VITE_API_BASE_URL=https://emergency-backend-webapp.azurewebsites.net`
- 繝薙Ν繝画凾縺ｫ閾ｪ蜍輔〒險ｭ螳壹＆繧後ｋ

## 迫 騾｣謳ｺ繝・せ繝域焔鬆・

### 1. 繝・・繝ｭ繧､螳御ｺ・｢ｺ隱・
```bash
# 繝舌ャ繧ｯ繧ｨ繝ｳ繝峨・繝ｫ繧ｹ繝√ぉ繝・け
curl https://emergency-backend-webapp.azurewebsites.net/health

# DB逍朱夂｢ｺ隱・
curl https://emergency-backend-webapp.azurewebsites.net/db-ping

# 繝輔Ο繝ｳ繝医お繝ｳ繝峨い繧ｯ繧ｻ繧ｹ遒ｺ隱・
curl https://witty-river-012f39e00.1.azurestaticapps.net
```

### 2. 螳悟・騾｣謳ｺ繝・せ繝・
```powershell
# PowerShell繧ｹ繧ｯ繝ｪ繝励ヨ螳溯｡・
.\test-azure-deployment.ps1
```

## 笞・・繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ

### DATABASE_URL 繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷・
1. Azure Database for PostgreSQL 縺御ｽ懈・貂医∩縺狗｢ｺ隱・
2. 繝輔ぃ繧､繧｢繧ｦ繧ｩ繝ｼ繝ｫ險ｭ螳壹〒Azure 繧ｵ繝ｼ繝薙せ繧定ｨｱ蜿ｯ
3. SSL險ｼ譏取嶌險ｭ螳夂｢ｺ隱・

### CORS 繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷・
1. FRONTEND_URL 縺梧ｭ｣縺励￥險ｭ螳壹＆繧後※縺・ｋ縺狗｢ｺ隱・
2. 繝舌ャ繧ｯ繧ｨ繝ｳ繝峨・CORS險ｭ螳夂｢ｺ隱・

### API謗･邯壹お繝ｩ繝ｼ縺ｮ蝣ｴ蜷・
1. 繝輔Ο繝ｳ繝医お繝ｳ繝峨・VITE_API_BASE_URL遒ｺ隱・
2. 繝阪ャ繝医Ρ繝ｼ繧ｯ險ｭ螳夂｢ｺ隱・

## 識 騾｣謳ｺ螳御ｺ・・蛻､螳壼渕貅・

笨・**騾｣謳ｺ謌仙粥縺ｮ遒ｺ隱堺ｺ矩・*:
1. 繝舌ャ繧ｯ繧ｨ繝ｳ繝峨・繝ｫ繧ｹ繝√ぉ繝・け謌仙粥
2. DB逍朱夂｢ｺ隱肴・蜉・
3. 繝輔Ο繝ｳ繝医お繝ｳ繝峨い繧ｯ繧ｻ繧ｹ謌仙粥
4. CORS險ｭ螳夂｢ｺ隱肴・蜉・
5. 繝輔Ο繝ｳ繝医お繝ｳ繝峨°繧陰PI繝ｪ繧ｯ繧ｨ繧ｹ繝域・蜉・

## 搭 險ｭ螳壹メ繧ｧ繝・け繝ｪ繧ｹ繝・

- [ ] Azure Database for PostgreSQL 菴懈・
- [ ] DATABASE_URL 險ｭ螳・
- [ ] OPENAI_API_KEY 險ｭ螳・
- [ ] SESSION_SECRET 險ｭ螳・
- [ ] FRONTEND_URL 險ｭ螳・
- [ ] 繝舌ャ繧ｯ繧ｨ繝ｳ繝峨ョ繝励Ο繧､螳御ｺ・
- [ ] 繝輔Ο繝ｳ繝医お繝ｳ繝峨ョ繝励Ο繧､螳御ｺ・
- [ ] 繝倥Ν繧ｹ繝√ぉ繝・け謌仙粥
- [ ] DB逍朱夂｢ｺ隱肴・蜉・
- [ ] 繧ｨ繝ｳ繝峨ヤ繝ｼ繧ｨ繝ｳ繝峨ユ繧ｹ繝域・蜉・

**縺吶∋縺ｦ螳御ｺ・☆繧後・縲∵悽逡ｪ迺ｰ蠅・〒繝輔Ο繝ｳ繝医・繝舌ャ繧ｯ螳悟・騾｣謳ｺ・・* 脂
