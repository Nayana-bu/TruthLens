import fs from 'fs';
import path from 'path';
import type { SearchResultItem } from '../services/ragEngine.ts';
import { ENV } from '../config/env.ts';

export interface VectorDocumentEntry {
  id: string;
  text: string;
  title: string;
  url: string;
  sourceName: string;
  category: string;
  isPrimary: boolean;
  credibilityTier: 'official_primary' | 'accredited_press' | 'factcheck_org' | 'secondary_web';
  publicationDate?: string;
  eventDate?: string;
  temporalStatus?: 'current' | 'outdated' | 'undated';
  denseVector?: number[];
  projectionVector: number[];
  indexedAt: string;
}

export interface VectorSearchHit {
  entry: VectorDocumentEntry;
  similarity: number;
  usedDenseEmbedding: boolean;
}

const DATA_DIR = ENV.DATA_DIR;
const VECTOR_DB_FILE = path.join(DATA_DIR, 'vector_index.json');
const PROJECTION_DIM = 256;
const MAX_VECTOR_ENTRIES = 1500;

const VECTOR_STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'as', 'into',
  'about', 'that', 'this', 'these', 'those', 'it', 'its', 'they', 'their',
  'and', 'or', 'but', 'if', 'then', 'who', 'what', 'when', 'where', 'why',
  'how', 'which', 'has', 'have', 'had', 'will', 'would', 'can', 'could',
]);

let memoryIndex: VectorDocumentEntry[] | null = null;
let lastVectorDbError: string | null = null;

function fnv1aHash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function computeHybridProjectionVector(text: string): number[] {
  const vec = new Array<number>(PROJECTION_DIM).fill(0);
  const tokens = (text.toLowerCase().match(/\d+(?:\.\d+)?|[\p{L}\p{M}]+/gu) || []).filter(
    (t) => !VECTOR_STOPWORDS.has(t) && (t.length >= 2 || /[^\x00-\x7F]/.test(t))
  );

  for (const tok of tokens) {
    const stem = tok.length > 5 ? tok.slice(0, tok.length - 1) : tok;
    const hWord = fnv1aHash(`w:${stem}`);
    const signW = (hWord & 1) === 0 ? 1 : -1;
    vec[hWord % PROJECTION_DIM] += signW * 2.2;

    if (tok.length >= 3) {
      const padded = ` ${tok} `;
      for (let i = 0; i <= padded.length - 3; i++) {
        const tri = padded.slice(i, i + 3);
        const hTri = fnv1aHash(`c:${tri}`);
        const signT = (hTri & 1) === 0 ? 1 : -1;
        vec[hTri % PROJECTION_DIM] += signT * 0.45;
      }
    }
  }

  let normSq = 0;
  for (let i = 0; i < PROJECTION_DIM; i++) normSq += vec[i] * vec[i];
  const norm = Math.sqrt(normSq);
  if (norm > 0) {
    for (let i = 0; i < PROJECTION_DIM; i++) {
      vec[i] = Number((vec[i] / norm).toFixed(5));
    }
  }
  return vec;
}

export function cosineSimilarityVector(a: number[], b: number[]): number {
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

function loadIndexSync(): VectorDocumentEntry[] {
  if (memoryIndex !== null) return memoryIndex;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(VECTOR_DB_FILE)) {
      fs.writeFileSync(VECTOR_DB_FILE, JSON.stringify([], null, 0), 'utf-8');
      memoryIndex = [];
      lastVectorDbError = null;
      return memoryIndex;
    }
    const raw = fs.readFileSync(VECTOR_DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    memoryIndex = Array.isArray(parsed) ? parsed.filter((e) => e && typeof e.id === 'string' && Array.isArray(e.projectionVector)) : [];
    lastVectorDbError = null;
    return memoryIndex;
  } catch (err: any) {
    lastVectorDbError = err?.message || 'Vector index read failure';
    memoryIndex = [];
    return memoryIndex;
  }
}

function persistIndexSync(entries: VectorDocumentEntry[]): boolean {
  const tempFile = `${VECTOR_DB_FILE}.tmp.${Date.now()}`;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(tempFile, JSON.stringify(entries), 'utf-8');
    fs.renameSync(tempFile, VECTOR_DB_FILE);
    lastVectorDbError = null;
    return true;
  } catch (err: any) {
    lastVectorDbError = err?.message || 'Vector index write failure';
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch {
        // Ignore cleanup failure
      }
    }
    return false;
  }
}

function buildEntryId(item: SearchResultItem): string {
  const anchor = `${(item.url || '').toLowerCase().split('?')[0]}|${(item.snippet || '').slice(0, 120)}`;
  return `vec-${fnv1aHash(anchor).toString(16)}`;
}

export function upsertVectorDocuments(
  items: SearchResultItem[],
  denseEmbeddingsByUrlAndSnippet?: Map<string, number[]>
): { indexedCount: number; persisted: boolean; error: string | null } {
  if (!items || items.length === 0) {
    return { indexedCount: 0, persisted: true, error: lastVectorDbError };
  }

  const index = loadIndexSync();
  const byId = new Map<string, VectorDocumentEntry>();
  for (const existing of index) {
    byId.set(existing.id, existing);
  }

  let indexedCount = 0;
  const nowIso = new Date().toISOString();

  for (const item of items) {
    const cleanText = `${item.title}. ${item.snippet}`.replace(/\s+/g, ' ').trim();
    if (cleanText.length < 24 || !item.url) continue;

    const id = buildEntryId(item);
    const key = `${item.url}|${item.snippet.slice(0, 120)}`;
    const denseVec = denseEmbeddingsByUrlAndSnippet?.get(key);
    const existing = byId.get(id);

    const entry: VectorDocumentEntry = {
      id,
      text: cleanText.slice(0, 900),
      title: item.title,
      url: item.url,
      sourceName: item.sourceName,
      category: item.category,
      isPrimary: Boolean(item.isPrimary),
      credibilityTier: item.credibilityTier || 'secondary_web',
      publicationDate: item.publicationDate,
      temporalStatus: item.temporalStatus,
      denseVector: denseVec || existing?.denseVector,
      projectionVector: existing?.projectionVector || computeHybridProjectionVector(cleanText),
      indexedAt: nowIso,
    };
    byId.set(id, entry);
    indexedCount++;
  }

  const merged = Array.from(byId.values())
    .sort((a, b) => new Date(b.indexedAt).getTime() - new Date(a.indexedAt).getTime())
    .slice(0, MAX_VECTOR_ENTRIES);

  memoryIndex = merged;
  const persisted = persistIndexSync(merged);
  return { indexedCount, persisted, error: lastVectorDbError };
}

export function queryVectorDocuments(
  queryText: string,
  options: {
    queryDenseVector?: number[];
    topK?: number;
    minSimilarity?: number;
    isCurrentOrBreakingClaim?: boolean;
  } = {}
): { hits: VectorSearchHit[]; vectorDbStatus: 'operational' | 'fallback_local' | 'error'; error: string | null } {
  const { queryDenseVector, topK = 6, minSimilarity = 0.34, isCurrentOrBreakingClaim = false } = options;
  const index = loadIndexSync();

  if (lastVectorDbError && index.length === 0) {
    return { hits: [], vectorDbStatus: 'error', error: lastVectorDbError };
  }

  const queryProj = computeHybridProjectionVector(queryText);
  const nowMs = Date.now();
  const MAX_BREAKING_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

  const scored: VectorSearchHit[] = [];
  for (const entry of index) {
    if (isCurrentOrBreakingClaim) {
      if (entry.temporalStatus === 'outdated') continue;
      const ageMs = nowMs - new Date(entry.indexedAt).getTime();
      if (Number.isFinite(ageMs) && ageMs > MAX_BREAKING_CACHE_AGE_MS) continue;
    }

    let sim = cosineSimilarityVector(queryProj, entry.projectionVector);
    let usedDense = false;
    if (queryDenseVector && entry.denseVector && queryDenseVector.length === entry.denseVector.length) {
      const denseSim = cosineSimilarityVector(queryDenseVector, entry.denseVector);
      sim = Number((0.65 * denseSim + 0.35 * sim).toFixed(3));
      usedDense = true;
    } else {
      sim = Number(sim.toFixed(3));
    }

    if (sim >= minSimilarity) {
      scored.push({ entry, similarity: sim, usedDenseEmbedding: usedDense });
    }
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  return {
    hits: scored.slice(0, topK),
    vectorDbStatus: queryDenseVector ? 'operational' : 'fallback_local',
    error: lastVectorDbError,
  };
}

export function getVectorStoreDiagnostics(): {
  entryCount: number;
  lastError: string | null;
} {
  const index = loadIndexSync();
  return {
    entryCount: index.length,
    lastError: lastVectorDbError,
  };
}
