import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { ENV } from '../config/env.ts';
import type { NLILabel, SemanticFrame } from '../types.ts';
import { classifyPairNLI } from './semanticNliEngine.ts';
import type { SearchResultItem } from './ragEngine.ts';

let aiClient: GoogleGenAI | null = null;

if (ENV.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({
    apiKey: ENV.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function getGeminiClient(): GoogleGenAI | null {
  return aiClient;
}

function cosineSimilarityVec(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return Math.max(0, Math.min(1, dot / (Math.sqrt(normA) * Math.sqrt(normB))));
}

/**
 * Server-side dense vector reranking using gemini-embedding-2 with a strict 1.8s timeout
 * and graceful fallback to lexical/n-gram hybrid scores if quota or network is unavailable.
 */
export async function applyDenseEmbeddingRerank(
  queryText: string,
  results: SearchResultItem[]
): Promise<{
  results: SearchResultItem[];
  queryVector?: number[];
  denseEmbeddingsMap: Map<string, number[]>;
  embeddingError?: string;
}> {
  const denseEmbeddingsMap = new Map<string, number[]>();
  if (!aiClient || !queryText || results.length === 0) {
    return { results, denseEmbeddingsMap };
  }
  try {
    const candidates = results.slice(0, 10);
    const texts = [
      queryText.slice(0, 400),
      ...candidates.map((r) => `${r.title}. ${r.snippet}`.slice(0, 500)),
    ];

    const embedPromise = aiClient.models.embedContent({
      model: 'gemini-embedding-2',
      contents: texts,
    });
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1800));
    const embedRes = (await Promise.race([embedPromise, timeoutPromise])) as any;
    const embeddings = embedRes?.embeddings;

    if (!Array.isArray(embeddings) || embeddings.length !== texts.length) {
      return {
        results,
        denseEmbeddingsMap,
        embeddingError: 'Dense embedding request timed out; used hybrid local semantic projection fallback.',
      };
    }

    const queryVec: number[] = embeddings[0]?.values || [];
    if (queryVec.length === 0) {
      return { results, denseEmbeddingsMap };
    }

    const reranked = candidates.map((item, idx) => {
      const docVec: number[] = embeddings[idx + 1]?.values || [];
      if (docVec.length > 0 && item.url) {
        denseEmbeddingsMap.set(`${item.url}|${item.snippet.slice(0, 120)}`, docVec);
      }
      const denseSim = docVec.length > 0 ? cosineSimilarityVec(queryVec, docVec) : item.semanticScore || 0;
      const blendedSemantic = Number((0.5 * (item.semanticScore || 0) + 0.5 * denseSim).toFixed(3));
      const baseOther =
        0.27 * (item.keywordScore || 0) +
        0.2 * (item.entityScore || 0) +
        0.15 *
          (item.isPrimary
            ? 1.0
            : item.credibilityTier === 'factcheck_org'
            ? 0.92
            : item.credibilityTier === 'accredited_press'
            ? 0.86
            : 0.5);
      const updatedRelevance = Number((0.38 * blendedSemantic + baseOther).toFixed(3));
      return {
        ...item,
        semanticScore: blendedSemantic,
        relevanceScore: updatedRelevance,
      };
    });

    const remainder = results.slice(10);
    return {
      results: [...reranked, ...remainder].sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)),
      queryVector: queryVec,
      denseEmbeddingsMap,
    };
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    const isQuota = msg.includes('429') || msg.toLowerCase().includes('quota') || msg.includes('RESOURCE_EXHAUSTED');
    return {
      results,
      denseEmbeddingsMap,
      embeddingError: isQuota
        ? 'Embedding API quota limit reached; fell back cleanly to local semantic projection vectors.'
        : 'Dense embedding service temporarily unavailable; used hybrid local projection vectors.',
    };
  }
}

/**
 * Neural Cross-Encoder & Contextual Natural Language Inference (NLI) batch pass
 * using gemini-3.1-flash-lite with strict structured JSON schema and 3.5s timeout.
 */
export async function applyNeuralCrossEncoderAndNLI(
  claimText: string,
  semanticFrame: SemanticFrame | undefined,
  results: SearchResultItem[]
): Promise<{ results: SearchResultItem[]; nliNote?: string }> {
  if (!aiClient || !claimText || results.length === 0) {
    return { results };
  }
  try {
    const candidates = results.slice(0, 8);
    const frameSummary = semanticFrame
      ? `Actor=${semanticFrame.actor || 'unknown'}, Event=${semanticFrame.eventType || 'general'}, Modality=${semanticFrame.modality}, Tense=${semanticFrame.tense}, Polarity=${semanticFrame.polarity}, Cardinality=${semanticFrame.cardinality ?? 'none'}(exclusive=${Boolean(semanticFrame.isExclusiveCardinality)})`
      : 'not specified';

    const pairsText = candidates
      .map((c, idx) => `[${idx}] (${c.sourceName}) Title: ${c.title}\nExcerpt: ${c.snippet.slice(0, 380)}`)
      .join('\n\n');

    const prompt = `Perform strict Cross-Encoder relevance scoring and Natural Language Inference (NLI) between the CLAIM and each EVIDENCE item.

CLAIM: "${claimText.slice(0, 400)}"
CLAIM SEMANTIC FRAME: ${frameSummary}

RULES:
- ENTAILMENT: Evidence explicitly establishes the same event, same actor-target roles, compatible modality/tense (e.g. expecting/pregnant is NOT entailment for gave birth), compatible polarity, and matching quantities/dates.
- CONTRADICTION: Evidence directly refutes the claim, reverses actor-target roles, has opposite polarity on the same event, or states an exclusive conflicting quantity/date (e.g. "only one child", "not twins", or a specific combined/named single-newborn report like "welcomes first child, baby boy Dev" / "welcome baby boy, name him Dev" contradicts "twins").
- NEUTRAL: Evidence is prospective/expectation/rumor when claim is completed fact, mentions an ambiguous bare non-exclusive count without naming a single child or first-child birth (e.g. "a baby boy" alone), is on a tangential topic, or is insufficient.

EVIDENCE CANDIDATES:
${pairsText}`;

    const nliPromise = aiClient.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            assessments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  index: { type: Type.INTEGER },
                  nliLabel: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  crossRelevance: { type: Type.NUMBER },
                  reason: { type: Type.STRING },
                },
                required: ['index', 'nliLabel', 'confidence', 'crossRelevance', 'reason'],
              },
            },
          },
          required: ['assessments'],
        },
      },
    });

    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500));
    const nliRes = (await Promise.race([nliPromise, timeoutPromise])) as any;
    if (!nliRes?.text) {
      return { results, nliNote: 'Neural NLI pass timed out; retained structural semantic NLI scores.' };
    }

    const parsed = JSON.parse(nliRes.text);
    const assessments: any[] = Array.isArray(parsed?.assessments) ? parsed.assessments : [];
    const byIdx = new Map<number, any>();
    for (const a of assessments) {
      if (typeof a?.index === 'number') byIdx.set(a.index, a);
    }

    const updated = candidates.map((item, idx) => {
      const a = byIdx.get(idx);
      if (!a) return item;

      const localCheck = classifyPairNLI(claimText, `${item.title}. ${item.snippet}`);
      const rawLabel = String(a.nliLabel || '').toUpperCase();
      const neuralLabel: NLILabel =
        rawLabel === 'ENTAILMENT' || rawLabel === 'CONTRADICTION' || rawLabel === 'NEUTRAL'
          ? rawLabel
          : 'NEUTRAL';
      const neuralConf = Math.max(0.4, Math.min(0.98, Number(a.confidence) || 0.7));
      const neuralCross = Math.max(0, Math.min(1, Number(a.crossRelevance) || 0.5));

      const blendedCross = Number(
        Math.min(1, 0.52 * (item.crossInteractionScore || 0.5) + 0.48 * neuralCross).toFixed(3)
      );

      let finalLabel: NLILabel = item.nliLabel || localCheck.label;
      let finalConf = item.nliConfidence ?? localCheck.confidence;
      let finalReason = item.nliReason || localCheck.reason;
      let finalStance = item.stance;

      if (!localCheck.structuralLock && neuralConf >= 0.75) {
        if (neuralLabel === 'CONTRADICTION' && item.stance !== 'supports') {
          finalLabel = 'CONTRADICTION';
          finalConf = Number(Math.max(finalConf, neuralConf).toFixed(2));
          finalReason = String(a.reason || finalReason).slice(0, 200);
          finalStance = 'contradicts';
        } else if (
          neuralLabel === 'ENTAILMENT' &&
          item.stance === 'neutral' &&
          item.nliLabel !== 'CONTRADICTION'
        ) {
          finalLabel = 'ENTAILMENT';
          finalConf = Number(Math.max(finalConf, neuralConf).toFixed(2));
          finalReason = String(a.reason || finalReason).slice(0, 200);
          finalStance = 'supports';
        } else if (neuralLabel === 'NEUTRAL' && item.stance === 'supports' && neuralConf >= 0.85) {
          finalLabel = 'NEUTRAL';
          finalConf = neuralConf;
          finalReason = String(a.reason || finalReason).slice(0, 200);
          finalStance = 'neutral';
        }
      }

      const updatedRelevance = Number(
        Math.min(
          1,
          Math.max(
            0,
            0.28 * (item.semanticScore || 0) +
              0.2 * (item.keywordScore || 0) +
              0.14 * (item.entityScore || 0) +
              0.24 * blendedCross +
              0.14 *
                (item.isPrimary
                  ? 1.0
                  : item.credibilityTier === 'factcheck_org'
                  ? 0.92
                  : item.credibilityTier === 'accredited_press'
                  ? 0.86
                  : 0.5)
          )
        ).toFixed(3)
      );

      return {
        ...item,
        crossInteractionScore: blendedCross,
        relevanceScore: updatedRelevance,
        nliLabel: finalLabel,
        nliConfidence: finalConf,
        nliReason: finalReason,
        stance: finalStance,
      };
    });

    const remainder = results.slice(8);
    return {
      results: [...updated, ...remainder].sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)),
    };
  } catch {
    return {
      results,
      nliNote: 'Neural NLI service unavailable; used local Semantic Event Frame & NLI classifier.',
    };
  }
}

export async function generateGroundedVerificationWithGemini(
  parts: any[]
): Promise<{ geminiRes: any; usedFallbackModel: boolean; notes: string[] }> {
  if (!aiClient) {
    return { geminiRes: null, usedFallbackModel: false, notes: [] };
  }

  const notes: string[] = [];
  try {
    const geminiRes = await aiClient.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
    return { geminiRes, usedFallbackModel: false, notes };
  } catch (modelErr: any) {
    const msg = modelErr?.message || String(modelErr);
    const isRateLimit =
      msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.toLowerCase().includes('quota');
    console.log(`[TRUTHLENS-ENGINE] gemini-4-hydrogen fallback triggered: ${msg.slice(0, 180)}`);
    if (isRateLimit) {
      notes.push('Primary AI model rate limit reached; attempted lightweight fallback and grounded RAG pipeline.');
    }
    try {
      const geminiRes = await aiClient.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: { parts },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });
      return { geminiRes, usedFallbackModel: true, notes };
    } catch (fallbackErr: any) {
      const fbMsg = fallbackErr?.message || String(fallbackErr);
      console.log(`[TRUTHLENS-ENGINE] Gemini fallback unavailable (${fbMsg.slice(0, 100)}); continuing with live RAG dossier.`);
      notes.push('AI synthesis model unavailable; result is directly grounded in retrieved web & vector RAG evidence.');
      return { geminiRes: null, usedFallbackModel: true, notes };
    }
  }
}
