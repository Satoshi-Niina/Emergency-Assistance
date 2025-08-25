#!/bin/bash

echo "・ｽ・ｽ 髢狗匱迺ｰ蠅・ｒ襍ｷ蜍輔＠縺ｾ縺・.."

# 萓晏ｭ倬未菫ゅｒ繧､繝ｳ繧ｹ繝医・繝ｫ
echo "逃 萓晏ｭ倬未菫ゅｒ繧､繝ｳ繧ｹ繝医・繝ｫ荳ｭ..."
cd client && npm install
cd ../server && npm install
cd ..

# 繝舌ャ繧ｯ繧ｰ繝ｩ繧ｦ繝ｳ繝峨〒繧ｵ繝ｼ繝舌・繧定ｵｷ蜍・
echo "肌 繝舌ャ繧ｯ繧ｨ繝ｳ繝峨し繝ｼ繝舌・繧定ｵｷ蜍穂ｸｭ..."
cd server && npm run dev &
SERVER_PID=$!

# 蟆代＠蠕・▲縺ｦ縺九ｉ繝輔Ο繝ｳ繝医お繝ｳ繝峨ｒ襍ｷ蜍・
sleep 3

echo "倹 繝輔Ο繝ｳ繝医お繝ｳ繝峨ｒ襍ｷ蜍穂ｸｭ..."
cd client && npm run dev

# 繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・
echo "ｧｹ 繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・荳ｭ..."
kill $SERVER_PID
