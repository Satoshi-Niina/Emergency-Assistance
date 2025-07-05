"use strict";
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
export const createDefaultUsers: any = createDefaultUsers;
import bcrypt_1 from "bcrypt";
import db_1 from "../db";
import schema_1 from "../db/schema";
import drizzle_orm_1 from "drizzle-orm";
function createDefaultUsers() {
    return __awaiter(this, void 0, void 0, function () {
        var adminExists, hashedAdminPassword, employeeExists, hashedEmployeePassword, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 9, , 10]);
                    return [4 /*yield*/, db_1.db.query.users.findFirst({
                            where: (0, drizzle_orm_1.eq)(schema_1.users.username, 'niina')
                        })];
                case 1:
                    adminExists = _a.sent();
                    if (!!adminExists) return [3 /*break*/, 4];
                    return [4 /*yield*/, bcrypt_1.default.hash('0077', 10)];
                case 2:
                    hashedAdminPassword = _a.sent();
                    return [4 /*yield*/, db_1.db.insert(schema_1.users).values({
                            username: 'niina',
                            password: hashedAdminPassword,
                            display_name: '管理者',
                            role: 'admin',
                            department: 'システム管理'
                        })];
                case 3:
                    _a.sent();
                    console.log('✅ 管理者ユーザー (niina) を作成しました');
                    _a.label = 4;
                case 4: return [4 /*yield*/, db_1.db.query.users.findFirst({
                        where: (0, drizzle_orm_1.eq)(schema_1.users.username, 'employee')
                    })];
                case 5:
                    employeeExists = _a.sent();
                    if (!!employeeExists) return [3 /*break*/, 8];
                    return [4 /*yield*/, bcrypt_1.default.hash('employee123', 10)];
                case 6:
                    hashedEmployeePassword = _a.sent();
                    return [4 /*yield*/, db_1.db.insert(schema_1.users).values({
                            username: 'employee',
                            password: hashedEmployeePassword,
                            display_name: '一般ユーザー',
                            role: 'employee',
                            department: '保守部'
                        })];
                case 7:
                    _a.sent();
                    console.log('✅ 一般ユーザー (employee) を作成しました');
                    _a.label = 8;
                case 8:
                    console.log('✅ デフォルトユーザーの初期化が完了しました');
                    return [3 /*break*/, 10];
                case 9:
                    error_1 = _a.sent();
                    console.error('❌ デフォルトユーザーの作成に失敗しました:', error_1);
                    throw error_1;
                case 10: return [2 /*return*/];
            }
        });
    });
}
