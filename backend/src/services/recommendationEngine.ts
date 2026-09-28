// Purpose: Free AI-Powered Recommendation & Matching Engine service using Google Gemini AI / Hybrid Scoring
import { GoogleGenAI } from '@google/genai';
import pool from '../config/database.js';
import { logger } from '../utils/logger.js';

export type RecommendationMatch = {
  id: string;
  name: string;
  matchScore: number; // 0 to 100
  reasoning: string;
  category?: string;
  industry?: string;
  keyHighlights: string[];
};

export type RequirementInput = {
  title: string;
  description: string;
  category?: string;
  budgetMin?: number;
  budgetMax?: number;
  industry?: string;
};

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  if (aiClient) return aiClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  aiClient = new GoogleGenAI({ apiKey });
  return aiClient;
}

/**
 * Fallback hybrid scoring engine when AI API key is not configured or fails.
 */
function calculateHybridScore(
  req: RequirementInput,
  candidate: { id: string; name: string; category?: string; description?: string; industry?: string; rating?: number }
): RecommendationMatch {
  let score = 50; // base score
  const highlights: string[] = [];

  const reqText = `${req.title} ${req.description} ${req.category || ''} ${req.industry || ''}`.toLowerCase();
  const candText = `${candidate.name} ${candidate.description || ''} ${candidate.category || ''} ${candidate.industry || ''}`.toLowerCase();

  // Category match
  if (req.category && candidate.category && req.category.toLowerCase() === candidate.category.toLowerCase()) {
    score += 25;
    highlights.push(`Exact category match: ${candidate.category}`);
  }

  // Industry match
  if (req.industry && candidate.industry && req.industry.toLowerCase() === candidate.industry.toLowerCase()) {
    score += 15;
    highlights.push(`Industry alignment: ${candidate.industry}`);
  }

  // Keyword overlaps
  const keywords = req.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  let matches = 0;
  for (const kw of keywords) {
    if (candText.includes(kw)) matches++;
  }

  if (matches > 0) {
    score += Math.min(matches * 5, 15);
    highlights.push(`Matched ${matches} key requirement terms`);
  }

  if (candidate.rating && candidate.rating >= 4.0) {
    score += 5;
    highlights.push(`High reputation rating (${candidate.rating}/5.0)`);
  }

  const finalScore = Math.min(Math.round(score), 98);

  return {
    id: candidate.id,
    name: candidate.name,
    matchScore: finalScore,
    reasoning: highlights.join('. ') || 'Matched based on business category and profile tags.',
    category: candidate.category,
    industry: candidate.industry,
    keyHighlights: highlights.length > 0 ? highlights : ['Verified B2B Corporate Partner'],
  };
}

/**
 * AI-Powered Business / Vendor Matcher for Corporate Requirements
 */
export async function matchRequirementWithVendors(
  requirement: RequirementInput,
  limit: number = 5
): Promise<RecommendationMatch[]> {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query(
      `SELECT id, name, category, description, industry, reputationScore as rating
       FROM companies
       WHERE isVerified = 1 OR isVerified IS NULL
       LIMIT 20`
    );
    connection.release();

    const candidates = rows as any[];
    if (!candidates || candidates.length === 0) {
      return [];
    }

    const ai = getAIClient();

    // If Gemini AI key is available, leverage Gemini 2.5 Flash for deep semantic matching
    if (ai) {
      try {
        const prompt = `You are a B2B Enterprise Vendor Matching Engine.
Given a corporate requirement and a list of corporate vendor profiles, evaluate each vendor and return the top ${limit} best matching vendors with matchScore (0-100), reasoning, and key highlights.

REQUIREMENT:
Title: ${requirement.title}
Description: ${requirement.description}
Category: ${requirement.category || 'N/A'}
Industry: ${requirement.industry || 'N/A'}

CANDIDATES:
${JSON.stringify(candidates, null, 2)}

Respond strictly in valid JSON array format:
[
  {
    "id": "candidate_id",
    "name": "candidate_name",
    "matchScore": 85,
    "reasoning": "Clear explanation of why this vendor matches",
    "category": "category",
    "industry": "industry",
    "keyHighlights": ["Highlight 1", "Highlight 2"]
  }
]`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.slice(0, limit);
          }
        }
      } catch (aiErr) {
        logger.warn('Gemini AI matching fallback to hybrid scorer:', aiErr);
      }
    }

    // Fallback: Rule-based hybrid algorithm (Free, instantaneous, no API key needed)
    const matches = candidates.map((cand) => calculateHybridScore(requirement, cand));
    return matches.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
  } catch (error) {
    logger.error('Recommendation engine error:', error);
    throw error;
  }
}
