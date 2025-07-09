import express from 'express';
import { SearchService } from '../services/search.js';

const router = express.Router();
const searchService = new SearchService();

router.get('/search', async (req, res) => {
    try {
        const query = req.query.q as string;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        const results = await searchService.performSearch(query);
        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

export { router as searchRouter };
export function registerSearchRoutes(app) {
    app.use('/api/search', router);
} 