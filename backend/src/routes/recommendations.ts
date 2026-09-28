// Purpose: AI Recommendation & Matching API routes
import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { matchRequirementWithVendors } from '../services/recommendationEngine.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /api/recommendations/match
 * Matches a business requirement against top vendors using Gemini AI / Hybrid engine
 */
router.post('/match', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, category, budgetMin, budgetMax, industry, limit } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'title and description are required for matching' });
    }

    const matches = await matchRequirementWithVendors(
      { title, description, category, budgetMin, budgetMax, industry },
      limit ? parseInt(limit, 10) : 5
    );

    res.json({
      engine: process.env.GEMINI_API_KEY ? 'gemini-2.5-flash' : 'hybrid-algorithmic',
      count: matches.length,
      matches,
    });
  } catch (error: any) {
    logger.error('Match route error:', error);
    res.status(500).json({ error: error.message || 'Failed to process recommendations' });
  }
});

export default router;
