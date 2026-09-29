// Purpose: This module (services/geminiService.ts) is used to implement frontend AI helper calls in a modular, maintainable way.

import { GoogleGenAI, Type } from "@google/genai";
import { Company, Deal } from "../types";

const viteKey = (import.meta as any)?.env?.VITE_GEMINI_API_KEY as string | undefined;
const processKey =
  typeof (globalThis as any).process !== 'undefined' ? ((globalThis as any).process as any)?.env?.API_KEY as string | undefined : undefined;
const rawApiKey = (viteKey || processKey || '').trim();
const hasUsableApiKey =
  rawApiKey.length > 20 &&
  !/^(your_|replace_|add_|paste_|api[_-]?key|undefined|null|demo|test)/i.test(rawApiKey);
const ai = hasUsableApiKey ? new GoogleGenAI({ apiKey: rawApiKey }) : null;
let disableAiForSession = !hasUsableApiKey;

const hasInvalidApiKeyError = (error: unknown): boolean => {
  const message = String(error ?? '');
  return /API_KEY_INVALID|API key not valid|INVALID_ARGUMENT/i.test(message);
};

const safeJsonParse = <T>(text: string, fallback: T): T => {
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
};

const fallbackMarketTrends = (category: string): string[] => [
  `${category} buyers are reducing vendor onboarding cycles to speed up project starts.`,
  `Verified supplier networks are winning more enterprise bids in ${category} workflows.`,
  `Multi-vendor delivery models are increasing as teams split scope across specialized partners.`,
];

const fallbackContract = (type: 'NDA' | 'SOW', companyA: string, companyB: string, details: string): string =>
  `${type} AGREEMENT\n\nParties: ${companyA} and ${companyB}\n\nScope:\n${details}\n\n` +
  `Confidentiality: Both parties agree to protect confidential information.\n` +
  `Term: Agreement remains active for the project duration unless terminated in writing.\n` +
  `Governing Law: As mutually agreed by both parties.\n`;

export const aiMatchCompanies = async (query: string, companies: Company[]) => {
  const fallback = () => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const ranked = [...companies]
      .map((c) => {
        const capabilityText = c.capabilities.join(' ').toLowerCase();
        const domainText = c.domain.toLowerCase();
        const termScore = terms.reduce((sum, term) => {
          const hit = capabilityText.includes(term) || domainText.includes(term) || c.name.toLowerCase().includes(term);
          return sum + (hit ? 8 : 0);
        }, 0);
        const trustScore = (c.verified ? 20 : 0) + c.reputation * 4 + (c.dealCompletionRate || 0) * 0.2;
        return { company: c, score: termScore + trustScore };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ company }) => ({
        companyName: company.name,
        reason: `${company.verified ? 'Verified ' : ''}${company.domain} partner with strong reputation and delivery history.`,
      }));
    return ranked;
  };

  if (!ai || disableAiForSession) return fallback();

  const companyData = companies.map(c => ({
    name: c.name,
    capabilities: c.capabilities,
    domain: c.domain,
    reputation: c.reputation,
    verified: c.verified
  }));

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Based on the user query: "${query}", analyze the following companies and recommend the top 3 best matches for a B2B collaboration. Return a JSON array of objects with company name and a brief reason for matching. Prioritize verified companies.
      
      Company List: ${JSON.stringify(companyData)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              companyName: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ["companyName", "reason"]
          }
        }
      }
    });

    return safeJsonParse(response.text ?? '', fallback());
  } catch (error) {
    if (hasInvalidApiKeyError(error)) disableAiForSession = true;
    return fallback();
  }
};

export const generateContract = async (type: 'NDA' | 'SOW', companyA: string, companyB: string, details: string) => {
  if (!ai || disableAiForSession) return fallbackContract(type, companyA, companyB, details);
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Generate a professional, legally-sound ${type} agreement between ${companyA} and ${companyB}. Specific terms: ${details}. Format as a clean string.`,
    });
    return response.text || fallbackContract(type, companyA, companyB, details);
  } catch (error) {
    if (hasInvalidApiKeyError(error)) disableAiForSession = true;
    return fallbackContract(type, companyA, companyB, details);
  }
};

export const analyzeDealRisk = async (deal: Deal, companies: Company[]) => {
  const fallback = () => {
    const buyer = companies.find(c => c.id === deal.buyerId);
    const sellers = companies.filter(c => deal.sellerIds.includes(c.id));
    const avgSellerRep =
      sellers.length > 0 ? sellers.reduce((sum, s) => sum + s.reputation, 0) / sellers.length : 2.5;
    let score = 50;
    if (buyer?.verified) score -= 8;
    score -= Math.round((buyer?.reputation || 2.5) * 4);
    score -= Math.round(avgSellerRep * 4);
    score += deal.amount > 100000 ? 10 : deal.amount > 20000 ? 4 : 0;
    score = Math.max(8, Math.min(90, score));
    return {
      score,
      factors: [
        'Partner verification and historical delivery influence baseline risk.',
        'Deal value and milestone complexity increase execution exposure.',
        'Cross-company coordination can add timeline and dependency risk.'
      ],
      recommendation: score > 60 ? 'Add tighter milestones and verification checkpoints before execution.' : 'Proceed with standard monitoring and milestone-based approvals.'
    };
  };

  if (!ai || disableAiForSession) return fallback();

  const buyer = companies.find(c => c.id === deal.buyerId);
  const sellers = companies.filter(c => deal.sellerIds.includes(c.id));
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the B2B deal risk.
      Buyer: ${buyer?.name} (Reputation: ${buyer?.reputation})
      Sellers: ${sellers.map(s => `${s.name} (Reputation: ${s.reputation}, Verified: ${s.verified})`).join(', ')}
      Deal Amount: $${deal.amount}
      Details: ${deal.notes}
      
      Provide a risk score (0-100, where 100 is highest risk) and 3 specific risk factors.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            factors: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            recommendation: { type: Type.STRING }
          },
          required: ["score", "factors", "recommendation"]
        }
      }
    });
    return safeJsonParse(response.text ?? '', fallback());
  } catch (error) {
    if (hasInvalidApiKeyError(error)) disableAiForSession = true;
    return fallback();
  }
};

export const generateAuditReport = async (company: Company) => {
  const fallback = () => ({
    title: `Operational Audit - ${company.name}`,
    score: Math.max(
      60,
      Math.min(
        98,
        Math.round((company.onTimeDelivery || 0) * 0.45 + (company.dealCompletionRate || 0) * 0.45 + (company.verified ? 10 : 0))
      )
    ),
    summary: `${company.name} demonstrates stable B2B delivery behavior with acceptable operational compliance signals.`,
    financialHealth: `Revenue profile indicates ${company.revenue > 100000 ? 'strong' : 'moderate'} financial capacity for ongoing deals.`,
    operationalCompliance: `On-time delivery (${company.onTimeDelivery}%) and completion rate (${company.dealCompletionRate}%) support a low-to-moderate risk classification.`
  });

  if (!ai || disableAiForSession) return fallback();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a detailed B2B Audit Report for:
      Name: ${company.name}
      GST: ${company.gst}
      Revenue: $${company.revenue}
      On-Time Delivery: ${company.onTimeDelivery}%
      Completion Rate: ${company.dealCompletionRate}%
      
      Return JSON format for a verified audit report.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            score: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            financialHealth: { type: Type.STRING },
            operationalCompliance: { type: Type.STRING }
          },
          required: ["title", "score", "summary", "financialHealth", "operationalCompliance"]
        },
      }
    });
    return safeJsonParse(response.text ?? '', fallback());
  } catch (error) {
    if (hasInvalidApiKeyError(error)) disableAiForSession = true;
    return fallback();
  }
};

export const generateMarketTrends = async (category: string) => {
  const fallback = fallbackMarketTrends(category);
  if (!ai || disableAiForSession) return fallback;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide 3 short, data-driven market trends for the ${category} B2B sector for 2024. Return as a JSON array of strings.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    return safeJsonParse(response.text ?? '', fallback);
  } catch (error) {
    if (hasInvalidApiKeyError(error)) disableAiForSession = true;
    return fallback;
  }
};

