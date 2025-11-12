"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySession = void 0;
const verifySession = async (req) => {
    if (!req.session || !req.session.userId) {
        return null;
    }
    return req.session;
};
exports.verifySession = verifySession;
