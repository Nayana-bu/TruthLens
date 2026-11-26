import type { ClaimDossier, Language, NLILabel, SemanticFrame } from '../types.ts';
import { classifyPairNLI, extractSemanticFrame, type NLIPairResult } from './semanticNliEngine.ts';

export type ComparisonOverallStatus = 'consistent' | 'contradictory' | 'inconclusive';

export interface SimilarArchiveMatch {
  dossier: ClaimDossier;
  similarityScore: number;
  matchedConcepts: string[];
  nliResult: NLIPairResult;
  comparisonPreviewStatus: ComparisonOverallStatus;
}

export interface DimensionComparison {
  key: 'actor' | 'event' | 'modality' | 'polarity' | 'cardinality' | 'timeframe' | 'location';
  label: string;
  newValue: string;
  archivedValue: string;
  status: 'match' | 'conflict' | 'partial' | 'absent';
  note?: string;
}

export interface HighlightedToken {
  text: string;
  kind: 'shared' | 'conflict' | 'unique' | 'space';
}

export interface ClaimComparisonResult {
  newClaimNormalized: string;
  archivedDossier: ClaimDossier;
  similarityScore: number;
  nliResult: NLIPairResult;
  findingAlignment?: {
    label: NLILabel;
    confidence: number;
    reason: string;
    summaryText: string;
  };
  overallStatus: ComparisonOverallStatus;
  headline: string;
  explanation: string;
  archiveVerdictWarning?: string;
  newFrame: SemanticFrame;
  archivedFrame: SemanticFrame;
  dimensions: DimensionComparison[];
  newTokens: HighlightedToken[];
  archivedTokens: HighlightedToken[];
  sharedTerms: string[];
  newOnlyTerms: string[];
  archivedOnlyTerms: string[];
}

const COMPARE_STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'as', 'into',
  'about', 'that', 'this', 'these', 'those', 'it', 'its', 'they', 'their',
  'her', 'his', 'our', 'your', 'she', 'he', 'we', 'you', 'and', 'or', 'but',
  'if', 'then', 'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would',
  'can', 'could', 'may', 'might', 'shall', 'should', 'must', 'who', 'what',
  'when', 'where', 'why', 'how', 'which', 'today', 'yesterday', 'tomorrow',
  'recently', 'just', 'now', 'currently', 'official', 'officially', 'report',
  'reports', 'news', 'breaking', 'claim', 'claims', 'source', 'sources',
]);

const CONCEPT_SYNONYMS: Record<string, string> = {
  delivered: 'birth',
  gave: 'give',
  given: 'give',
  welcomed: 'birth',
  welcomes: 'birth',
  welcome: 'birth',
  newborn: 'baby',
  babies: 'baby',
  child: 'baby',
  children: 'baby',
  twins: 'twin',
  acquired: 'buy',
  acquisition: 'buy',
  purchased: 'buy',
  bought: 'buy',
  touchdown: 'land',
  touched: 'land',
  'soft-landed': 'land',
  landed: 'land',
  lunar: 'moon',
  inaugurated: 'open',
  commissioned: 'open',
  operational: 'open',
  opened: 'open',
  clinched: 'win',
  captured: 'win',
  secured: 'win',
  won: 'win',
  defeated: 'defeat',
  beat: 'defeat',
  abrogation: 'repeal',
  abrogated: 'repeal',
  revoked: 'repeal',
  repealed: 'repeal',
  upheld: 'uphold',
  upholds: 'uphold',
  expecting: 'expect',
  pregnant: 'pregnancy',
  actress: 'actor',
};

const NEGATION_CUES = new Set([
  'not', 'no', 'never', 'neither', 'nor', 'without', "didn't", "doesn't",
  "don't", "isn't", "aren't", "wasn't", "weren't", "hasn't", "haven't",
  "hadn't", "won't", "can't", 'cannot', 'denied', 'refuted', 'false',
  'fake', 'hoax', 'debunked', 'untrue', 'baseless', 'fabricated',
]);

const CARDINALITY_CUES = new Set([
  'twin', 'twins', 'triplet', 'triplets', 'quadruplets', 'boy', 'girl',
  'son', 'daughter', 'single', 'singleton', 'only', 'one', 'two', 'three', 'four', 'first',
]);

/**
 * Normalizes spacing and splits PascalCase / camelCase identifiers
 * (e.g. "SamanthaRuthPrabhu" -> "Samantha Ruth Prabhu") without altering meaning.
 */
export function normalizeClaimInputText(raw: string): string {
  return (raw || '')
    .replace(/([a-z\p{Ll}])([A-Z\p{Lu}])/gu, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeWords(text: string): string[] {
  return (text.toLowerCase().match(/\d+(?:\.\d+)?|[\p{L}\p{M}]+(?:-[\p{L}\p{M}\p{N}]+)*/gu) || [])
    .map((t) => t.replace(/^-+|-+$/g, ''))
    .filter((t) => t.length > 0);
}

function toConcept(token: string): string {
  const lower = token.toLowerCase();
  if (CONCEPT_SYNONYMS[lower]) return CONCEPT_SYNONYMS[lower];
  if (lower.endsWith('ing') && lower.length > 5) return lower.slice(0, -3);
  if (lower.endsWith('ed') && lower.length > 4) return lower.slice(0, -2);
  if (lower.endsWith('s') && lower.length > 4 && !lower.endsWith('ss')) return lower.slice(0, -1);
  return lower;
}

function extractConceptEntries(text: string): { display: string; concept: string }[] {
  const seen = new Set<string>();
  const out: { display: string; concept: string }[] = [];
  for (const tok of tokenizeWords(text)) {
    if (COMPARE_STOPWORDS.has(tok) || (tok.length < 2 && !/^\d+$/.test(tok))) continue;
    const concept = toConcept(tok);
    if (!seen.has(concept)) {
      seen.add(concept);
      out.push({ display: tok, concept });
    }
  }
  return out;
}

function namesRoughlyMatch(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  if (al === bl || al.includes(bl) || bl.includes(al)) return true;
  const toksA = tokenizeWords(al).filter((t) => !COMPARE_STOPWORDS.has(t) && t.length >= 2);
  const toksB = tokenizeWords(bl).filter((t) => !COMPARE_STOPWORDS.has(t) && t.length >= 2);
  return toksA.some((t) => toksB.includes(t));
}

function formatModality(modality: SemanticFrame['modality']): string {
  switch (modality) {
    case 'completed_fact':
      return 'Completed fact';
    case 'ongoing_state':
      return 'Ongoing state';
    case 'prospective_expectation':
      return 'Prospective / expecting';
    case 'announcement_proposal':
      return 'Announcement / proposal';
    case 'rumor_allegation':
      return 'Rumor / unverified';
    case 'question':
      return 'Question / inquiry';
    case 'future_prediction':
      return 'Future prediction';
    case 'sarcasm_or_irony':
      return 'Sarcasm / irony';
    default:
      return modality;
  }
}

function formatEventType(eventType?: string): string {
  if (!eventType) return 'Unspecified';
  return eventType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatCardinality(frame: SemanticFrame): string {
  if (frame.cardinality === undefined) return 'Not specified';
  return `${frame.cardinality}${frame.isExclusiveCardinality ? ' (exclusive)' : ' (non-exclusive)'}`;
}

function extractYears(text: string): string[] {
  return Array.from(new Set(Array.from(text.matchAll(/\b(19\d{2}|20[0-3]\d)\b/g)).map((m) => m[1])));
}

function extractNumberedEntities(text: string): { prefix: string; num: string; full: string }[] {
  const out: { prefix: string; num: string; full: string }[] = [];
  for (const m of text.toLowerCase().matchAll(/\b([a-z]{3,})[-\s]?(\d+)\b/g)) {
    out.push({ prefix: m[1], num: m[2], full: `${m[1]}-${m[2]}` });
  }
  return out;
}

function resolveArchivedFindingText(dossier: ClaimDossier, lang: Language = 'en'): string {
  const summaryText =
    dossier.summary?.[lang] ||
    dossier.summary?.en ||
    dossier.debunkExplanation?.[lang] ||
    dossier.debunkExplanation?.en ||
    '';

  const topSourceDetail = (dossier.sources || [])
    .slice(0, 2)
    .map((s) => s.detailsTranslations?.[lang] || s.details || '')
    .filter(Boolean)
    .join(' ');

  return normalizeClaimInputText(`${summaryText} ${topSourceDetail}`.trim())
    .replace(
      /^(?:false\s+claim|fake\s+news|misleading(?:\s+claim)?|this\s+claim\s+is\s+(?:fake|false))(?:\s*[:.\-–—]\s*|\s+)/i,
      ''
    )
    // Keep affirmative correction intact while preventing trailing ", not X" contrast from inverting event polarity
    .replace(/,?\s+\bnot\s+(?:twins|triplets|quadruplets)\b(?=[.,;!?]|\s|$)/gi, '');
}

function isArchiveVerdictFalse(dossier: ClaimDossier): boolean {
  return dossier.clearVerdictStatus === 'FAKE' || dossier.verdict === 'false';
}

function isArchiveVerdictTrue(dossier: ClaimDossier): boolean {
  return dossier.clearVerdictStatus === 'REAL' || dossier.verdict === 'verified_true';
}

function mapNliToOverallStatus(
  nliLabel: NLILabel,
  similarityScore: number
): ComparisonOverallStatus {
  if (nliLabel === 'ENTAILMENT') return 'consistent';
  if (nliLabel === 'CONTRADICTION') return 'contradictory';
  // Check weak similarity cases cleanly
  return similarityScore < 15 ? 'inconclusive' : 'inconclusive';
}

function computeSimilarityAndConcepts(
  newNorm: string,
  newFrame: SemanticFrame,
  newConcepts: { display: string; concept: string }[],
  dossier: ClaimDossier
): { similarityScore: number; matchedConcepts: string[]; nliResult: NLIPairResult } {
  const archivedNorm = normalizeClaimInputText(dossier.originalClaim || dossier.title || '');
  const archivedCombined = normalizeClaimInputText(`${dossier.originalClaim || ''} ${dossier.title || ''}`);
  const archivedFrame = extractSemanticFrame(archivedNorm);
  const archivedConcepts = extractConceptEntries(archivedCombined);

  const archivedConceptSet = new Set(archivedConcepts.map((c) => c.concept));
  const matched = newConcepts.filter((c) => archivedConceptSet.has(c.concept));

  const unionSize = new Set([
    ...newConcepts.map((c) => c.concept),
    ...archivedConcepts.map((c) => c.concept),
  ]).size;

  const jaccard = unionSize > 0 ? matched.length / unionSize : 0;
  const maxCoverage =
    Math.min(newConcepts.length, archivedConcepts.length) > 0
      ? matched.length / Math.min(newConcepts.length, archivedConcepts.length)
      : 0;

  const nliResult = classifyPairNLI(newNorm, archivedNorm);

  let score = jaccard * 42 + maxCoverage * 24 + nliResult.crossRelevanceScore * 16;

  // Actor boost
  if (namesRoughlyMatch(newFrame.actor, archivedFrame.actor)) {
    score += 18;
  }

  // Related / matching event boost
  if (newFrame.eventType && archivedFrame.eventType) {
    if (newFrame.eventType === archivedFrame.eventType) {
      score += 14;
    } else if (
      (newFrame.eventType === 'birth_delivery' && archivedFrame.eventType === 'pregnancy_expectation') ||
      (newFrame.eventType === 'pregnancy_expectation' && archivedFrame.eventType === 'birth_delivery')
    ) {
      score += 10;
    }
  }

  // Exact match normalization bonus
  if (newNorm.toLowerCase() === archivedNorm.toLowerCase()) {
    score = 100;
  }

  return {
    similarityScore: Math.max(0, Math.min(100, Math.round(score))),
    matchedConcepts: matched.map((m) => m.display),
    nliResult,
  };
}

/**
 * Ranks archived investigations by semantic & lexical similarity against a newly entered claim.
 */
export function rankSimilarArchivedClaims(
  newClaimText: string,
  dossiers: ClaimDossier[]
): SimilarArchiveMatch[] {
  const newNorm = normalizeClaimInputText(newClaimText);
  if (!newNorm || dossiers.length === 0) return [];

  const newFrame = extractSemanticFrame(newNorm);
  const newConcepts = extractConceptEntries(newNorm);

  const matches: SimilarArchiveMatch[] = dossiers.map((dossier) => {
    const { similarityScore, matchedConcepts, nliResult } = computeSimilarityAndConcepts(
      newNorm,
      newFrame,
      newConcepts,
      dossier
    );

    return {
      dossier,
      similarityScore,
      matchedConcepts,
      nliResult,
      comparisonPreviewStatus: mapNliToOverallStatus(nliResult.label, similarityScore),
    };
  });

  return matches.sort((a, b) => {
    if (b.similarityScore !== a.similarityScore) return b.similarityScore - a.similarityScore;
    const rankLabel = (l: NLILabel) => (l === 'CONTRADICTION' ? 2 : l === 'ENTAILMENT' ? 1 : 0);
    return rankLabel(b.nliResult.label) - rankLabel(a.nliResult.label);
  });
}

function buildTokenDiff(
  newText: string,
  archivedText: string,
  overallStatus: ComparisonOverallStatus,
  newFrame: SemanticFrame,
  archivedFrame: SemanticFrame
): {
  newTokens: HighlightedToken[];
  archivedTokens: HighlightedToken[];
  sharedTerms: string[];
  newOnlyTerms: string[];
  archivedOnlyTerms: string[];
} {
  const newEntries = extractConceptEntries(newText);
  const archivedEntries = extractConceptEntries(archivedText);

  const newConceptSet = new Set(newEntries.map((e) => e.concept));
  const archivedConceptSet = new Set(archivedEntries.map((e) => e.concept));

  const sharedConceptSet = new Set(
    newEntries.filter((e) => archivedConceptSet.has(e.concept)).map((e) => e.concept)
  );

  const newYears = extractYears(newText);
  const archYears = extractYears(archivedText);
  const yearConflictSet = new Set<string>();
  if (newYears.length > 0 && archYears.length > 0 && !newYears.some((y) => archYears.includes(y))) {
    newYears.forEach((y) => yearConflictSet.add(y));
    archYears.forEach((y) => yearConflictSet.add(y));
  }

  const newNumEnts = extractNumberedEntities(newText);
  const archNumEnts = extractNumberedEntities(archivedText);
  const numEntityMismatchSet = new Set<string>();
  for (const ne of newNumEnts) {
    const clash = archNumEnts.find((ae) => ae.prefix === ne.prefix && ae.num !== ne.num);
    if (clash) {
      numEntityMismatchSet.add(ne.full);
      numEntityMismatchSet.add(clash.full);
    }
  }

  const cardinalityConflict =
    newFrame.cardinality !== undefined &&
    archivedFrame.cardinality !== undefined &&
    newFrame.cardinality !== archivedFrame.cardinality;

  const polarityConflict = newFrame.polarity !== archivedFrame.polarity;

  const targetConflict =
    overallStatus === 'contradictory' &&
    Boolean(newFrame.target && archivedFrame.target && !namesRoughlyMatch(newFrame.target, archivedFrame.target));

  const mapChunks = (raw: string, otherConcepts: Set<string>, isNewSide: boolean): HighlightedToken[] => {
    const parts = raw.split(/(\s+|[.,;:!?'"()[\]{}]+)/g).filter((p) => p.length > 0);
    return parts.map((part) => {
      if (/^\s+$/.test(part) || /^[.,;:!?'"()[\]{}]+$/.test(part)) {
        return { text: part, kind: 'space' };
      }

      const lower = part.toLowerCase();
      const cleaned = lower.replace(/^-+|-+$/g, '');
      if (!cleaned || (COMPARE_STOPWORDS.has(cleaned) && !NEGATION_CUES.has(cleaned))) {
        return { text: part, kind: 'space' };
      }

      // Specific conflict triggers
      if (yearConflictSet.has(cleaned)) {
        return { text: part, kind: 'conflict' };
      }
      if (numEntityMismatchSet.has(cleaned)) {
        return { text: part, kind: 'conflict' };
      }
      if (polarityConflict && NEGATION_CUES.has(cleaned)) {
        return { text: part, kind: 'conflict' };
      }
      if (cardinalityConflict && (CARDINALITY_CUES.has(cleaned) || /^\d+$/.test(cleaned))) {
        return { text: part, kind: 'conflict' };
      }
      if (targetConflict) {
        const targetStr = (isNewSide ? newFrame.target : archivedFrame.target)?.toLowerCase() || '';
        if (targetStr.split(/\s+/).includes(cleaned)) {
          return { text: part, kind: 'conflict' };
        }
      }

      const concept = toConcept(cleaned);
      if (otherConcepts.has(concept)) {
        return { text: part, kind: 'shared' };
      }

      if (overallStatus === 'contradictory' && (NEGATION_CUES.has(cleaned) || /^\d+$/.test(cleaned))) {
        return { text: part, kind: 'conflict' };
      }

      return { text: part, kind: 'unique' };
    });
  };

  return {
    newTokens: mapChunks(newText, archivedConceptSet, true),
    archivedTokens: mapChunks(archivedText, newConceptSet, false),
    sharedTerms: newEntries.filter((e) => sharedConceptSet.has(e.concept)).map((e) => e.display),
    newOnlyTerms: newEntries.filter((e) => !sharedConceptSet.has(e.concept)).map((e) => e.display),
    archivedOnlyTerms: archivedEntries.filter((e) => !sharedConceptSet.has(e.concept)).map((e) => e.display),
  };
}

function buildDimensionRows(
  newNorm: string,
  archivedNorm: string,
  newFrame: SemanticFrame,
  archivedFrame: SemanticFrame,
  nliReason: string
): DimensionComparison[] {
  const newYears = extractYears(newNorm);
  const archYears = extractYears(archivedNorm);

  // 1. Actor
  const actorMatch = namesRoughlyMatch(newFrame.actor, archivedFrame.actor);
  const roleSwapped =
    Boolean(newFrame.actor && newFrame.target && archivedFrame.actor && archivedFrame.target) &&
    namesRoughlyMatch(newFrame.actor, archivedFrame.target) &&
    namesRoughlyMatch(newFrame.target, archivedFrame.actor);

  const actorRow: DimensionComparison = {
    key: 'actor',
    label: 'Subject / Actor',
    newValue: newFrame.actor || 'Not isolated',
    archivedValue: archivedFrame.actor || 'Not isolated',
    status: roleSwapped
      ? 'conflict'
      : actorMatch
      ? 'match'
      : !newFrame.actor && !archivedFrame.actor
      ? 'absent'
      : newFrame.actor && archivedFrame.actor
      ? 'partial'
      : 'absent',
    note: roleSwapped ? 'Actor and target roles are reversed' : undefined,
  };

  // 2. Event / Action
  const eventMatch = Boolean(newFrame.eventType && archivedFrame.eventType && newFrame.eventType === archivedFrame.eventType);
  const eventRelated =
    (newFrame.eventType === 'birth_delivery' && archivedFrame.eventType === 'pregnancy_expectation') ||
    (newFrame.eventType === 'pregnancy_expectation' && archivedFrame.eventType === 'birth_delivery');

  const eventRow: DimensionComparison = {
    key: 'event',
    label: 'Event / Action',
    newValue: formatEventType(newFrame.eventType),
    archivedValue: formatEventType(archivedFrame.eventType),
    status: eventMatch
      ? 'match'
      : eventRelated || (newFrame.eventType && archivedFrame.eventType)
      ? 'partial'
      : !newFrame.eventType && !archivedFrame.eventType
      ? 'absent'
      : 'partial',
    note: eventRelated ? 'Prospective stage vs completed event' : undefined,
  };

  // 3. Modality & Tense
  const sameModality = newFrame.modality === archivedFrame.modality;
  const modalityCompat =
    sameModality ||
    (['completed_fact', 'ongoing_state', 'rumor_allegation'].includes(newFrame.modality) &&
      ['completed_fact', 'ongoing_state'].includes(archivedFrame.modality));

  const modalityRow: DimensionComparison = {
    key: 'modality',
    label: 'Modality & Tense',
    newValue: `${formatModality(newFrame.modality)} (${newFrame.tense})`,
    archivedValue: `${formatModality(archivedFrame.modality)} (${archivedFrame.tense})`,
    status: sameModality ? 'match' : modalityCompat ? 'partial' : 'partial',
    note: !modalityCompat ? 'Certainty or temporal stage differs' : undefined,
  };

  // 4. Polarity
  const polarityConflict = newFrame.polarity !== archivedFrame.polarity;
  const polarityRow: DimensionComparison = {
    key: 'polarity',
    label: 'Polarity',
    newValue: newFrame.polarity === 'negative' ? 'Negative / Refuted' : 'Affirmative',
    archivedValue: archivedFrame.polarity === 'negative' ? 'Negative / Refuted' : 'Affirmative',
    status: polarityConflict ? 'conflict' : 'match',
    note: polarityConflict ? 'Direct affirmation vs negation conflict' : undefined,
  };

  // 5. Quantity / Cardinality
  const cardConflict =
    newFrame.cardinality !== undefined &&
    archivedFrame.cardinality !== undefined &&
    newFrame.cardinality !== archivedFrame.cardinality &&
    (Boolean(newFrame.isExclusiveCardinality) || Boolean(archivedFrame.isExclusiveCardinality));

  const cardNonExclDiff =
    newFrame.cardinality !== undefined &&
    archivedFrame.cardinality !== undefined &&
    newFrame.cardinality !== archivedFrame.cardinality &&
    !cardConflict;

  const cardinalityRow: DimensionComparison = {
    key: 'cardinality',
    label: 'Quantity / Count',
    newValue: formatCardinality(newFrame),
    archivedValue: formatCardinality(archivedFrame),
    status:
      newFrame.cardinality === undefined && archivedFrame.cardinality === undefined
        ? 'absent'
        : cardConflict
        ? 'conflict'
        : newFrame.cardinality !== undefined &&
          archivedFrame.cardinality !== undefined &&
          newFrame.cardinality === archivedFrame.cardinality
        ? 'match'
        : 'partial',
    note: cardConflict
      ? 'Incompatible exclusive quantities'
      : cardNonExclDiff
      ? 'Quantity differs without explicit exclusivity'
      : undefined,
  };

  // 6. Timeframe / Year
  const yearConflict =
    newYears.length > 0 &&
    archYears.length > 0 &&
    !newYears.some((y) => archYears.includes(y)) &&
    /year conflict/i.test(nliReason);

  const newTimeDisplay = newFrame.timeframe || newYears.join(', ') || 'Not specified';
  const archTimeDisplay = archivedFrame.timeframe || archYears.join(', ') || 'Not specified';

  const timeframeRow: DimensionComparison = {
    key: 'timeframe',
    label: 'Timeframe / Year',
    newValue: newTimeDisplay,
    archivedValue: archTimeDisplay,
    status:
      newTimeDisplay === 'Not specified' && archTimeDisplay === 'Not specified'
        ? 'absent'
        : yearConflict
        ? 'conflict'
        : newTimeDisplay.toLowerCase() === archTimeDisplay.toLowerCase() ||
          (newYears.length > 0 && newYears.some((y) => archYears.includes(y)))
        ? 'match'
        : 'partial',
    note: yearConflict ? 'Conflicting event years' : undefined,
  };

  // 7. Location / Target
  const locNew = newFrame.location || newFrame.target || 'Not specified';
  const locArch = archivedFrame.location || archivedFrame.target || 'Not specified';
  const locMatch = locNew !== 'Not specified' && locArch !== 'Not specified' && namesRoughlyMatch(locNew, locArch);
  const locConflict =
    (roleSwapped || /different/i.test(nliReason)) &&
    locNew !== 'Not specified' &&
    locArch !== 'Not specified' &&
    !locMatch;

  const locationRow: DimensionComparison = {
    key: 'location',
    label: 'Location / Target',
    newValue: locNew,
    archivedValue: locArch,
    status:
      locNew === 'Not specified' && locArch === 'Not specified'
        ? 'absent'
        : locConflict
        ? 'conflict'
        : locMatch
        ? 'match'
        : 'partial',
  };

  return [actorRow, eventRow, modalityRow, polarityRow, cardinalityRow, timeframeRow, locationRow];
}

/**
 * Performs a detailed side-by-side semantic, structural, NLI, and token-level comparison
 * between a newly supplied claim and a specific archived ClaimDossier.
 */
export function compareNewClaimWithArchive(
  newClaimText: string,
  archivedDossier: ClaimDossier,
  lang: Language = 'en'
): ClaimComparisonResult {
  const newClaimNormalized = normalizeClaimInputText(newClaimText);
  const archivedNormalized = normalizeClaimInputText(archivedDossier.originalClaim || archivedDossier.title || '');

  const newFrame = extractSemanticFrame(newClaimNormalized);
  const archivedFrame = extractSemanticFrame(archivedNormalized);
  const newConcepts = extractConceptEntries(newClaimNormalized);

  const { similarityScore, nliResult: forwardNli } = computeSimilarityAndConcepts(
    newClaimNormalized,
    newFrame,
    newConcepts,
    archivedDossier
  );

  // Symmetric check: if new claim specifies a conflicting exclusive count in the reverse direction
  // (e.g. archived="twins (2)" vs new="only one baby boy (1)"), preserve contradiction detection
  let effectiveNli = forwardNli;
  if (forwardNli.label === 'NEUTRAL') {
    const reverseNli = classifyPairNLI(archivedNormalized, newClaimNormalized);
    if (reverseNli.label === 'CONTRADICTION' && reverseNli.structuralLock) {
      effectiveNli = {
        ...reverseNli,
        claimFrame: newFrame,
        evidenceFrame: archivedFrame,
      };
    }
  }

  // Also check against the archived investigation's verified summary / source findings when available
  const findingText = resolveArchivedFindingText(archivedDossier, lang);
  let findingAlignment: ClaimComparisonResult['findingAlignment'] | undefined;
  if (findingText && findingText.toLowerCase() !== archivedNormalized.toLowerCase()) {
    const findingNli = classifyPairNLI(newClaimNormalized, findingText);
    findingAlignment = {
      label: findingNli.label,
      confidence: Math.round(findingNli.confidence * 100),
      reason: findingNli.reason,
      summaryText:
        archivedDossier.summary?.[lang] ||
        archivedDossier.summary?.en ||
        archivedDossier.debunkExplanation?.[lang] ||
        archivedDossier.debunkExplanation?.en ||
        '',
    };
  }

  const overallStatus = mapNliToOverallStatus(effectiveNli.label, similarityScore);
  const archiveIsFake = isArchiveVerdictFalse(archivedDossier);
  const archiveIsTrue = isArchiveVerdictTrue(archivedDossier);

  let headline = 'Distinct Context / Inconclusive Alignment';
  let archiveVerdictWarning: string | undefined;

  if (overallStatus === 'consistent') {
    if (archiveIsFake) {
      headline = 'Consistent with Archived False Claim';
      archiveVerdictWarning =
        'Your new claim aligns semantically with an archived claim that was previously debunked as FALSE NEWS.';
    } else if (archiveIsTrue) {
      headline = 'Consistent with Verified Archive Record';
    } else {
      headline = 'Consistent with Archived Claim';
    }
  } else if (overallStatus === 'contradictory') {
    headline = 'Contradiction Detected Against Archived Claim';
    if (archiveIsFake && findingAlignment?.label === 'ENTAILMENT') {
      archiveVerdictWarning =
        'Your new claim contradicts the debunked archive claim and aligns with its verified investigation summary.';
    } else if (archiveIsTrue) {
      archiveVerdictWarning =
        'Warning: Your new claim directly contradicts an archived claim verified as TRUE NEWS.';
    }
  } else if (similarityScore < 15) {
    headline = 'Low Similarity — Unrelated Claims';
  }

  const dimensions = buildDimensionRows(
    newClaimNormalized,
    archivedNormalized,
    newFrame,
    archivedFrame,
    effectiveNli.reason
  );

  const tokenDiff = buildTokenDiff(
    newClaimNormalized,
    archivedNormalized,
    overallStatus,
    newFrame,
    archivedFrame
  );

  return {
    newClaimNormalized,
    archivedDossier,
    similarityScore,
    nliResult: effectiveNli,
    findingAlignment,
    overallStatus,
    headline,
    explanation: effectiveNli.reason,
    archiveVerdictWarning,
    newFrame,
    archivedFrame,
    dimensions,
    newTokens: tokenDiff.newTokens,
    archivedTokens: tokenDiff.archivedTokens,
    sharedTerms: tokenDiff.sharedTerms,
    newOnlyTerms: tokenDiff.newOnlyTerms,
    archivedOnlyTerms: tokenDiff.archivedOnlyTerms,
  };
}
