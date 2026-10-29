import fs from 'fs';
import path from 'path';
import type { ClaimDossier, ClearVerdictStatus, Language, SubmissionMode, VerdictType } from '../types.ts';

export interface InvestigationRecord {
  id: string;
  userId?: string;
  originalInput: string;
  extractedText: string;
  inputType: SubmissionMode;
  verdict: VerdictType;
  clearVerdictStatus: ClearVerdictStatus;
  verdictLabel: string;
  confidenceScore: number;
  evidenceStrength?: string;
  language: Language;
  status: 'completed' | 'failed' | 'processing';
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  dossier: ClaimDossier;
}

export interface InvestigationStatistics {
  total: number;
  trueCount: number;
  truePercent: number;
  fakeCount: number;
  fakePercent: number;
  misleadingCount: number;
  misleadingPercent: number;
  partlyTrueCount: number;
  partlyTruePercent: number;
  unverifiedCount: number;
  unverifiedPercent: number;
  contextMissingCount: number;
  contextMissingPercent: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'investigations.json');

// Ensure database file and directory exist
function ensureDbSync(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('[TruthLens-DB] Error initializing DB directory/file:', err);
  }
}

// Read all investigations from persistent disk
function readAllSync(): InvestigationRecord[] {
  ensureDbSync();
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[TruthLens-DB] Error reading investigations.json:', err);
    return [];
  }
}

// Atomically write investigations to persistent disk
function writeAllSync(records: InvestigationRecord[]): void {
  ensureDbSync();
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(records, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[TruthLens-DB] Error writing investigations.json:', err);
    if (fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch {
        // Ignore unlink error
      }
    }
    throw err;
  }
}

/**
 * Saves a new investigation to the database.
 */
export async function saveInvestigation(record: InvestigationRecord): Promise<InvestigationRecord> {
  const records = readAllSync();
  // Filter out any existing item with same id if updating
  const existingIdx = records.findIndex((r) => r.id === record.id);
  if (existingIdx !== -1) {
    records[existingIdx] = { ...record, updatedAt: new Date().toISOString() };
  } else {
    records.unshift(record);
  }
  writeAllSync(records);
  return record;
}

/**
 * Updates an existing investigation in the database by ID.
 */
export async function updateInvestigation(
  id: string,
  updatedRecord: InvestigationRecord
): Promise<InvestigationRecord | null> {
  const records = readAllSync();
  const existingIdx = records.findIndex((r) => r.id === id);
  if (existingIdx === -1) {
    return null;
  }
  records[existingIdx] = {
    ...updatedRecord,
    id,
    updatedAt: new Date().toISOString(),
  };
  writeAllSync(records);
  return records[existingIdx];
}

/**
 * Retrieves a single investigation by unique ID.
 */
export async function getInvestigation(
  id: string,
  userId?: string
): Promise<InvestigationRecord | null> {
  const records = readAllSync();
  const found = records.find((r) => r.id === id);
  if (!found) return null;
  if (userId && found.userId && found.userId !== userId) {
    return null;
  }
  return found;
}

/**
 * Lists investigations with optional query, verdict, and inputType filters.
 */
export async function listInvestigations(filters?: {
  search?: string;
  verdict?: string;
  inputType?: string;
  userId?: string;
}): Promise<InvestigationRecord[]> {
  let records = readAllSync();

  if (filters?.userId) {
    records = records.filter((r) => !r.userId || r.userId === filters.userId);
  }

  if (filters?.verdict && filters.verdict !== 'all') {
    const v = filters.verdict.toLowerCase();
    records = records.filter(
      (r) =>
        r.verdict.toLowerCase() === v ||
        r.clearVerdictStatus.toLowerCase() === v ||
        (v === 'fake' && (r.verdict === 'false' || r.clearVerdictStatus === 'FAKE')) ||
        (v === 'true' && (r.verdict === 'verified_true' || r.clearVerdictStatus === 'REAL')) ||
        (v === 'misleading' && (r.verdict === 'misleading' || r.clearVerdictStatus === 'MISLEADING')) ||
        (v === 'partly' && (r.verdict === 'partly_true' || r.clearVerdictStatus === 'PARTLY_TRUE')) ||
        (v === 'unverified' && (r.verdict === 'unverified' || r.clearVerdictStatus === 'UNVERIFIED')) ||
        (v === 'context' && (r.verdict === 'context_missing' || r.clearVerdictStatus === 'CONTEXT_MISSING'))
    );
  }

  if (filters?.inputType && filters.inputType !== 'all') {
    records = records.filter((r) => r.inputType === filters.inputType);
  }

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    records = records.filter(
      (r) =>
        r.originalInput.toLowerCase().includes(q) ||
        r.extractedText.toLowerCase().includes(q) ||
        r.dossier.title.toLowerCase().includes(q) ||
        r.dossier.debunkExplanation.en.toLowerCase().includes(q) ||
        (r.dossier.summary?.en && r.dossier.summary.en.toLowerCase().includes(q))
    );
  }

  // Sort newest first
  records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return records;
}

/**
 * Deletes ONLY the selected investigation by ID.
 * Returns true if record existed and was deleted, false otherwise.
 */
export async function deleteInvestigation(id: string, userId?: string): Promise<boolean> {
  const records = readAllSync();
  const index = records.findIndex((r) => r.id === id);
  if (index === -1) {
    return false;
  }
  // If user filtering is active, only allow deleting own record
  if (userId && records[index].userId && records[index].userId !== userId) {
    return false;
  }

  records.splice(index, 1);
  writeAllSync(records);
  return true;
}

/**
 * Calculates genuine real statistics from stored database records.
 * Failed / incomplete investigations are not counted as successful verifications.
 */
export async function getStatistics(userId?: string): Promise<InvestigationStatistics> {
  let records = readAllSync();

  if (userId) {
    records = records.filter((r) => !r.userId || r.userId === userId);
  }

  // Only count completed investigations
  const validRecords = records.filter((r) => r.status === 'completed');
  const total = validRecords.length;

  if (total === 0) {
    return {
      total: 0,
      trueCount: 0,
      truePercent: 0,
      fakeCount: 0,
      fakePercent: 0,
      misleadingCount: 0,
      misleadingPercent: 0,
      partlyTrueCount: 0,
      partlyTruePercent: 0,
      unverifiedCount: 0,
      unverifiedPercent: 0,
      contextMissingCount: 0,
      contextMissingPercent: 0,
    };
  }

  let trueCount = 0;
  let fakeCount = 0;
  let misleadingCount = 0;
  let partlyTrueCount = 0;
  let unverifiedCount = 0;
  let contextMissingCount = 0;

  for (const r of validRecords) {
    if (r.verdict === 'verified_true' || r.clearVerdictStatus === 'REAL') {
      trueCount++;
    } else if (r.verdict === 'false' || r.clearVerdictStatus === 'FAKE') {
      fakeCount++;
    } else if (r.verdict === 'misleading' || r.clearVerdictStatus === 'MISLEADING') {
      misleadingCount++;
    } else if (r.verdict === 'partly_true' || r.clearVerdictStatus === 'PARTLY_TRUE') {
      partlyTrueCount++;
    } else if (r.verdict === 'context_missing' || r.clearVerdictStatus === 'CONTEXT_MISSING') {
      contextMissingCount++;
    } else {
      unverifiedCount++;
    }
  }

  return {
    total,
    trueCount,
    truePercent: Number(((trueCount / total) * 100).toFixed(1)),
    fakeCount,
    fakePercent: Number(((fakeCount / total) * 100).toFixed(1)),
    misleadingCount,
    misleadingPercent: Number(((misleadingCount / total) * 100).toFixed(1)),
    partlyTrueCount,
    partlyTruePercent: Number(((partlyTrueCount / total) * 100).toFixed(1)),
    unverifiedCount,
    unverifiedPercent: Number(((unverifiedCount / total) * 100).toFixed(1)),
    contextMissingCount,
    contextMissingPercent: Number(((contextMissingCount / total) * 100).toFixed(1)),
  };
}
