@echo off
echo 噫 髢狗匱迺ｰ蠅・ｒ襍ｷ蜍輔＠縺ｾ縺・..

REM 萓晏ｭ倬未菫ゅｒ繧､繝ｳ繧ｹ繝医・繝ｫ
echo 逃 萓晏ｭ倬未菫ゅｒ繧､繝ｳ繧ｹ繝医・繝ｫ荳ｭ...
cd client && npm install
cd ..\server && npm install
cd ..

REM 繝舌ャ繧ｯ繧ｰ繝ｩ繧ｦ繝ｳ繝峨〒繧ｵ繝ｼ繝舌・繧定ｵｷ蜍・
echo 肌 繝舌ャ繧ｯ繧ｨ繝ｳ繝峨し繝ｼ繝舌・繧定ｵｷ蜍穂ｸｭ...
start "Backend Server" cmd /c "cd server && npm run dev"

REM 蟆代＠蠕・▲縺ｦ縺九ｉ繝輔Ο繝ｳ繝医お繝ｳ繝峨ｒ襍ｷ蜍・
timeout /t 3 /nobreak > nul

echo 倹 繝輔Ο繝ｳ繝医お繝ｳ繝峨ｒ襍ｷ蜍穂ｸｭ...
cd client && npm run dev

pause
