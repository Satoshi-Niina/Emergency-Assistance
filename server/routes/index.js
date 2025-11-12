"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = registerRoutes;
const emergency_flow_js_1 = __importDefault(require("./emergency-flow.js"));
const chat_js_1 = require("./chat.js");
const tech_support_js_1 = require("./tech-support.js");
const troubleshooting_js_1 = __importDefault(require("./troubleshooting.js"));
const users_js_1 = require("./users.js");
const knowledge_base_js_1 = require("./knowledge-base.js");
const sync_routes_js_1 = require("./sync-routes.js");
const data_processor_js_1 = __importDefault(require("./data-processor.js"));
const flow_generator_js_1 = __importDefault(require("./flow-generator.js"));
const search_js_1 = require("./search.js");
const auth_js_1 = __importDefault(require("./auth.js"));
const settings_js_1 = __importDefault(require("./settings.js"));
// machinesRouterはapp.tsで直接マウントされているため、ここでは除外
const image_storage_js_1 = __importDefault(require("./image-storage.js"));
const system_check_js_1 = __importDefault(require("./system-check.js"));
const machines_js_1 = __importDefault(require("./machines.js"));
const flows_js_1 = require("./flows.js");
const files_js_1 = __importDefault(require("./files.js"));
const reports_js_1 = __importDefault(require("./reports.js"));
const storage_unified_js_1 = __importDefault(require("./storage-unified.js"));
const health_js_1 = require("./health.js");
const ping_js_1 = __importDefault(require("./ping.js"));
const _diag_js_1 = __importDefault(require("./_diag.js"));
const history_js_1 = require("./history.js");
function registerRoutes(app) {
    // API routes
    app.use('/api/health', health_js_1.healthRouter);
    app.use('/api/ping', ping_js_1.default);
    app.use('/api/storage', storage_unified_js_1.default);
    app.use('/api/auth', auth_js_1.default);
    app.use('/api/settings', settings_js_1.default);
    app.use('/api/history', history_js_1.historyRouter);
    // 診断用エンドポイント
    (0, _diag_js_1.default)(app);
    // registerChatRoutes(app); // 一時的に無効化
    (0, chat_js_1.registerChatRoutes)(app);
    app.use('/api/flows', flows_js_1.flowsRouter);
    app.use('/api/emergency-flow', emergency_flow_js_1.default);
    app.use('/api/tech-support', tech_support_js_1.techSupportRouter);
    app.use('/api/troubleshooting', troubleshooting_js_1.default);
    app.use('/api/users', users_js_1.usersRouter);
    // Register other route modules
    (0, knowledge_base_js_1.registerKnowledgeBaseRoutes)(app);
    (0, sync_routes_js_1.registerSyncRoutes)(app);
    app.use('/api/data-processor', data_processor_js_1.default);
    app.use('/api/flow-generator', flow_generator_js_1.default);
    (0, search_js_1.registerSearchRoutes)(app);
    // machinesRouterはapp.tsで直接マウントされているため、ここでは除外
    app.use('/api/images', image_storage_js_1.default);
    app.use('/api/system-check', system_check_js_1.default);
    app.use('/api/machines', machines_js_1.default);
    app.use('/api/files', files_js_1.default);
    app.use('/api/reports', reports_js_1.default);
    console.log('[BOOT] routes mounted');
}
