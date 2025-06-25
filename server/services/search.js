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
exports.SearchService = void 0;
var fuse_js_1 = require("fuse.js");
var openai_1 = require("openai");
var path_1 = require("path");
var promises_1 = require("fs/promises");
var SearchService = /** @class */ (function () {
    function SearchService() {
        this.metadataPath = path_1.default.join(process.cwd(), 'knowledge-base', 'processed', 'metadata');
        this.emergencyGuidePath = path_1.default.join(process.cwd(), 'knowledge-base', 'processed', 'emergency-guides');
        this.openai = new openai_1.OpenAI();
        this.initializeFuse();
    }
    SearchService.prototype.initializeFuse = function () {
        return __awaiter(this, void 0, void 0, function () {
            var metadataFiles, searchableItems, _i, metadataFiles_1, file, content, metadata, emergencyFiles, emergencyItems, _a, emergencyFiles_1, file, content, guide;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, promises_1.default.readdir(this.metadataPath)];
                    case 1:
                        metadataFiles = _b.sent();
                        searchableItems = [];
                        _i = 0, metadataFiles_1 = metadataFiles;
                        _b.label = 2;
                    case 2:
                        if (!(_i < metadataFiles_1.length)) return [3 /*break*/, 5];
                        file = metadataFiles_1[_i];
                        if (!file.endsWith('.json')) return [3 /*break*/, 4];
                        return [4 /*yield*/, promises_1.default.readFile(path_1.default.join(this.metadataPath, file), 'utf-8')];
                    case 3:
                        content = _b.sent();
                        metadata = JSON.parse(content);
                        searchableItems.push(metadata);
                        _b.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5:
                        this.fuse = new fuse_js_1.default(searchableItems, {
                            keys: ['title', 'description', 'tags', 'content'],
                            threshold: 0.3,
                            includeScore: true
                        });
                        return [4 /*yield*/, promises_1.default.readdir(this.emergencyGuidePath)];
                    case 6:
                        emergencyFiles = _b.sent();
                        emergencyItems = [];
                        _a = 0, emergencyFiles_1 = emergencyFiles;
                        _b.label = 7;
                    case 7:
                        if (!(_a < emergencyFiles_1.length)) return [3 /*break*/, 10];
                        file = emergencyFiles_1[_a];
                        if (!file.endsWith('.json')) return [3 /*break*/, 9];
                        return [4 /*yield*/, promises_1.default.readFile(path_1.default.join(this.emergencyGuidePath, file), 'utf-8')];
                    case 8:
                        content = _b.sent();
                        guide = JSON.parse(content);
                        emergencyItems.push(guide);
                        _b.label = 9;
                    case 9:
                        _a++;
                        return [3 /*break*/, 7];
                    case 10:
                        this.emergencyFuse = new fuse_js_1.default(emergencyItems, {
                            keys: ['title', 'description', 'steps', 'keywords'],
                            threshold: 0.4,
                            includeScore: true
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    SearchService.prototype.search = function (query) {
        return __awaiter(this, void 0, void 0, function () {
            var fuseResults, images, emergencyResults, emergencyGuides, gptResponse;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fuseResults = this.fuse.search(query);
                        images = fuseResults
                            .map(function (result) { return result.item.images; })
                            .flat()
                            .filter(Boolean);
                        emergencyResults = this.emergencyFuse.search(query);
                        emergencyGuides = emergencyResults.map(function (result) { return ({
                            title: result.item.title,
                            description: result.item.description,
                            imageUrl: result.item.imageUrl,
                            steps: result.item.steps,
                            score: result.score
                        }); });
                        return [4 /*yield*/, this.openai.chat.completions.create({
                                model: "gpt-4",
                                messages: [
                                    {
                                        role: "system",
                                        content: "You are a helpful assistant that provides accurate information based on the knowledge base and emergency guides."
                                    },
                                    {
                                        role: "user",
                                        content: query
                                    }
                                ]
                            })];
                    case 1:
                        gptResponse = _a.sent();
                        return [2 /*return*/, {
                                text: gptResponse.choices[0].message.content || '',
                                images: images,
                                emergencyGuides: emergencyGuides,
                                metadata: fuseResults.map(function (result) { return result.item; })
                            }];
                }
            });
        });
    };
    SearchService.prototype.updateSearchIndex = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.initializeFuse()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return SearchService;
}());
exports.SearchService = SearchService;
