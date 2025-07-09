"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authOptions = void 0;
const next_auth_1 = __importDefault(require("next-auth"));
const credentials_1 = __importDefault(require("next-auth/providers/credentials"));
exports.authOptions = {
    providers: [
        (0, credentials_1.default)({
            name: 'Credentials',
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                // ここで認証ロジックを実装
                // 開発用の簡易認証
                if (credentials?.username === "admin" && credentials?.password === "password") {
                    return { id: "1", name: "Admin" };
                }
                return null;
            }
        })
    ],
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: '/auth/signin',
    },
};
exports.default = (0, next_auth_1.default)(exports.authOptions);
