// 環境自動判定設定
window.CONFIG = (() => {
    const isLocal = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';
    
    if (isLocal) {
        return {
            "API_BASE_URL": "http://localhost:8081/api"
        };
    } else {
        return {
            "API_BASE_URL": "/api"
        };
    }
})();
