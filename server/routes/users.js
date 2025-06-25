"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = void 0;
var express_1 = require("express");
var schema_1 = require("@shared/schema");
var db_1 = require("../db");
var drizzle_orm_1 = require("drizzle-orm");
var router = (0, express_1.Router)();
// ✅ ユーザー一覧取得
router.get('/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var allUsers, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db_1.db.query.users.findMany({
                        columns: {
                            id: true,
                            username: true,
                            display_name: true,
                            role: true,
                            department: true
                        }
                    })];
            case 1:
                allUsers = _a.sent();
                res.json(allUsers);
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error("Error fetching users:", error_1);
                return [2 /*return*/, res.status(500).json({ message: "Internal server error" })];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ユーザー情報を更新 - ルーティングを明確化
router.patch('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id_1, _a, username, display_name, role, department, password, testQuery, dbError_1, allUsers, existingUser, queryError_1, directResult, sqlError_1, manualMatch, finalUser, updateData, bcrypt, _b, updatedUser, error_2;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                console.log("[DEBUG] PATCH /users/:id \u30A8\u30F3\u30C9\u30DD\u30A4\u30F3\u30C8\u304C\u547C\u3070\u308C\u307E\u3057\u305F");
                console.log("[DEBUG] req.method: ".concat(req.method));
                console.log("[DEBUG] req.originalUrl: ".concat(req.originalUrl));
                console.log("[DEBUG] req.path: ".concat(req.path));
                console.log("[DEBUG] req.baseUrl: ".concat(req.baseUrl));
                _e.label = 1;
            case 1:
                _e.trys.push([1, 19, , 20]);
                id_1 = req.params.id;
                _a = req.body, username = _a.username, display_name = _a.display_name, role = _a.role, department = _a.department, password = _a.password;
                console.log("[DEBUG] \u30E6\u30FC\u30B6\u30FC\u66F4\u65B0\u30EA\u30AF\u30A8\u30B9\u30C8: ID=\"".concat(id_1, "\" (type: ").concat(typeof id_1, ")"));
                console.log("[DEBUG] \u30EA\u30AF\u30A8\u30B9\u30C8\u30DC\u30C7\u30A3:", { username: username, display_name: display_name, role: role, department: department, hasPassword: !!password });
                console.log("[DEBUG] Full request params:", req.params);
                console.log("[DEBUG] Full request URL:", req.url);
                console.log("[DEBUG] \u30BB\u30C3\u30B7\u30E7\u30F3\u60C5\u5831:", {
                    sessionUserId: (_c = req.session) === null || _c === void 0 ? void 0 : _c.userId,
                    sessionUserRole: (_d = req.session) === null || _d === void 0 ? void 0 : _d.userRole,
                    hasSession: !!req.session
                });
                // バリデーション
                if (!username || !display_name) {
                    console.log("[DEBUG] \u30D0\u30EA\u30C7\u30FC\u30B7\u30E7\u30F3\u5931\u6557: username=\"".concat(username, "\", display_name=\"").concat(display_name, "\""));
                    return [2 /*return*/, res.status(400).json({ message: "ユーザー名と表示名は必須です" })];
                }
                _e.label = 2;
            case 2:
                _e.trys.push([2, 4, , 5]);
                return [4 /*yield*/, db_1.db.execute('SELECT 1 as test')];
            case 3:
                testQuery = _e.sent();
                console.log("[DEBUG] \u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u63A5\u7D9A\u30C6\u30B9\u30C8\u6210\u529F:", testQuery);
                return [3 /*break*/, 5];
            case 4:
                dbError_1 = _e.sent();
                console.error("[ERROR] \u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u63A5\u7D9A\u5931\u6557:", dbError_1);
                return [2 /*return*/, res.status(500).json({ message: "データベース接続エラー" })];
            case 5: return [4 /*yield*/, db_1.db.query.users.findMany()];
            case 6:
                allUsers = _e.sent();
                console.log("[DEBUG] \u5168\u30E6\u30FC\u30B6\u30FC\u4E00\u89A7 (".concat(allUsers.length, "\u4EF6):"), allUsers.map(function (u) { return ({
                    id: u.id,
                    username: u.username,
                    idType: typeof u.id,
                    idLength: u.id ? u.id.length : 'null',
                    exactMatch: u.id === id_1
                }); }));
                // IDのフォーマットを確認
                console.log("[DEBUG] \u691C\u7D22\u5BFE\u8C61ID: \"".concat(id_1, "\" (length: ").concat(id_1.length, ", type: ").concat(typeof id_1, ")"));
                console.log("[DEBUG] ID bytes:", Buffer.from(id_1, 'utf8'));
                // 異なる検索方法を試行
                console.log("[DEBUG] \u691C\u7D22\u30AF\u30A8\u30EA\u3092\u5B9F\u884C\u4E2D...");
                existingUser = void 0;
                _e.label = 7;
            case 7:
                _e.trys.push([7, 9, , 10]);
                return [4 /*yield*/, db_1.db.query.users.findFirst({
                        where: (0, drizzle_orm_1.eq)(schema_1.users.id, id_1)
                    })];
            case 8:
                existingUser = _e.sent();
                return [3 /*break*/, 10];
            case 9:
                queryError_1 = _e.sent();
                console.error("[ERROR] Drizzle\u691C\u7D22\u30A8\u30E9\u30FC:", queryError_1);
                existingUser = null;
                return [3 /*break*/, 10];
            case 10:
                console.log("[DEBUG] \u57FA\u672C\u691C\u7D22\u7D50\u679C:", existingUser ? {
                    id: existingUser.id,
                    username: existingUser.username,
                    exactMatch: existingUser.id === id_1,
                    byteComparison: Buffer.from(existingUser.id, 'utf8').equals(Buffer.from(id_1, 'utf8'))
                } : 'null');
                _e.label = 11;
            case 11:
                _e.trys.push([11, 13, , 14]);
                return [4 /*yield*/, db_1.db.execute((0, drizzle_orm_1.sql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["SELECT * FROM users WHERE id = ", ""], ["SELECT * FROM users WHERE id = ", ""])), id_1))];
            case 12:
                directResult = _e.sent();
                console.log("[DEBUG] \u30D1\u30E9\u30E1\u30FC\u30BF\u5316SQL\u691C\u7D22\u7D50\u679C:", directResult);
                return [3 /*break*/, 14];
            case 13:
                sqlError_1 = _e.sent();
                console.error("[ERROR] \u30D1\u30E9\u30E1\u30FC\u30BF\u5316SQL\u5B9F\u884C\u5931\u6557:", sqlError_1);
                return [3 /*break*/, 14];
            case 14:
                manualMatch = allUsers.find(function (u) { return u.id === id_1; });
                console.log("[DEBUG] \u624B\u52D5\u691C\u7D22\u7D50\u679C:", manualMatch ? {
                    id: manualMatch.id,
                    username: manualMatch.username,
                    found: true
                } : 'null');
                // 方法4: IDの完全一致チェック
                console.log("[DEBUG] \u5B8C\u5168\u4E00\u81F4\u30C1\u30A7\u30C3\u30AF:", allUsers.map(function (u) { return ({
                    storedId: u.id,
                    requestId: id_1,
                    exact: u.id === id_1,
                    strict: u.id.valueOf() === id_1.valueOf(),
                    toString: u.id.toString() === id_1.toString()
                }); }));
                finalUser = existingUser || manualMatch;
                if (!finalUser) {
                    console.log("[ERROR] \u30E6\u30FC\u30B6\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093: ID=\"".concat(id_1, "\""));
                    console.log("[ERROR] \u5229\u7528\u53EF\u80FD\u306AID\u4E00\u89A7:", allUsers.map(function (u) { return "\"".concat(u.id, "\""); }));
                    console.log("[ERROR] \u6587\u5B57\u30B3\u30FC\u30C9\u6BD4\u8F03:", allUsers.map(function (u) { return ({
                        storedId: u.id,
                        requestId: id_1,
                        match: u.id === id_1,
                        lengthMatch: u.id.length === id_1.length,
                        includes: u.id.includes(id_1) || id_1.includes(u.id)
                    }); }));
                    return [2 /*return*/, res.status(404).json({
                            message: "ユーザーが見つかりません",
                            debug: {
                                requestedId: id_1,
                                requestedIdLength: id_1.length,
                                availableIds: allUsers.map(function (u) { return u.id; }),
                                possibleMatches: allUsers.filter(function (u) {
                                    return u.id.includes(id_1) || id_1.includes(u.id) || u.id.toLowerCase() === id_1.toLowerCase();
                                })
                            }
                        })];
                }
                console.log("[DEBUG] \u6700\u7D42\u7684\u306B\u898B\u3064\u304B\u3063\u305F\u30E6\u30FC\u30B6\u30FC:", {
                    id: finalUser.id,
                    username: finalUser.username,
                    source: existingUser ? 'drizzle_query' : 'manual_search'
                });
                updateData = {
                    username: username,
                    display_name: display_name,
                    role: role,
                    department: department
                };
                if (!(password && typeof password === 'string' && password.trim().length > 0)) return [3 /*break*/, 16];
                bcrypt = require('bcrypt');
                _b = updateData;
                return [4 /*yield*/, bcrypt.hash(password, 10)];
            case 15:
                _b.password = _e.sent();
                console.log("\u30D1\u30B9\u30EF\u30FC\u30C9\u3082\u66F4\u65B0\u3057\u307E\u3059: ID=".concat(id_1));
                return [3 /*break*/, 17];
            case 16:
                console.log("\u30D1\u30B9\u30EF\u30FC\u30C9\u306F\u672A\u8A18\u5165\u307E\u305F\u306F\u7121\u52B9\u306E\u305F\u3081\u3001\u73FE\u5728\u306E\u30D1\u30B9\u30EF\u30FC\u30C9\u3092\u7DAD\u6301\u3057\u307E\u3059: ID=".concat(id_1), { password: password, type: typeof password });
                _e.label = 17;
            case 17: return [4 /*yield*/, db_1.db
                    .update(schema_1.users)
                    .set(updateData)
                    .where((0, drizzle_orm_1.eq)(schema_1.users.id, id_1))
                    .returning({
                    id: schema_1.users.id,
                    username: schema_1.users.username,
                    display_name: schema_1.users.display_name,
                    role: schema_1.users.role,
                    department: schema_1.users.department
                })];
            case 18:
                updatedUser = (_e.sent())[0];
                console.log("\u30E6\u30FC\u30B6\u30FC\u66F4\u65B0\u6210\u529F: ID=".concat(id_1));
                res.json(updatedUser);
                return [3 /*break*/, 20];
            case 19:
                error_2 = _e.sent();
                console.error("Error updating user:", error_2);
                return [2 /*return*/, res.status(500).json({ message: "ユーザー更新中にエラーが発生しました" })];
            case 20: return [2 /*return*/];
        }
    });
}); });
// ✅ ユーザー削除
router.delete('/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, existingUser, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                id = req.params.id;
                console.log("\u30E6\u30FC\u30B6\u30FC\u524A\u9664\u30EA\u30AF\u30A8\u30B9\u30C8: ID=".concat(id));
                return [4 /*yield*/, db_1.db.query.users.findFirst({
                        where: (0, drizzle_orm_1.eq)(schema_1.users.id, id)
                    })];
            case 1:
                existingUser = _a.sent();
                if (!existingUser) {
                    console.log("\u524A\u9664\u5BFE\u8C61\u30E6\u30FC\u30B6\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093: ID=".concat(id));
                    return [2 /*return*/, res.status(404).json({ message: "ユーザーが見つかりません" })];
                }
                // ユーザー削除
                return [4 /*yield*/, db_1.db.delete(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, id))];
            case 2:
                // ユーザー削除
                _a.sent();
                console.log("\u30E6\u30FC\u30B6\u30FC\u524A\u9664\u6210\u529F: ID=".concat(id));
                res.json({ message: "ユーザーが削除されました" });
                return [3 /*break*/, 4];
            case 3:
                error_3 = _a.sent();
                console.error("Error deleting user:", error_3);
                return [2 /*return*/, res.status(500).json({ message: "ユーザー削除中にエラーが発生しました" })];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.usersRouter = router;
var templateObject_1;
