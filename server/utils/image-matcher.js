"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findRelevantImages = findRelevantImages;
const openai_1 = __importDefault(require("openai"));
const index_js_1 = require("../db/index.js");
const schema_js_1 = require("../db/schema.js");
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
async function findRelevantImages(text) {
    try {
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
        });
        const textEmbedding = embeddingResponse.data[0].embedding;
        const allImages = await index_js_1.db.select().from(schema_js_1.images);
        const imagesWithSimilarity = allImages.map(image => ({
            ...image,
            similarity: image.embedding
                ? cosineSimilarity(textEmbedding, image.embedding)
                : 0,
        }));
        // Sort by similarity and return top matches
        return imagesWithSimilarity
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3)
            .map(({ similarity, ...image }) => image);
    }
    catch (error) {
        console.error('Error finding relevant images:', error);
        return [];
    }
}
function cosineSimilarity(vecA, vecB) {
    if (!Array.isArray(vecB) || vecB.length !== vecA.length) {
        return 0;
    }
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}
