import * as express from 'express';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as util from 'util';
import { storage } from "./storage.js";

const scryptAsync = util.promisify(crypto.scrypt);

export const authRouter = express.Router();

// 繝ｭ繧ｰ繧､繝ｳ
authRouter.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪→繝代せ繝ｯ繝ｼ繝峨′蠢・ｦ√〒縺・ });
        }

        const user = await storage.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: '繝ｦ繝ｼ繧ｶ繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: '繝代せ繝ｯ繝ｼ繝峨′豁｣縺励￥縺ゅｊ縺ｾ縺帙ｓ' });
        }

        // 繧ｻ繝・す繝ｧ繝ｳ縺ｫ繝ｦ繝ｼ繧ｶ繝ｼ諠・ｱ繧剃ｿ晏ｭ・
        req.session.userId = user.id;
        // req.session縺ｮ蝙九お繝ｩ繝ｼ繧貞梛繧｢繧ｵ繝ｼ繧ｷ繝ｧ繝ｳ縺ｧ蝗樣∩
        (req.session as any).username = user.username;
        (req.session as any).role = user.role;

        res.json({
            message: '繝ｭ繧ｰ繧､繝ｳ謌仙粥',
            user: {
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                role: user.role
            }
        });
    } catch (error) {
        console.error('繝ｭ繧ｰ繧､繝ｳ繧ｨ繝ｩ繝ｼ:', error);
        res.status(500).json({ error: '繝ｭ繧ｰ繧､繝ｳ蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆' });
    }
});

// 繝ｭ繧ｰ繧｢繧ｦ繝・
authRouter.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('繧ｻ繝・す繝ｧ繝ｳ蜑企勁繧ｨ繝ｩ繝ｼ:', err);
            return res.status(500).json({ error: '繝ｭ繧ｰ繧｢繧ｦ繝亥・逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆' });
        }
        res.json({ message: '繝ｭ繧ｰ繧｢繧ｦ繝域・蜉・ });
    });
});

// 繝ｦ繝ｼ繧ｶ繝ｼ逋ｻ骭ｲ
authRouter.post('/register', async (req, res) => {
    try {
        const { username, password, display_name, role = 'employee' } = req.body;

        if (!username || !password || !display_name) {
            return res.status(400).json({ error: '繝ｦ繝ｼ繧ｶ繝ｼ蜷阪√ヱ繧ｹ繝ｯ繝ｼ繝峨∬｡ｨ遉ｺ蜷阪′蠢・ｦ√〒縺・ });
        }

        // 譌｢蟄倥Θ繝ｼ繧ｶ繝ｼ縺ｮ遒ｺ隱・
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: '縺薙・繝ｦ繝ｼ繧ｶ繝ｼ蜷阪・譌｢縺ｫ菴ｿ逕ｨ縺輔ｌ縺ｦ縺・∪縺・ });
        }

        // 繝代せ繝ｯ繝ｼ繝峨・繝上ャ繧ｷ繝･蛹・
        const hashedPassword = await bcrypt.hash(password, 10);

        // 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ菴懈・
        const newUser = await storage.createUser({
            username,
            password: hashedPassword,
            display_name,
            role
        });

        res.status(201).json({
            message: '繝ｦ繝ｼ繧ｶ繝ｼ逋ｻ骭ｲ謌仙粥',
            user: {
                id: newUser.id,
                username: newUser.username,
                display_name: newUser.display_name,
                role: newUser.role
            }
        });
    } catch (error) {
        console.error('繝ｦ繝ｼ繧ｶ繝ｼ逋ｻ骭ｲ繧ｨ繝ｩ繝ｼ:', error);
        res.status(500).json({ error: '繝ｦ繝ｼ繧ｶ繝ｼ逋ｻ骭ｲ蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆' });
    }
});

// 繧ｻ繝・す繝ｧ繝ｳ遒ｺ隱・
authRouter.get('/session', (req, res) => {
    if (req.session.userId) {
        res.json({
            isAuthenticated: true,
            user: {
                id: req.session.userId,
                username: (req.session as any).username,
                role: (req.session as any).role
            }
        });
    } else {
        res.json({ isAuthenticated: false });
    }
});

// 繝代せ繝ｯ繝ｼ繝牙､画峩
authRouter.post('/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.session.userId;

        if (!userId) {
            return res.status(401).json({ error: '繝ｭ繧ｰ繧､繝ｳ縺悟ｿ・ｦ√〒縺・ });
        }

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: '迴ｾ蝨ｨ縺ｮ繝代せ繝ｯ繝ｼ繝峨→譁ｰ縺励＞繝代せ繝ｯ繝ｼ繝峨′蠢・ｦ√〒縺・ });
        }

        const user = await storage.getUser(userId);
        if (!user) {
            return res.status(404).json({ error: '繝ｦ繝ｼ繧ｶ繝ｼ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
        }

        // 迴ｾ蝨ｨ縺ｮ繝代せ繝ｯ繝ｼ繝峨・遒ｺ隱・
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: '迴ｾ蝨ｨ縺ｮ繝代せ繝ｯ繝ｼ繝峨′豁｣縺励￥縺ゅｊ縺ｾ縺帙ｓ' });
        }

        // 譁ｰ縺励＞繝代せ繝ｯ繝ｼ繝峨・繝上ャ繧ｷ繝･蛹・
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // 繝代せ繝ｯ繝ｼ繝峨・譖ｴ譁ｰ
        await storage.updateUser(userId, { password: hashedNewPassword });

        res.json({ message: '繝代せ繝ｯ繝ｼ繝牙､画峩謌仙粥' });
    } catch (error) {
        console.error('繝代せ繝ｯ繝ｼ繝牙､画峩繧ｨ繝ｩ繝ｼ:', error);
        res.status(500).json({ error: '繝代せ繝ｯ繝ｼ繝牙､画峩蜃ｦ逅・ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆' });
    }
});

// Setup auth function for index.build.ts
export const setupAuth = (app: any) => {
    app.use('/api/auth', authRouter);
}; 