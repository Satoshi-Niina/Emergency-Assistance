"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
export const findRelevantImages: any = findRelevantImages;
import openai_1 from "openai";
import db_1 from "../db";
import schema_1 from "../db/schema";
var openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
function findRelevantImages(text) {
    return __awaiter(this, void 0, void 0, function () {
        var embeddingResponse, textEmbedding_1, allImages, imagesWithSimilarity, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    return [4 /*yield*/, openai.embeddings.create({
                            model: "text-embedding-3-small",
                            input: text,
                        })];
                case 1:
                    embeddingResponse = _a.sent();
                    textEmbedding_1 = embeddingResponse.data[0].embedding;
                    return [4 /*yield*/, db_1.db.select().from(schema_1.images)];
                case 2:
                    allImages = _a.sent();
                    imagesWithSimilarity = allImages.map(function (image) { return (__assign(__assign({}, image), { similarity: cosineSimilarity(textEmbedding_1, image.embedding) })); });
                    // Sort by similarity and return top matches
                    return [2 /*return*/, imagesWithSimilarity
                            .sort(function (a, b) { return b.similarity - a.similarity; })
                            .slice(0, 3)
                            .map(function (_a) {
                            var similarity = _a.similarity, image = __rest(_a, ["similarity"]);
                            return image;
                        })];
                case 3:
                    error_1 = _a.sent();
                    console.error('Error finding relevant images:', error_1);
                    return [2 /*return*/, []];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function cosineSimilarity(vecA: any, vecB) {
    if (!Array.isArray(vecB) || vecB.length !== vecA.length) {
        return 0;
    }
    var dotProduct = vecA.reduce(function (sum, a, i) { return sum + a * vecB[i]; }, 0);
    var magnitudeA = Math.sqrt(vecA.reduce(function (sum, a) { return sum + a * a; }, 0));
    var magnitudeB = Math.sqrt(vecB.reduce(function (sum, b) { return sum + b * b; }, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}
