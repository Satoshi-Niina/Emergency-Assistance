import fs from 'fs';
import path from 'path';
class SecurityMonitor {
    logFile;
    maxLogSize;
    suspiciousIPs;
    failedAttempts;
    lastCleanup;
    constructor() {
        this.logFile = path.join(process.cwd(), 'logs', 'security.log');
        this.maxLogSize = 10 * 1024 * 1024; // 10MB
        this.suspiciousIPs = new Set();
        this.failedAttempts = new Map();
        this.lastCleanup = Date.now();
        // ログディレクトリを作成
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }
    // セキュリティイベントをログに記録
    logEvent(event, details, req) {
        const securityEvent = {
            timestamp: new Date().toISOString(),
            event,
            ip: this.getClientIP(req),
            userAgent: req.get('User-Agent') || 'unknown',
            url: req.originalUrl,
            method: req.method,
            details: this.sanitizeDetails(details),
        };
        // コンソールに出力
        console.log(`🔒 SECURITY: ${event}`, securityEvent);
        // ファイルに記録
        this.writeToLogFile(securityEvent);
        // 疑わしい活動をチェック
        this.checkSuspiciousActivity(securityEvent);
        // 定期的にクリーンアップ
        this.cleanup();
    }
    // クライアントIPを取得
    getClientIP(req) {
        return (req.ip ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection?.socket?.remoteAddress ||
            'unknown');
    }
    // 機密情報を除去
    sanitizeDetails(details) {
        const sanitized = { ...details };
        // 機密情報を除去
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        }
        return sanitized;
    }
    // ログファイルに書き込み
    writeToLogFile(event) {
        try {
            const logEntry = JSON.stringify(event) + '\n';
            fs.appendFileSync(this.logFile, logEntry);
            // ログファイルサイズをチェック
            const stats = fs.statSync(this.logFile);
            if (stats.size > this.maxLogSize) {
                this.rotateLogFile();
            }
        }
        catch (error) {
            console.error('Failed to write security log:', error);
        }
    }
    // ログファイルをローテート
    rotateLogFile() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const rotatedFile = this.logFile.replace('.log', `-${timestamp}.log`);
            fs.renameSync(this.logFile, rotatedFile);
            // 古いログファイルを削除（30日以上前）
            this.cleanupOldLogs();
        }
        catch (error) {
            console.error('Failed to rotate log file:', error);
        }
    }
    // 古いログファイルを削除
    cleanupOldLogs() {
        try {
            const logDir = path.dirname(this.logFile);
            const files = fs.readdirSync(logDir);
            const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
            files.forEach(file => {
                if (file.startsWith('security-') && file.endsWith('.log')) {
                    const filePath = path.join(logDir, file);
                    const stats = fs.statSync(filePath);
                    if (stats.mtime.getTime() < thirtyDaysAgo) {
                        fs.unlinkSync(filePath);
                    }
                }
            });
        }
        catch (error) {
            console.error('Failed to cleanup old logs:', error);
        }
    }
    // 疑わしい活動をチェック
    checkSuspiciousActivity(event) {
        const ip = event.ip;
        // 失敗したログイン試行をカウント
        if (event.event.includes('LOGIN_FAILED')) {
            const attempts = this.failedAttempts.get(ip) || 0;
            this.failedAttempts.set(ip, attempts + 1);
            // 5回以上失敗した場合は疑わしいIPとしてマーク
            if (attempts + 1 >= 5) {
                this.suspiciousIPs.add(ip);
                console.log(`🚨 SUSPICIOUS IP DETECTED: ${ip} - Multiple failed login attempts`);
            }
        }
        // 成功したログインで失敗カウントをリセット
        if (event.event.includes('LOGIN_SUCCESS')) {
            this.failedAttempts.delete(ip);
            this.suspiciousIPs.delete(ip);
        }
    }
    // 定期的なクリーンアップ
    cleanup() {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        if (now - this.lastCleanup > oneHour) {
            // 失敗カウントをリセット（1時間ごと）
            this.failedAttempts.clear();
            this.lastCleanup = now;
        }
    }
    // 疑わしいIPかどうかをチェック
    isSuspiciousIP(ip) {
        return this.suspiciousIPs.has(ip);
    }
    // セキュリティ統計を取得
    getSecurityStats() {
        return {
            suspiciousIPs: Array.from(this.suspiciousIPs),
            failedAttempts: Object.fromEntries(this.failedAttempts),
            lastCleanup: new Date(this.lastCleanup).toISOString(),
        };
    }
}
// シングルトンインスタンス
export const securityMonitor = new SecurityMonitor();
// セキュリティ監視ミドルウェア
export const securityMonitoring = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    // 疑わしいIPからのアクセスをブロック
    if (securityMonitor.isSuspiciousIP(ip)) {
        securityMonitor.logEvent('BLOCKED_SUSPICIOUS_IP', { ip }, req);
        return res.status(403).json({
            success: false,
            error: 'アクセスがブロックされました',
        });
    }
    next();
};
// セキュリティイベントログミドルウェア
export const logSecurityEvent = (event, details) => {
    return (req, res, next) => {
        securityMonitor.logEvent(event, details, req);
        next();
    };
};
