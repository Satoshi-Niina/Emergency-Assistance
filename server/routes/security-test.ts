import express from 'express';
import { requireAuth, requireAdmin } from '../middleware/security';
import { securityMonitor } from '../middleware/monitoring';

const router = express.Router();

// セキュリティ統計を取得（管理者のみ）
router.get('/stats', requireAdmin, (req, res) => {
  try {
    const stats = securityMonitor.getSecurityStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get security stats'
    });
  }
});

// セキュリティテスト用エンドポイント
router.get('/test', requireAuth, (req, res) => {
  res.json({
    success: true,
    message: 'Security test passed',
    user: {
      id: req.session?.userId,
      role: req.session?.userRole
    },
    timestamp: new Date().toISOString()
  });
});

// パスワード強度テスト
router.post('/test-password-strength', (_req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'Password is required'
    });
  }
  
  const strength = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    common: !['password', '123456', 'qwerty', 'admin'].includes(password.toLowerCase())
  };
  
  const score = Object.values(strength).filter(Boolean).length;
  const isStrong = score >= 5;
  
  res.json({
    success: true,
    strength: {
      ...strength,
      score,
      isStrong,
      message: isStrong ? 'Strong password' : 'Weak password'
    }
  });
});

export default router;
