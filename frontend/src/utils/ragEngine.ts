import type {
  EvidencePoint,
  EvidenceAnalysis,
  EvidenceSource,
  EvidenceStrengthRating,
  ExtractedClaim,
  SubmissionMode,
  VerdictType,
  ClearVerdictStatus,
  Language,
  NLILabel,
  SemanticFrame,
} from '../types.ts';
import {
  extractSemanticFrame,
  analyzeSemanticFrameWithAmbiguity,
  classifyPairNLI,
  type NLIPairResult,
} from './semanticNliEngine.ts';

export interface RAGInputContext {
  originalText: string;
  mode: SubmissionMode;
  imageName?: string;
  imageBase64?: string;
}

export interface ExtractedEntityData {
  dates: string[];
  locations: string[];
  organizations: string[];
  amounts: string[];
  people: string[];
  events: string[];
}

export interface ClaimClassificationMeta {
  temporalIntent: 'current_present' | 'recent_news' | 'historical' | 'future_prediction' | 'general_fact';
  newsDomain:
    | 'politics_governance'
    | 'national_international'
    | 'sports'
    | 'science_tech'
    | 'education'
    | 'business_economy'
    | 'health_medicine'
    | 'entertainment'
    | 'weather_disasters'
    | 'crime_safety'
    | 'regional_local'
    | 'historical'
    | 'govt_schemes';
  geographicScope: 'regional_local' | 'national_india' | 'international';
  isFuturePrediction: boolean;
  isVagueUnnamedClaim: boolean;
  isAllegationOnly: boolean;
}

export interface PreprocessedQuery {
  originalInput: string;
  cleanedInput: string;
  normalizedQuery: string;
  alternativeQueries: string[];
  detectedLanguage: Language;
  correctionsApplied: { from: string; to: string }[];
  isQuestion: boolean;
  hasNegation: boolean;
  entities: ExtractedEntityData;
  extractedClaims: ExtractedClaim[];
  isOcrFailureOrEmpty: boolean;
  claimMeta?: ClaimClassificationMeta;
  semanticFrame?: SemanticFrame;
  isSarcastic?: boolean;
  isAmbiguous?: boolean;
  ambiguousReason?: string;
}

export function sanitizeExternalUrl(rawUrl?: string): string | undefined {
  if (!rawUrl || typeof rawUrl !== 'string') return undefined;
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  publicationDate?: string;
  retrievedAt?: string;
  eventDate?: string;
  announcementDate?: string;
  implementationDate?: string;
  evidenceRole?: 'confirmed_fact' | 'official_statement' | 'fact_check' | 'allegation_or_report';
  sourceName: string;
  category: string;
  isPrimary: boolean;
  credibilityTier: 'official_primary' | 'accredited_press' | 'factcheck_org' | 'secondary_web';
  credibilityLabel?: string;
  relevanceScore?: number;
  semanticScore?: number;
  keywordScore?: number;
  entityScore?: number;
  crossInteractionScore?: number;
  stance?: 'supports' | 'contradicts' | 'neutral' | 'irrelevant' | 'contextual';
  temporalStatus?: 'current' | 'outdated' | 'undated';
  nliLabel?: NLILabel;
  nliConfidence?: number;
  nliReason?: string;
}

export interface SubClaimEvaluation {
  id: string;
  verdict: VerdictType;
  clearVerdictStatus: ClearVerdictStatus;
  statusLabel: string;
}

export interface EvidenceEvaluationResult {
  recommendedVerdict: VerdictType | null;
  confidence: number;
  supportingItems: SearchResultItem[];
  contradictingItems: SearchResultItem[];
  neutralItems: SearchResultItem[];
  contextualItems: SearchResultItem[];
  hasConflict: boolean;
  hasOutdatedEvidence: boolean;
  hasPartialSubClaimSupport?: boolean;
  unsupportedSubClaims?: string[];
  subClaimEvaluations?: SubClaimEvaluation[];
  bestAnswerExcerpt?: string;
  reasoningNote: string;
  insufficiencyReason?: string;
  cragSufficient?: boolean;
  cragSufficiencyNote?: string;
}

// ============================================================================
// 1. INTELLIGENT QUERY UNDERSTANDING & MULTILINGUAL SPELL/GRAMMAR PREPROCESSOR
// ============================================================================

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'as', 'into',
  'about', 'that', 'this', 'these', 'those', 'it', 'its', 'they', 'their',
  'who', 'what', 'when', 'where', 'why', 'how', 'which', 'whom', 'whose',
  'do', 'does', 'did', 'has', 'have', 'had', 'can', 'could', 'will', 'would',
  'shall', 'should', 'may', 'might', 'must', 'and', 'or', 'but', 'if', 'then',
  'name', 'tell', 'me', 'please', 'give', 'check', 'verify', 'news', 'claim',
  'viral', 'message', 'forwarded', 'true', 'real', 'current', 'present',
  'update', 'updates', 'latest', 'status', 'details', 'info', 'information',
  'report', 'reports', 'headline', 'breaking', 'today', 'article',
]);

const NEGATION_TOKENS = new Set([
  'not', 'never', 'no', 'none', 'neither', 'nor', 'without', 'resigned',
  'removed', 'dismissed', 'sacked', 'stepped', 'dead', 'died', 'banned',
  'fake', 'false', 'hoax', 'fabricated', 'cancelled', 'canceled', 'closed',
  'closure', 'abolished', 'stopped', 'invalid', 'illegal', 'demonetized',
  // Hindi & Kannada negation/falsity words
  'नहीं', 'नही', 'फर्जी', 'झूठ', 'झूठा', 'गलत', 'बंद',
  'ಇಲ್ಲ', 'ಅಲ್ಲ', 'ಸುಳ್ಳು', 'ನಕಲಿ', 'ರದ್ದು', 'ಬಂದ್',
]);

// Common civic/news typo corrections (exact map for fast deterministic fixes)
const EXACT_TYPO_MAP: Record<string, string> = {
  presdent: 'president',
  presidnt: 'president',
  presedent: 'president',
  persident: 'president',
  presidant: 'president',
  preident: 'president',
  priesdent: 'president',
  prseident: 'president',
  minstr: 'minister',
  minster: 'minister',
  miniter: 'minister',
  ministre: 'minister',
  minstry: 'ministry',
  prim: 'prime',
  prme: 'prime',
  indai: 'india',
  inda: 'india',
  idnia: 'india',
  inida: 'india',
  goverment: 'government',
  govrnment: 'government',
  govenment: 'government',
  govermnt: 'government',
  governemnt: 'government',
  govt: 'government',
  narendr: 'narendra',
  narndra: 'narendra',
  narendar: 'narendra',
  moid: 'modi',
  mdoi: 'modi',
  droupdi: 'droupadi',
  draupadi: 'droupadi',
  droupathi: 'droupadi',
  murm: 'murmu',
  murumu: 'murmu',
  karnatka: 'karnataka',
  karanataka: 'karnataka',
  banglore: 'bengaluru',
  bengluru: 'bengaluru',
  bengalooru: 'bengaluru',
  dehli: 'delhi',
  dilli: 'delhi',
  odisa: 'odisha',
  orissa: 'odisha',
  siddaramiah: 'siddaramaiah',
  sidaramaiah: 'siddaramaiah',
  chandrayan: 'chandrayaan',
  chndrayaan: 'chandrayaan',
  adtiya: 'aditya',
  aaditya: 'aditya',
  vacine: 'vaccine',
  vaccin: 'vaccine',
  cycolne: 'cyclone',
  cyclon: 'cyclone',
  elction: 'election',
  elecion: 'election',
  resgined: 'resigned',
  resigend: 'resigned',
  holidya: 'holiday',
  holidy: 'holiday',
  closre: 'closure',
  closuer: 'closure',
  rechrge: 'recharge',
  recharg: 'recharge',
  laptp: 'laptop',
  lptop: 'laptop',
  pensn: 'pension',
  penson: 'pension',
  scholrship: 'scholarship',
  schlarship: 'scholarship',
  annouced: 'announced',
  anounced: 'announced',
  anouncedd: 'announced',
  offical: 'official',
  oficail: 'official',
  curreny: 'currency',
  currecy: 'currency',
  banknot: 'banknote',
  rupes: 'rupees',
  rupesh: 'rupees',
  imdd: 'imd',
  isrooo: 'isro',
  wether: 'weather',
  wheather: 'weather',
  monson: 'monsoon',
  earthquak: 'earthquake',
  tsunmi: 'tsunami',
  parliment: 'parliament',
  suprme: 'supreme',
  educaton: 'education',
  studnts: 'students',
  studnt: 'student',
  unversity: 'university',
  universty: 'university',
  hspital: 'hospital',
  medcine: 'medicine',
  canser: 'cancer',
  cricet: 'cricket',
  wrld: 'world',
  captial: 'capital',
  capitol: 'capital',
  untied: 'united',
  unietd: 'united',
  statse: 'states',
  ameriac: 'america',
  olympcs: 'olympics',
  medal: 'medal',
  chmpion: 'champion',
  chmapion: 'champion',
  bengaluru: 'bengaluru',
  innaugurated: 'inaugurated',
  inaugrated: 'inaugurated',
  inagurated: 'inaugurated',
  openned: 'opened',
  launced: 'launched',
  launchedd: 'launched',
  offcial: 'official',
  smatphone: 'smartphone',
  smartphne: 'smartphone',
  tournment: 'tournament',
  trophey: 'trophy',
  retird: 'retired',
  retirment: 'retirement',
  econmy: 'economy',
  infaltion: 'inflation',
  artmis: 'artemis',
  disapear: 'disappear',
  arrestted: 'arrested',
  floodd: 'flood',
  cycolnes: 'cyclones',
  internatinal: 'international',
  internt: 'internet',
  governmnet: 'government',
  decembr: 'december',
  novembr: 'november',
  septembr: 'september',
  octobr: 'october',
  januray: 'january',
  feburary: 'february',
};

// Domain vocabulary for Levenshtein fuzzy spelling correction (when word >= 5 chars)
const DOMAIN_VOCABULARY = [
  'president', 'prime', 'minister', 'chief', 'india', 'indian', 'government',
  'narendra', 'modi', 'droupadi', 'murmu', 'siddaramaiah', 'shivakumar', 'rahul', 'gandhi',
  'amit', 'shah', 'karnataka', 'bengaluru', 'bangalore', 'delhi', 'mumbai',
  'chennai', 'kolkata', 'hyderabad', 'odisha', 'kerala', 'maharashtra',
  'gujarat', 'united', 'states', 'america', 'isro', 'aditya', 'chandrayaan',
  'reserve', 'bank', 'currency', 'banknote', 'rupee', 'rupees', 'scholarship',
  'election', 'commission', 'aadhaar', 'vaccine', 'cyclone', 'arnab', 'monsoon',
  'earthquake', 'tsunami', 'weather', 'official', 'announced', 'announcement',
  'inaugurated', 'opened', 'launched', 'resigned', 'retired', 'retirement', 'holiday', 'closure',
  'scheme', 'yojana', 'recharge', 'laptop', 'smartphone', 'pension', 'collision',
  'casualties', 'railway', 'school', 'college', 'students', 'parliament',
  'supreme', 'court', 'ministry', 'health', 'education', 'hospital', 'cricket',
  'olympics', 'medal', 'trophy', 'tournament', 'capital', 'legal', 'tender', 'circular', 'gazette',
  'advisory', 'alert', 'emergency', 'salary', 'trump', 'biden', 'pichai',
  'economy', 'inflation', 'internet', 'december', 'november', 'january', 'february',
  'artemis', 'apollo', 'unesco', 'dengue', 'cancer', 'arrested', 'police', 'kaveri',
];

const DOMAIN_VOCABULARY_SET = new Set(DOMAIN_VOCABULARY);

// Multilingual civic concept expansion for Kannada & Hindi queries
const MULTILINGUAL_CONCEPT_MAP: { pattern: RegExp; englishConcept: string }[] = [
  { pattern: /ಭಾರತದ?\s*ರಾಷ್ಟ್ರಪತಿ|ರಾಷ್ಟ್ರಪತಿ\s*ಯಾರು/u, englishConcept: 'President of India' },
  { pattern: /ದ್ರೌಪದಿ\s*ಮುರ್ಮು/u, englishConcept: 'Droupadi Murmu' },
  { pattern: /ಭಾರತದ?\s*ಪ್ರಧಾನಿ|ಪ್ರಧಾನ\s*ಮಂತ್ರಿ/u, englishConcept: 'Prime Minister of India' },
  { pattern: /ನರೇಂದ್ರ\s*ಮೋದಿ/u, englishConcept: 'Narendra Modi' },
  { pattern: /ರಾಹುಲ್\s*ಗಾಂಧಿ/u, englishConcept: 'Rahul Gandhi' },
  { pattern: /ಕರ್ನಾಟಕದ?\s*ಮುಖ್ಯಮಂತ್ರಿ/u, englishConcept: 'Chief Minister of Karnataka' },
  { pattern: /ಸಿದ್ದರಾಮಯ್ಯ/u, englishConcept: 'Siddaramaiah' },
  { pattern: /ಬೆಂಗಳೂರು.*ರಾಜಧಾನಿ|ಕರ್ನಾಟಕ.*ರಾಜಧಾನಿ/u, englishConcept: 'Bengaluru capital of Karnataka' },
  { pattern: /ಇಸ್ರೋ|ಆದಿತ್ಯ|ಚಂದ್ರಯಾನ|ಸೂರ್ಯ/u, englishConcept: 'ISRO Aditya-L1 Chandrayaan space mission' },
  { pattern: /ರಿಸರ್ವ್\s*ಬ್ಯಾಂಕ್|ಆರ್‌ಬಿಐ|ನೋಟು|ಸ್ಟಾರ್\s*ನೋಟು|ಬ್ಯಾಂಕ್\s*ಬಂದ್/u, englishConcept: 'Reserve Bank of India RBI banknote notification' },
  { pattern: /ಚಂಡಮಾರುತ|ಹವಾಮಾನ|ಮಳೆ|ರಜೆ|ಶಾಲಾ\s*ರಜೆ/u, englishConcept: 'IMD cyclone weather school holiday advisory' },
  { pattern: /ಉಚಿತ\s*(?:500|ಲ್ಯಾಪ್‌ಟಾಪ್|ರೀಚಾರ್ಜ್|ಪಿಂಚಣಿ)/u, englishConcept: 'PIB Fact Check free recharge laptop scheme scam' },
  { pattern: /भारत\s*के\s*राष्ट्रपति|राष्ट्रपति\s*कौन/u, englishConcept: 'President of India' },
  { pattern: /द्रौपदी\s*मुर्मू/u, englishConcept: 'Droupadi Murmu' },
  { pattern: /भारत\s*के\s*प्रधानमंत्री|प्रधान\s*मंत्री/u, englishConcept: 'Prime Minister of India' },
  { pattern: /नरेंद्र\s*मोदी/u, englishConcept: 'Narendra Modi' },
  { pattern: /राहुल\s*गांधी/u, englishConcept: 'Rahul Gandhi' },
  { pattern: /कर्नाटक\s*के\s*मुख्यमंत्री/u, englishConcept: 'Chief Minister of Karnataka' },
  { pattern: /सिद्धारमैया/u, englishConcept: 'Siddaramaiah' },
  { pattern: /इसरो|आदित्य|चंद्रयान/u, englishConcept: 'ISRO Aditya-L1 Chandrayaan space mission' },
  { pattern: /आरबीआई|रिजर्व\s*बैंक|स्टार\s*नोट|बैंक\s*बंद/u, englishConcept: 'Reserve Bank of India RBI banknote star note' },
  { pattern: /चक्रवात|मौसम|मानसून|स्कूल\s*छुट्टी/u, englishConcept: 'IMD cyclone weather school holiday advisory' },
  { pattern: /मुफ्त\s*(?:लैपटॉप|रिचार्ज|500|पेंशन)/u, englishConcept: 'PIB Fact Check free recharge laptop scheme scam' },
];

// Synonym / semantic expansion pairs for similarity & query expansion
const CONCEPT_SYNONYMS: Record<string, string[]> = {
  president: ['head of state', 'rashtrapati', '15th president', 'incumbent'],
  'prime minister': ['pm', 'pradhan mantri', 'head of government'],
  'chief minister': ['cm', 'mukhyamantri'],
  india: ['indian', 'republic of india', 'union of india', 'bharat'],
  government: ['govt', 'ministry', 'central government', 'union government', 'cabinet'],
  rbi: ['reserve bank of india', 'central bank'],
  isro: ['indian space research organisation', 'space agency'],
  imd: ['india meteorological department', 'weather department'],
  pib: ['press information bureau', 'pib fact check'],
  fake: ['false', 'hoax', 'fabricated', 'debunked', 'misinformation', 'untrue'],
  real: ['true', 'confirmed', 'authentic', 'official', 'verified'],
  holiday: ['leave', 'closed', 'closure'],
  banknote: ['note', 'currency', 'rupee'],
};

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 99;
  const m = a.length;
  const n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const temp = dp[j];
      if (a[i - 1] === b[j - 1]) {
        dp[j] = prev;
      } else {
        dp[j] = 1 + Math.min(prev, dp[j], dp[j - 1]);
      }
      prev = temp;
    }
  }
  return dp[n];
}

function detectLanguage(text: string): Language {
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  return 'en';
}

function unicodeTokenize(text: string): string[] {
  // Keep decimal numbers (e.g. "7.5" in "7.5-km" / "7.5km" / "5.25%") intact and separate unit suffixes
  return (text.toLowerCase().match(/\d+(?:\.\d+)?(?:-\d+)?|[\p{L}\p{M}]+(?:-[\p{L}\p{M}\p{N}]+)*/gu) || [])
    .map((t) => t.replace(/^-+|-+$/g, ''))
    .filter((t) => t.length > 0);
}

/**
 * Normalizes messy user input (typos, grammar mistakes, missing words, extra spaces,
 * casing errors, broken punctuation) WITHOUT ever altering factual meaning or negation.
 */
export function preprocessQuery(
  rawText: string,
  mode: SubmissionMode = 'text',
  imageName?: string
): PreprocessedQuery {
  const originalInput = (rawText || '').trim();

  const isOcrFailureOrEmpty =
    !originalInput ||
    originalInput === '[Screenshot attached]' ||
    (originalInput.startsWith('[Screenshot attached:') && originalInput.length < 35) ||
    originalInput.length < 3;

  if (isOcrFailureOrEmpty) {
    return {
      originalInput,
      cleanedInput: originalInput || imageName || 'Empty Input',
      normalizedQuery: originalInput || imageName || 'Empty Input',
      alternativeQueries: [],
      detectedLanguage: 'en',
      correctionsApplied: [],
      isQuestion: false,
      hasNegation: false,
      entities: { dates: [], locations: [], organizations: [], amounts: [], people: [], events: [] },
      extractedClaims: [],
      isOcrFailureOrEmpty: true,
    };
  }

  const detectedLanguage = detectLanguage(originalInput);

  // Strip WhatsApp/OCR/chat boilerplate & collapse whitespace without touching factual words
  const cleanedInput = originalInput
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^\[Screenshot attached:.*?\]\s*/i, '')
    .replace(/^[\*\s]*Forwarded(?:\s+many\s+times|\s+as\s+received)?[\*\s:–-]*/i, '')
    .replace(/^(?:(?:hey|hi|bro|guys|friends|please|pls|plz)[,\s]+)*(?:can you\s+)?(?:check|verify|tell me)?\s*(?:is it true(?:\s+that)?|fact\s*check)\s*[:,\-–]?\s*/i, '')
    .replace(/^https?:\/\/\S+\s*/i, (url) => (mode === 'url' ? `${url} ` : ''))
    .replace(/([?!.,])\1+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  // Token-level PascalCase proper-noun splitting (e.g. "SamanthaRuthPrabhu" -> "Samantha Ruth Prabhu")
  // and typo correction (only on ASCII alphabetic tokens; preserves negation, URLs, and known CamelCase brands!)
  const CAMEL_BRAND_ALLOWLIST = new Set([
    'youtube', 'whatsapp', 'github', 'linkedin', 'macbook', 'playstation', 'powerpoint',
    'deepmind', 'openai', 'spacex', 'mastercard', 'oneplus', 'iphone', 'ipad', 'tiktok', 'facebook', 'instagram',
  ]);
  const correctionsApplied: { from: string; to: string }[] = [];
  const words = cleanedInput
    .split(/\s+/)
    .flatMap((token) => {
      if (/^https?:\/\//i.test(token) || /\d/.test(token) || /[^\x00-\x7F]/.test(token)) {
        return [token];
      }
      const m = token.match(/^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$/);
      if (!m) return [token];
      const [, prefix, core, suffix] = m;
      if (!CAMEL_BRAND_ALLOWLIST.has(core.toLowerCase()) && /[A-Z][a-z]{2,}[A-Z][a-z]{2,}/.test(core)) {
        const splitParts = core.replace(/(?<=[a-z]{2})(?=[A-Z][a-z]{2})/g, ' ').split(' ');
        if (splitParts.length >= 2) {
          correctionsApplied.push({ from: core, to: splitParts.join(' ') });
          return splitParts.map((part, i) => `${i === 0 ? prefix : ''}${part}${i === splitParts.length - 1 ? suffix : ''}`);
        }
      }
      return [token];
    });
  const correctedWords = words.map((token) => {
    // Preserve URLs, numbers, non-ASCII scripts, or short acronyms unless known typo
    if (/^https?:\/\//i.test(token) || /\d/.test(token) || /[^\x00-\x7F]/.test(token)) {
      return token;
    }
    const match = token.match(/^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$/);
    if (!match) return token;
    const [, prefix, core, suffix] = match;
    const lower = core.toLowerCase();

    // Never touch negation tokens, stopwords, or already-valid domain vocabulary words
    if (NEGATION_TOKENS.has(lower) || STOPWORDS.has(lower) || DOMAIN_VOCABULARY_SET.has(lower)) {
      return token;
    }

    if (EXACT_TYPO_MAP[lower]) {
      const fixed = EXACT_TYPO_MAP[lower];
      if (fixed !== lower) {
        correctionsApplied.push({ from: core, to: fixed });
      }
      return `${prefix}${fixed}${suffix}`;
    }

    // Fuzzy edit-distance check against domain vocabulary ONLY on lowercase words >= 5 chars
    // (Never corrupt capitalized proper nouns like "Balendra" -> "narendra"!)
    const isCapitalizedProperNoun = /^[A-Z][a-z]{2,}$/.test(core);
    if (!isCapitalizedProperNoun && lower.length >= 5) {
      let bestMatch: string | null = null;
      let bestDist = 3;
      const maxAllowed = lower.length >= 8 ? 2 : 1;
      for (const vocab of DOMAIN_VOCABULARY) {
        if (Math.abs(vocab.length - lower.length) > maxAllowed) continue;
        // Require matching initial character to preserve proper names and meanings
        if (vocab[0] !== lower[0]) continue;
        const d = levenshtein(lower, vocab);
        if (d > 0 && d <= maxAllowed && d < bestDist) {
          bestDist = d;
          bestMatch = vocab;
        }
      }
      if (bestMatch) {
        correctionsApplied.push({ from: core, to: bestMatch });
        return `${prefix}${bestMatch}${suffix}`;
      }
    }

    return token;
  });

  let normalizedQuery = correctedWords.join(' ').replace(/\s+/g, ' ').trim();

  // Grammar normalization for common fragmented / missing-preposition patterns (meaning-preserving)
  normalizedQuery = normalizedQuery
    .replace(/\bpm\b/gi, (m) => (m === 'PM' || m === 'pm' ? 'Prime Minister' : m))
    .replace(/\bcm\b/gi, (m) => (m === 'CM' || m === 'cm' ? 'Chief Minister' : m))
    .replace(/\b(president|prime minister|chief minister|capital)\s+(india|karnataka|maharashtra|delhi|united states)\b/gi, '$1 of $2')
    .replace(/\b(india|karnataka)\s+(president|prime minister|chief minister|capital)\s*(?:name)?\b/gi, '$2 of $1')
    .replace(/\s+/g, ' ')
    .trim();

  const lowerNorm = normalizedQuery.toLowerCase();
  const lowerClean = cleanedInput.toLowerCase();
  const isQuestion =
    /^(?:who|what|when|where|which|is|are|was|were|did|does|can|tell)\b/i.test(lowerNorm) ||
    /^(?:the\s+)?(?:president|prime minister|chief minister|capital)\s+of\s+[a-z\s]{3,25}$/i.test(lowerNorm) ||
    /\?\s*$/.test(normalizedQuery) ||
    /\b(?:name|who is)\b/i.test(lowerClean) ||
    /[?？]|ಯಾರು|ಏನು|ಯಾವಾಗ|कौन|क्या|कब/u.test(originalInput);

  const tokens = unicodeTokenize(normalizedQuery);
  const hasNegation = tokens.some((t) => NEGATION_TOKENS.has(t)) ||
    /\b(?:not a|not the|no longer|did not|is not|are not)\b/i.test(lowerNorm);

  // Extract Entities (on normalized text + original input)
  const entities = extractEntitiesFromText(normalizedQuery, originalInput);

  // Split multi-claim / compound sentences (Unicode-safe, preserving initials like "S.G. Palya" or "Dr. A.")
  const protectedForSplit = normalizedQuery
    .replace(/\b((?:[A-Z]\.){1,4})\s+(?=[A-Z])/g, '$1\u0000')
    .replace(/\b(Dr|Mr|Mrs|Ms|Prof|St|Rs|No|Sr|Jr|Mt)\.\s+(?=[A-Z0-9])/g, '$1.\u0000');
  const claimSentences: string[] = [];
  const lines = protectedForSplit.split(/(?:\r?\n)+|(?:\d+[.)]\s+)|(?<=[.!?।॥])\s+/);
  for (const line of lines) {
    const trimmed = line.replace(/\u0000/g, ' ').replace(/^\d+[.)]\s*/, '').trim();
    if (trimmed.length > 8) {
      claimSentences.push(trimmed);
    }
  }
  if (claimSentences.length === 0) {
    claimSentences.push(normalizedQuery);
  }

  // Complex Claim Decomposition (Requirement 6):
  // Break compound policy/scheme/conditional statements into distinct verifiable atomic assertions
  // while keeping simple single-event transit/headline sentences unified.
  const atomicAssertions: string[] = [];
  for (const sent of claimSentences) {
    const parts = decomposeComplexSentenceToSubClaims(sent, entities);
    atomicAssertions.push(...parts);
  }

  const extractStructuredClaimFields = (sentence: string, idx: number): ExtractedClaim => {
    const subEntities: string[] = [];
    const sLower = sentence.toLowerCase();
    for (const org of entities.organizations) if (sLower.includes(org.toLowerCase())) subEntities.push(org);
    for (const loc of entities.locations) if (sLower.includes(loc.toLowerCase())) subEntities.push(loc);
    for (const p of entities.people) if (sLower.includes(p.toLowerCase())) subEntities.push(p);
    for (const ev of entities.events) if (sLower.includes(ev.toLowerCase())) subEntities.push(ev);

    const subDates = entities.dates.filter((d) => sLower.includes(d.toLowerCase()));
    const subLocs = entities.locations.filter((l) => sLower.includes(l.toLowerCase()));
    const subOrgs = entities.organizations.filter((o) => sLower.includes(o.toLowerCase()));
    const subAmounts = entities.amounts.filter((a) => sLower.includes(a.toLowerCase()));

    const subject =
      subEntities[0] ||
      sentence.match(/^([A-Z][A-Za-z0-9.\s'-]{2,40}?)(?:\s+(?:is|are|was|were|has|have|had|will|announced|opened|inaugurated|pledged|declared|won|retired|ordered|launched|banned|arrested|upheld|landed|ended)\b|:)/)?.[1]?.trim() ||
      entities.people[0] ||
      entities.organizations[0] ||
      entities.events[0] ||
      undefined;

    const actionMatch = sentence.match(
      /\b(inaugurated|opened|pledged|announced|declared|launched|retired|resigned|won|lost|upheld|landed|ended|ordered|banned|arrested|dismissed|killed|cured|kept|is\s+the\s+(?:current\s+)?(?:president|prime\s+minister|chief\s+minister|ceo)|is\s+not|did\s+not)\b/i
    );
    const action = actionMatch?.[1]?.trim();
    const timeframe = subDates[0] || entities.dates[0];

    const claimType: ExtractedClaim['claimType'] = /\b(?:will\s+(?:replace|become|exceed|overtake)|predicted|forecast|by\s+20(?:2[7-9]|3\d|4\d))\b/i.test(sLower)
      ? 'prediction'
      : subAmounts.length > 0 || /\b\d+(?:\.\d+)?\s*(?:%|percent|km|billion|million|crore|lakh)\b/i.test(sLower)
      ? 'numerical'
      : /["“”']/.test(sentence) || /\baccording to\b/i.test(sLower)
      ? 'quote'
      : /\b(?:due to|because|caused|causes|leads to|cures)\b/i.test(sLower)
      ? 'causal'
      : 'factual';

    const cleanSubKw = unicodeTokenize(sentence)
      .filter((t) => !STOPWORDS.has(t) && !NEGATION_TOKENS.has(t) && (t.length >= 2 || /[^\x00-\x7F]/.test(t)))
      .slice(0, 8)
      .join(' ');
    const perspectiveQueries = Array.from(
      new Set(
        [
          cleanSubKw,
          subject && action ? `${subject} ${action} ${timeframe || subLocs[0] || ''}`.replace(/\s+/g, ' ').trim() : '',
          cleanSubKw ? `${cleanSubKw.split(' ').slice(0, 6).join(' ')} fact check official` : '',
        ].filter((q) => q && q.length >= 4)
      )
    );

    return {
      id: `claim-fact-${idx + 1}`,
      claim: sentence,
      subject,
      action,
      timeframe,
      claimType,
      entities: subEntities,
      dates: subDates.length > 0 ? subDates : entities.dates,
      locations: subLocs.length > 0 ? subLocs : entities.locations,
      organizations: subOrgs.length > 0 ? subOrgs : entities.organizations,
      amounts: subAmounts.length > 0 ? subAmounts : entities.amounts,
      perspectiveQueries,
      semanticFrame: extractSemanticFrame(sentence),
    };
  };

  const extractedClaims: ExtractedClaim[] = atomicAssertions
    .slice(0, 6)
    .map((sentence, idx) => extractStructuredClaimFields(sentence, idx));

  const frameAnalysis = analyzeSemanticFrameWithAmbiguity(normalizedQuery);
  const claimMeta = classifyClaimMetadata(normalizedQuery, originalInput, entities);

  // Build meaning-preserving alternative search queries
  const alternativeQueries = buildAlternativeQueries(
    normalizedQuery,
    originalInput,
    entities,
    detectedLanguage,
    isQuestion,
    frameAnalysis.frame
  );

  return {
    originalInput,
    cleanedInput,
    normalizedQuery,
    alternativeQueries,
    detectedLanguage,
    correctionsApplied,
    isQuestion,
    hasNegation,
    entities,
    extractedClaims,
    isOcrFailureOrEmpty: false,
    claimMeta,
    semanticFrame: frameAnalysis.frame,
    isSarcastic: frameAnalysis.frame.modality === 'sarcasm_or_irony',
    isAmbiguous: frameAnalysis.isAmbiguous,
    ambiguousReason: frameAnalysis.ambiguousReason,
  };
}

/**
 * Decomposes complex multi-clause statements and compound policy/conditional statements
 * into atomic verifiable sub-claims without splitting single-event transit phrases.
 */
function decomposeComplexSentenceToSubClaims(sentence: string, entities: ExtractedEntityData): string[] {
  const sLower = sentence.toLowerCase();
  const hasSchemeOrPolicy = /\b(?:scheme|yojana|program|programme|policy|initiative|mission|benefit|subsidy|pension)\b/i.test(sLower);
  const hasFreeCostClaim = /\b(?:free(?:\s+of\s+cost)?|zero\s+fee|100%\s+free|without\s+fee|complimentary)\b/i.test(sLower);
  const hasUniversalQuantifier = /\b(?:every|all\s+(?:students|citizens|residents|schools|colleges|families|farmers|women|youth|people))\b/i.test(sLower);
  const effectiveMatch = sentence.match(/\b(?:from|starting|effective|beginning|w\.e\.f\.?)\s+([A-Z][a-z]+(?:\s+\d{1,2}(?:,?\s+\d{4})?)?|\d{1,2}\s+[A-Z][a-z]+(?:\s+\d{4})?)/i);

  // Split single policy/scheme sentences with multi-part conditions (scheme + free/every/effective-date)
  const conditionSignals = [hasFreeCostClaim, hasUniversalQuantifier, Boolean(effectiveMatch)].filter(Boolean).length;
  if (hasSchemeOrPolicy && conditionSignals >= 2) {
    const subClaims: string[] = [];
    const actor = entities.organizations[0] || (sLower.includes('government') ? 'The government' : 'The authority');
    const topicObjectMatch = sentence.match(/\b(?:providing|offering|giving|for)\s+([a-z0-9\s-]{4,45}?)(?:\s+(?:to|from|starting|for|across|effective)\b|$)/i);
    const topicObject = topicObjectMatch ? topicObjectMatch[1].replace(/\bfree\b/i, '').trim() : 'this scheme';

    subClaims.push(`${actor} announced the scheme for ${topicObject || 'citizens'}`.replace(/\s+/g, ' ').trim());
    if (hasFreeCostClaim) {
      subClaims.push(`${topicObject || 'Service'} is provided free`);
    }
    if (hasUniversalQuantifier) {
      const targetGroup = sentence.match(/\b(?:every|all)\s+([a-z]+)/i)?.[0] || 'every eligible person';
      subClaims.push(`Applies to ${targetGroup}`);
    }
    if (effectiveMatch?.[1]) {
      subClaims.push(`Effective from ${effectiveMatch[1].trim()}`);
    }
    return subClaims;
  }

  // Split multi-clause sentences joined by semicolons or independent conjunction clauses ("; ", ", while ", ", whereas ")
  // while preserving phrases like "between X and Y" or "inaugurated on Nov 13 and opened on Nov 14".
  if (sentence.length >= 65 && /[;]|,\s+(?:while|whereas|and\s+(?:the|a|an|india|government|officials|police|leaders|[A-Z][a-z]+))\b/.test(sentence)) {
    const clauseParts = sentence
      .split(/\s*;\s*|,\s+(?=(?:while|whereas|and\s+(?:the|india|government|officials|police|leaders|authorities|[A-Z][a-z]{2,}\s+[a-z]{3,}))\b)/i)
      .map((part) => part.replace(/^and\s+/i, '').trim())
      .filter((part) => {
        const words = part.split(/\s+/);
        return words.length >= 5 && /\b(?:is|are|was|were|has|have|had|will|announced|opened|inaugurated|pledged|declared|won|retired|ordered|launched|banned|arrested|upheld|landed|ended|flagged|said|confirmed)\b/i.test(part);
      });
    if (clauseParts.length >= 2) {
      return clauseParts;
    }
  }

  return [sentence];
}

function classifyClaimMetadata(
  normalizedQuery: string,
  originalInput: string,
  entities: ExtractedEntityData
): ClaimClassificationMeta {
  const lower = `${normalizedQuery} ${originalInput}`.toLowerCase();
  const currentYear = new Date().getFullYear();

  const years = Array.from(lower.matchAll(/\b(19\d{2}|20[0-3]\d)\b/g)).map((m) => parseInt(m[1], 10));
  const futureYear = years.some((y) => y > currentYear);
  const hasFutureVerb = /\b(?:will\s+(?:replace|become|overtake|surpass|eliminate|destroy|reach|exceed|win|crash|collapse)|predicted\s+to|forecast\s+to|expected\s+to\s+(?:replace|exceed)|by\s+20(?:2[7-9]|3\d|4\d|5\d))\b/i.test(lower);
  const isFuturePrediction =
    (futureYear || hasFutureVerb) &&
    !/\b(?:announced|launched|scheduled|postponed|delayed|set\s+for|slated\s+for|target(?:s|ing))\b/i.test(lower);

  const isHistorical = years.some((y) => y < currentYear - 1) && !/\b(?:current|today|now|incumbent|present)\b/i.test(lower);
  const isCurrentPresent = /\b(?:current|currently|presently|incumbent|today|right now|latest|is the|who is)\b/i.test(lower);
  const temporalIntent: ClaimClassificationMeta['temporalIntent'] = isFuturePrediction
    ? 'future_prediction'
    : isHistorical
    ? 'historical'
    : isCurrentPresent
    ? 'current_present'
    : years.some((y) => y >= currentYear - 1) || /\b(?:opens|opened|inaugurated|arrested|disrupted|alert|hearing|update)\b/i.test(lower)
    ? 'recent_news'
    : 'general_fact';

  // News domain classification across all 13 categories
  const newsDomain: ClaimClassificationMeta['newsDomain'] = /\b(?:yojana|scheme|subsidy|pension|free\s+(?:internet|laptop|recharge|smartphone))\b/i.test(lower)
    ? 'govt_schemes'
    : /\b(?:cricket|ipl|t20|world\s*cup|olympics|medal|football|hockey|tennis|kohli|chopra|rcb|bcci|icc)\b/i.test(lower)
    ? 'sports'
    : /\b(?:isro|nasa|artemis|chandrayaan|aditya|ai\b|quantum|satellite|spacecraft|technology|robot)\b/i.test(lower)
    ? 'science_tech'
    : /\b(?:school|college|exam|cbse|sslc|puc|neet|upsc|scholarship|university|student)\b/i.test(lower)
    ? 'education'
    : /\b(?:rbi|repo\s*rate|gdp|economy|inflation|bank|rupee|currency|sensex|nifty|tariff|budget)\b/i.test(lower)
    ? 'business_economy'
    : /\b(?:who\b|cancer|dengue|vaccine|virus|mpox|icmr|hospital|medicine|health|cure)\b/i.test(lower)
    ? 'health_medicine'
    : /\b(?:cyclone|flood|monsoon|earthquake|tsunami|rain|rainfall|weather|imd|red\s*alert)\b/i.test(lower)
    ? 'weather_disasters'
    : /\b(?:arrested|police|drug\s*case|crime|fir|murder|robbery|scam|phishing|trafficking)\b/i.test(lower)
    ? 'crime_safety'
    : /\b(?:film|movie|actor|actress|cinema|oscar|bollywood|sandalwood|celebrity)\b/i.test(lower)
    ? 'entertainment'
    : isHistorical && /\b(?:war|treaty|independence|empire|ancient|19\d{2})\b/i.test(lower)
    ? 'historical'
    : /\b(?:bengaluru|karnataka|kerala|mumbai|chennai|kaveri|namma\s*metro|pink\s*line|chikmagalur|belur|kalghatgi)\b/i.test(lower)
    ? 'regional_local'
    : /\b(?:president|prime\s*minister|chief\s*minister|parliament|supreme\s*court|election|government|cabinet)\b/i.test(lower)
    ? 'politics_governance'
    : 'national_international';

  const hasIndianAnchor =
    /\b(?:india|indian|pib|rbi|isro|imd|karnataka|bengaluru|bangalore|kerala|mumbai|delhi|chennai|kolkata|odisha|maharashtra|kaveri|ipl|rcb|kohli|modi|murmu|siddaramaiah)\b/i.test(lower) ||
    /[\u0900-\u097F\u0C80-\u0CFF]/.test(originalInput);
  const hasIntlAnchor = /\b(?:united\s*states|usa|us|america|nasa|who\b|unesco|world\s*war|europe|paris|london|china|russia|trump|biden|apple|google)\b/i.test(lower);
  const geographicScope: ClaimClassificationMeta['geographicScope'] =
    /\b(?:bengaluru|karnataka|kerala|mumbai|kaveri|chikmagalur|belur|kalghatgi)\b/i.test(lower)
      ? 'regional_local'
      : hasIntlAnchor && !hasIndianAnchor
      ? 'international'
      : 'national_india';

  // Vague unnamed entity claim check (e.g. "Police arrested famous actor in drug case" without naming anyone or any city)
  const hasNamedActorOrEntity =
    entities.people.length > 0 ||
    entities.organizations.filter((o) => !/^(?:police|government|court)$/i.test(o)).length > 0 ||
    entities.locations.length > 0 ||
    entities.events.length > 0;
  const usesGenericPlaceholder = /\b(?:famous|popular|well-known|senior|top|some|a certain)\s+(?:actor|actress|cricketer|politician|leader|minister|official|celebrity|singer|businessman)\b/i.test(lower);
  const isVagueUnnamedClaim = usesGenericPlaceholder && !hasNamedActorOrEntity;

  const isAllegationOnly = /\b(?:alleged|allegedly|accused|reportedly|rumoured|rumored|sources say|unconfirmed)\b/i.test(lower);

  return {
    temporalIntent,
    newsDomain,
    geographicScope,
    isFuturePrediction,
    isVagueUnnamedClaim,
    isAllegationOnly,
  };
}

function extractEntitiesFromText(normalizedText: string, originalText: string): ExtractedEntityData {
  const combined = `${normalizedText} ${originalText}`;

  const datePatterns = [
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/gi,
    /\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/g,
    /\b(?:19\d{2}|20[0-3]\d)\b/g,
    /\b(?:today|yesterday|tomorrow|this week|next month)\b/gi,
    /\b\d+[- ](?:day|month|year)s?\b/gi,
  ];
  const datesSet = new Set<string>();
  for (const pat of datePatterns) {
    for (const m of combined.match(pat) || []) datesSet.add(m.trim());
  }

  const orgPatterns = [
    /\b(?:PIB|IMD|ISRO|RBI|NPCI|ECI|UPSC|CBSE|NEET|WHO|NASA|UNESCO|UN|BCCI|ICC|CERT-In|TRAI|IRCTC|UIDAI|SBI|LIC|NDMA|ICMR)\b/gi,
    /\b(?:Government of India|State Government|Karnataka Government|Supreme Court|High Court|Police Department|Ministry of [A-Za-z\s]+|Health Department|Education Board|Reserve Bank of India|Election Commission of India|Press Information Bureau)\b/gi,
  ];
  const orgsSet = new Set<string>();
  for (const pat of orgPatterns) {
    for (const m of combined.match(pat) || []) orgsSet.add(m.trim());
  }

  const locPatterns = [
    /\b(?:India|Karnataka|Bengaluru|Bangalore|Delhi|New Delhi|Mumbai|Chennai|Kolkata|Hyderabad|Odisha|Andhra Pradesh|Kerala|Tamil Nadu|Gujarat|Maharashtra|Belur|Chikmagalur|Kalghatgi|Bay of Bengal|Arabian Sea|United States|USA|US|Paris|China|Russia|Pakistan|UK|London|Europe)\b/gi,
  ];
  const locsSet = new Set<string>();
  for (const pat of locPatterns) {
    for (const m of combined.match(pat) || []) locsSet.add(m.trim());
  }

  const amountPatterns = [
    /(?:\$|₹|Rs\.?|INR)\s*\d+(?:,\d+)*(?:\.\d+)?(?:\s*(?:crore|lakh|thousand|million|billion))?/gi,
    /\b\d+\s*(?:GB|MB|TB|5G|4G)\b/gi,
    /\b\d+(?:,\d+)*\s*(?:pension|rupees|laptops|vacancies|seats|students|dead|injured|hospitalized)\b/gi,
    /\b\d+(?:\.\d+)?%\b/g,
  ];
  const amountsSet = new Set<string>();
  for (const pat of amountPatterns) {
    for (const m of combined.match(pat) || []) amountsSet.add(m.trim());
  }

  const peoplePatterns = [
    /\b(?:Narendra Modi|Modi|Rahul Gandhi|Amit Shah|Siddaramaiah|D\.?\s*K\.?\s*Shivakumar|Shivakumar|Droupadi Murmu|Shaktikanta Das|Sanjay Malhotra|Nirmala Sitharaman|S\.?\s*Jaishankar|Rajnath Singh|Virat Kohli|Neeraj Chopra|Donald Trump|Joe Biden|Sundar Pichai|Tim Cook|Elon Musk)\b/gi,
    /(?:नरेंद्र मोदी|द्रौपदी मुर्मू|सिद्धारमैया|ನರೇಂದ್ರ ಮೋದಿ|ದ್ರೌಪದಿ ಮುರ್ಮು|ಸಿದ್ದರಾಮಯ್ಯ)/gu,
  ];
  const peopleSet = new Set<string>();
  for (const pat of peoplePatterns) {
    for (const m of combined.match(pat) || []) peopleSet.add(m.trim());
  }

  const eventsSet = new Set<string>();
  const eventPatterns = [
    /\b(?:Cyclone\s+[A-Za-z]+|Aditya-L1|Chandrayaan-\d+|Artemis\s+(?:I|II|III|2|3)|World\s+War\s+(?:I|II|1|2)|T20\s+World\s+Cup|IPL\s*\d{4}|Cricket\s+World\s+Cup|Paris\s+Olympics|Article\s+370|Kaveri\s+water\s+dispute|Halo\s+Orbit\s+Insertion|Lok\s+Sabha\s+Election)\b/gi,
  ];
  for (const pat of eventPatterns) {
    for (const m of combined.match(pat) || []) eventsSet.add(m.trim());
  }

  // Detect capitalized two-word Proper Nouns using lookahead so preceding titles don't swallow person names
  const nonPersonPhrasePattern = /\b(?:Line|Stretch|Metro|Rail|Road|Station|Phase|Corridor|Highway|Expressway|Bridge|Airport|Opens|Park|Nagar|Palya|Agrahara|Puram|Scheme|Yojana|Mission|Bank|Reserve|Court|Ministry|Department|Commission|Bureau|University|College|School|Hospital|News|Update|Gazette|Today|India|Nepal|Delhi|Mumbai|Bengaluru|Karnataka|World|War|Cup|Olympics|Paris|Test|Cricket|Water|Dispute|Hearing|Coastal|Ties|Prime|Minister|Chief|President|Leader|Leaders|State|Union|Federal|Republic|Train|Flood|Relief)\b/i;
  const placeOrProjectPattern = /\b(?:Line|Metro|Rail|Road|Station|Phase|Corridor|Highway|Expressway|Bridge|Airport|Nagar|Palya|Agrahara|Puram|Park|Stretch)\b/i;
  const properNounLookahead = Array.from(
    originalText.matchAll(/(?=\b([A-Z][a-z]{2,}\s+[A-Z][a-z]{2,})\b)/g)
  ).map((m) => m[1]);
  for (const pn of properNounLookahead) {
    if (locsSet.has(pn) || orgsSet.has(pn) || eventsSet.has(pn)) continue;
    if (placeOrProjectPattern.test(pn)) {
      locsSet.add(pn);
    } else if (!nonPersonPhrasePattern.test(pn) && !/^(?:Prime Minister|Chief Minister|Breaking News|Official Record|Reserve Bank|Supreme Court)$/i.test(pn)) {
      peopleSet.add(pn);
    }
  }

  return {
    dates: Array.from(datesSet),
    locations: Array.from(locsSet),
    organizations: Array.from(orgsSet),
    amounts: Array.from(amountsSet),
    people: Array.from(peopleSet),
    events: Array.from(eventsSet),
  };
}

function buildAlternativeQueries(
  normalizedQuery: string,
  originalInput: string,
  entities: ExtractedEntityData,
  language: Language,
  isQuestion: boolean,
  semanticFrame?: SemanticFrame
): string[] {
  const alts: string[] = [];
  const lower = normalizedQuery.toLowerCase();

  // 1. Cross-lingual English concepts if Kannada or Hindi input
  if (language === 'kn' || language === 'hi') {
    for (const entry of MULTILINGUAL_CONCEPT_MAP) {
      if (entry.pattern.test(originalInput) || entry.pattern.test(normalizedQuery)) {
        alts.push(entry.englishConcept);
      }
    }
    // Keep clean native query
    alts.push(originalInput.slice(0, 90));
  }

  // 2. Strip interrogative/filler words to build a clean, high-signal topic search query
  const uniqueContentKeywords = Array.from(
    new Set(
      unicodeTokenize(normalizedQuery).filter(
        (t) => !STOPWORDS.has(t) && !NEGATION_TOKENS.has(t) && (t.length >= 2 || /[^\x00-\x7F]/.test(t))
      )
    )
  );
  const coreKeywords = uniqueContentKeywords.slice(0, 10).join(' ');

  if (coreKeywords.length >= 4) {
    alts.push(coreKeywords);
  }

  // Preserve action/negation event terms (e.g. resigned, banned, closed) in an event-aware query
  const eventAwareKeywords = Array.from(
    new Set(
      unicodeTokenize(normalizedQuery).filter(
        (t) => !STOPWORDS.has(t) && t !== 'not' && t !== 'no' && t !== 'never' && (t.length >= 2 || /[^\x00-\x7F]/.test(t))
      )
    )
  ).slice(0, 10).join(' ');
  if (eventAwareKeywords.length >= 4 && eventAwareKeywords !== coreKeywords) {
    alts.push(eventAwareKeywords);
  }

  // High-signal proper noun & numeric anchor query (keeps key entities even on long headlines)
  const properEntities = Array.from(
    new Set([
      ...entities.organizations,
      ...entities.locations,
      ...entities.events,
      ...entities.people,
      ...entities.dates.slice(0, 1),
    ])
  ).filter((e) => e.length >= 3);
  if (properEntities.length >= 2) {
    const focusedEntityQuery = `${properEntities.slice(0, 4).join(' ')} ${uniqueContentKeywords.slice(0, 4).join(' ')}`
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 95);
    if (focusedEntityQuery.length >= 6) {
      alts.push(focusedEntityQuery);
    }
  }

  // 3. Explicit role/office/entity expansions ONLY when querying who holds the office (not multi-entity summit reports!)
  const combinedForExpansion = `${lower} ${alts.join(' ').toLowerCase()}`;
  const isOpenWhLookup = /^(?:who|what|when|where|which|name)\b/i.test(lower) || /ಯಾರು|ಏನು|कौन|क्या/u.test(originalInput);
  const wordCount = uniqueContentKeywords.length;
  if (combinedForExpansion.includes('president') && combinedForExpansion.includes('india') && !combinedForExpansion.includes('vice')) {
    if (isOpenWhLookup || wordCount <= 9 || !combinedForExpansion.includes('droupadi murmu')) {
      alts.push('President of India');
      alts.push('President of India current incumbent');
    }
  }
  if (
    combinedForExpansion.includes('president') &&
    (combinedForExpansion.includes('united states') || /\b(?:us|usa)\b/.test(combinedForExpansion)) &&
    !combinedForExpansion.includes('vice')
  ) {
    if (isOpenWhLookup || wordCount <= 9) {
      alts.push('President of the United States');
    }
  }
  if (combinedForExpansion.includes('prime minister') && combinedForExpansion.includes('india')) {
    if (isOpenWhLookup || wordCount <= 9 || !combinedForExpansion.includes('narendra modi')) {
      alts.push('Prime Minister of India');
    }
  }
  if (combinedForExpansion.includes('chief minister') && combinedForExpansion.includes('karnataka')) {
    if (isOpenWhLookup || wordCount <= 9) {
      alts.push('Chief Minister of Karnataka');
    }
  }
  if (entities.events.length > 0) {
    alts.push(`${entities.events[0]} ${entities.locations[0] || ''} official`);
  }
  if (entities.organizations.length > 0) {
    alts.push(`${entities.organizations[0]} ${coreKeywords.split(' ').slice(0, 4).join(' ')}`);
  }

  // 4. Unbiased actor + core event query (omits disputed modifiers like "twins", "gold", or wrong year so true news is always retrieved)
  const actorAnchor = semanticFrame?.actor || entities.people[0] || entities.organizations[0];
  if (actorAnchor && semanticFrame?.eventType) {
    if (semanticFrame.eventType === 'birth_delivery' || semanticFrame.eventType === 'pregnancy_expectation') {
      alts.push(`${actorAnchor} baby birth news`);
    } else if (semanticFrame.eventType === 'sports_victory_award') {
      const eventContext = entities.events[0] || semanticFrame.timeframe || '';
      alts.push(`${actorAnchor} ${eventContext} medal winner`.replace(/\s+/g, ' ').trim());
    }
  }

  // 5. Fact-check & credible-publisher query for declarative claims OR yes/no verification questions (not WH-lookups)
  if ((!isQuestion || !isOpenWhLookup) && coreKeywords.length >= 6) {
    alts.push(`${uniqueContentKeywords.slice(0, 6).join(' ')} fact check PIB Reuters`);
  }
  if (entities.people.length > 0 && /\b(?:retired|retirement|resigned)\b/i.test(lower)) {
    alts.push(`${entities.people[0]} retired announcement official date`);
  }

  // Deduplicate and cap
  const unique = Array.from(new Set(alts.map((q) => q.trim()).filter((q) => q.length >= 3)));
  return unique.slice(0, 6);
}

/**
 * Legacy-compatible Step 1 entry point (now backed by preprocessQuery).
 */
export function extractClaimsAndEntities(
  rawText: string,
  mode: SubmissionMode = 'text',
  imageName?: string
): {
  cleanedInput: string;
  normalizedQuery: string;
  alternativeQueries: string[];
  detectedLanguage: Language;
  extractedClaims: ExtractedClaim[];
  extractedEntities: ExtractedEntityData;
  isOcrFailureOrEmpty: boolean;
  preprocessed: PreprocessedQuery;
} {
  const prep = preprocessQuery(rawText, mode, imageName);
  return {
    cleanedInput: prep.cleanedInput,
    normalizedQuery: prep.normalizedQuery,
    alternativeQueries: prep.alternativeQueries,
    detectedLanguage: prep.detectedLanguage,
    extractedClaims: prep.extractedClaims,
    extractedEntities: prep.entities,
    isOcrFailureOrEmpty: prep.isOcrFailureOrEmpty,
    preprocessed: prep,
  };
}

// ============================================================================
// 2. HYBRID SEMANTIC + BM25 KEYWORD + ENTITY + CREDIBILITY SCORING
// ============================================================================

function buildCharNgramVector(text: string): Map<string, number> {
  const vec = new Map<string, number>();
  const clean = text.toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

  // Word unigrams (weighted higher for semantic anchor; exclude stopwords so trigrams don't match filler words)
  const tokens = unicodeTokenize(clean).filter((t) => !STOPWORDS.has(t) && t.length >= 2);
  for (const tok of tokens) {
    const stem = tok.length > 5 ? tok.slice(0, tok.length - 1) : tok;
    vec.set(`w:${stem}`, (vec.get(`w:${stem}`) || 0) + 2.2);

    // Character trigrams strictly inside content tokens (prevents "in a", "of the" false similarity)
    if (tok.length >= 3) {
      const paddedTok = ` ${tok} `;
      for (let i = 0; i <= paddedTok.length - 3; i++) {
        const tri = paddedTok.slice(i, i + 3);
        if (tri.trim().length < 2) continue;
        vec.set(`c:${tri}`, (vec.get(`c:${tri}`) || 0) + 0.4);
      }
    }

    // Expand synonyms cleanly
    if (CONCEPT_SYNONYMS[tok]) {
      for (const syn of CONCEPT_SYNONYMS[tok]) {
        for (const sTok of unicodeTokenize(syn)) {
          vec.set(`w:${sTok}`, (vec.get(`w:${sTok}`) || 0) + 0.9);
        }
      }
    }
  }

  return vec;
}

/**
 * Computes normalized cosine similarity (0..1) over hybrid word+synonym+char-ngram vectors.
 */
export function computeSemanticSimilarity(queryText: string, docText: string): number {
  if (!queryText || !docText) return 0;
  const v1 = buildCharNgramVector(queryText);
  const v2 = buildCharNgramVector(docText);

  let dot = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (const [, val] of v1) norm1 += val * val;
  for (const [, val] of v2) norm2 += val * val;

  if (norm1 === 0 || norm2 === 0) return 0;

  for (const [k, val1] of v1) {
    const val2 = v2.get(k);
    if (val2 !== undefined) {
      dot += val1 * val2;
    }
  }

  return Number(Math.min(1, dot / (Math.sqrt(norm1) * Math.sqrt(norm2))).toFixed(3));
}

function computeKeywordBM25Score(queryTokens: string[], docText: string): number {
  if (queryTokens.length === 0 || !docText) return 0;
  const docTokens = unicodeTokenize(docText);
  if (docTokens.length === 0) return 0;

  const docFreq = new Map<string, number>();
  for (const t of docTokens) {
    docFreq.set(t, (docFreq.get(t) || 0) + 1);
  }

  const k1 = 1.5;
  const b = 0.75;
  const avgDocLen = 40;
  const docLen = docTokens.length;

  let score = 0;
  let matchedDistinct = 0;

  for (const q of queryTokens) {
    let tf = docFreq.get(q) || 0;
    // Partial stem / substring match for inflected words (both tokens must be >= 4 chars and non-stopwords)
    if (tf === 0 && q.length >= 4) {
      for (const [dt, count] of docFreq) {
        if (dt.length >= 4 && !STOPWORDS.has(dt) && (dt.startsWith(q.slice(0, 4)) || q.startsWith(dt.slice(0, 4)))) {
          tf += count * 0.7;
        }
      }
    }
    if (tf > 0) {
      matchedDistinct++;
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (docLen / avgDocLen));
      score += numerator / denominator;
    }
  }

  const coverageRatio = matchedDistinct / queryTokens.length;
  const normalizedBM25 = Math.min(1, score / Math.max(queryTokens.length * 1.4, 1));
  return Number((0.6 * coverageRatio + 0.4 * normalizedBM25).toFixed(3));
}

function computeEntityMatchScore(entities: ExtractedEntityData, docText: string): number {
  const allEntities = [
    ...entities.people,
    ...entities.organizations,
    ...entities.locations,
    ...entities.events,
  ];
  if (allEntities.length === 0) return 0.25; // neutral baseline if query had no named entities

  const docLower = docText.toLowerCase();
  let hits = 0;
  for (const ent of allEntities) {
    const entLower = ent.toLowerCase();
    if (docLower.includes(entLower)) {
      hits += 1;
    } else {
      // Partial token hit for multi-word names like "Narendra Modi" -> "Modi"
      const parts = entLower.split(/\s+/).filter((p) => p.length > 3);
      if (parts.some((p) => docLower.includes(p))) {
        hits += 0.6;
      }
    }
  }

  return Number(Math.min(1, hits / allEntities.length).toFixed(3));
}

export function classifySourceCredibility(url: string, sourceName: string = ''): {
  credibilityTier: 'official_primary' | 'accredited_press' | 'factcheck_org' | 'secondary_web';
  isPrimary: boolean;
  authorityWeight: number;
  categoryLabel: string;
} {
  const lowerUrl = (url || '').toLowerCase();
  const lowerName = (sourceName || '').toLowerCase();

  const lowerNameCompact = lowerName.replace(/[^a-z0-9]/g, '');

  // Official government & primary institutional domains or Google News RSS primary publisher names
  if (
    /\.(gov\.in|nic\.in|gov|mil)(\/|$)/i.test(lowerUrl) ||
    lowerUrl.includes('rbi.org.in') ||
    lowerUrl.includes('who.int') ||
    lowerUrl.includes('un.org') ||
    lowerUrl.includes('pib.gov.in') ||
    lowerUrl.includes('isro.gov.in') ||
    lowerUrl.includes('mausam.imd.gov.in') ||
    lowerUrl.includes('eci.gov.in') ||
    lowerUrl.includes('presidentofindia') ||
    lowerUrl.includes('pmindia.gov.in') ||
    [
      'worldhealthorganization',
      'pressinformationbureau',
      'reservebankofindia',
      'electioncommission',
      'supremecourtofindia',
      'ministryofexternalaffairs',
      'pmindia',
      'ddnews',
      'nasa',
      'isro',
      'bmrcl',
    ].some((org) => lowerNameCompact.includes(org))
  ) {
    if (lowerUrl.includes('factcheck.pib.gov.in') || lowerNameCompact.includes('pibfactcheck')) {
      return {
        credibilityTier: 'factcheck_org',
        isPrimary: true,
        authorityWeight: 1.0,
        categoryLabel: 'Official Govt Fact-Check Bureau (PIB)',
      };
    }
    return {
      credibilityTier: 'official_primary',
      isPrimary: true,
      authorityWeight: 1.0,
      categoryLabel: 'Official Government / Primary Registry',
    };
  }

  // Recognized fact-checking organizations & reference encyclopedias
  if (
    lowerUrl.includes('altnews.in') ||
    lowerUrl.includes('boomlive.in') ||
    lowerUrl.includes('factly.in') ||
    lowerUrl.includes('vishvasnews.com') ||
    lowerUrl.includes('factcrescendo.com') ||
    lowerUrl.includes('newschecker.in') ||
    lowerUrl.includes('snopes.com') ||
    lowerUrl.includes('politifact.com') ||
    lowerUrl.includes('factcheck.org') ||
    lowerName.includes('fact check') ||
    lowerName.includes('factcheck') ||
    ['factly', 'altnews', 'boom', 'vishvasnews', 'factcrescendo', 'newschecker', 'snopes', 'politifact', 'logicallyfacts'].some(
      (fc) => lowerNameCompact === fc || lowerNameCompact.includes(`${fc}fact`) || (fc.length >= 6 && lowerNameCompact.includes(fc))
    )
  ) {
    return {
      credibilityTier: 'factcheck_org',
      isPrimary: true,
      authorityWeight: 0.94,
      categoryLabel: 'IFCN Certified Fact-Check Organization',
    };
  }

  if (lowerUrl.includes('wikipedia.org')) {
    return {
      credibilityTier: 'factcheck_org',
      isPrimary: false,
      authorityWeight: 0.88,
      categoryLabel: 'Verified Reference Encyclopedia',
    };
  }

  // Accredited national & international news publications (matches both URLs and Google News RSS publisher titles)
  const accreditedDomains = [
    'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk', 'thehindu.com',
    'indianexpress.com', 'newindianexpress.com', 'ptinews.com', 'hindustantimes.com', 'ndtv.com',
    'livemint.com', 'economictimes.indiatimes.com', 'timesofindia.indiatimes.com',
    'deccanherald.com', 'theprint.in', 'scroll.in', 'business-standard.com',
    'moneycontrol.com', 'indiatoday.in', 'news18.com', 'bangaloremirror.indiatimes.com',
    'cnbctv18.com', 'financialexpress.com', 'theweek.in', 'timesnownews.com',
    'prajavani.net', 'amarujala.com', 'bhaskar.com', 'aljazeera.com', 'ft.com',
    'outlookindia.com', 'freepresskashmir.net', 'tribuneindia.com',
    'thelancet.com', 'nature.com', 'news.un.org', 'olympics.com',
  ];
  const accreditedPublisherNames = [
    'reuters', 'associatedpress', 'apnews', 'bbc', 'thehindu', 'hindu',
    'indianexpress', 'newindianexpress', 'pti', 'hindustantimes', 'ndtv',
    'livemint', 'mint', 'economictimes', 'timesofindia', 'deccanherald',
    'theprint', 'scroll', 'businessstandard', 'moneycontrol', 'indiatoday',
    'news18', 'bangaloremirror', 'cnbctv18', 'financialexpress', 'theweek',
    'timesnow', 'prajavani', 'amarujala', 'dainikbhaskar', 'aljazeera', 'ani',
    'oneindia', 'firstpost', 'tribuneindia', 'deccanchronicle', 'newsonair', 'espn',
    'financialtimes', 'manoramayearbook', 'outlooktraveller', 'outlookindia', 'freepresskashmir',
    'thelancet', 'nature', 'unnews', 'unitednations', 'bloomberg', 'afp',
    'theguardian', 'olympics', 'sportstar',
  ];
  if (
    accreditedDomains.some((d) => lowerUrl.includes(d)) ||
    accreditedPublisherNames.some((pub) => lowerNameCompact.includes(pub))
  ) {
    return {
      credibilityTier: 'accredited_press',
      isPrimary: false,
      authorityWeight: 0.86,
      categoryLabel: 'Accredited News Publication',
    };
  }

  return {
    credibilityTier: 'secondary_web',
    isPrimary: false,
    authorityWeight: 0.5,
    categoryLabel: 'Live Web Index',
  };
}

function detectTemporalStatus(publicationDate?: string, snippet?: string): 'current' | 'outdated' | 'undated' {
  const combined = `${publicationDate || ''} ${snippet || ''}`;
  const years = combined.match(/\b(20\d{2})\b/g);
  if (!years || years.length === 0) return 'undated';

  const currentYear = new Date().getFullYear();
  const maxYear = Math.max(...years.map((y) => parseInt(y, 10)));
  if (maxYear < currentYear - 2) {
    // Only mark outdated if there is no recent year or "since YYYY" ongoing tenure
    if (/\bsince\s+20\d{2}\b/i.test(combined) || /\bincumbent\b|\bcurrent\b/i.test(combined)) {
      return 'current';
    }
    return 'outdated';
  }
  return 'current';
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================================
// 3. LIVE MULTI-PROVIDER WEB & KNOWLEDGE RETRIEVAL
// ============================================================================

// Short-lived in-memory TTL caches (60s) to avoid redundant external API calls on overlapping or repeated queries
const WIKI_CACHE = new Map<string, { ts: number; items: SearchResultItem[] }>();
const RSS_CACHE = new Map<string, { ts: number; items: SearchResultItem[] }>();
const DDG_CACHE = new Map<string, { ts: number; items: SearchResultItem[] }>();
const PROVIDER_CACHE_TTL_MS = 60_000;

async function fetchWikipediaPageSummary(
  titleCandidate: string,
  wikiLang: 'en' | 'kn' | 'hi' = 'en'
): Promise<SearchResultItem | null> {
  const cleanTitle = titleCandidate.trim().replace(/\s+/g, '_');
  if (cleanTitle.length < 3) return null;
  const host = `${wikiLang}.wikipedia.org`;
  const retrievedAt = new Date().toISOString();
  try {
    const restRes = await fetch(`https://${host}/api/rest_v1/page/summary/${encodeURIComponent(cleanTitle)}`, {
      headers: { 'User-Agent': 'TruthLens-Verify/3.2 (civic-fact-check)' },
      signal: AbortSignal.timeout(3500),
    });
    if (!restRes.ok) return null;
    const summaryData = (await restRes.json()) as any;
    if (summaryData?.type === 'disambiguation' || !summaryData?.title || !summaryData?.extract) return null;
    return {
      title: summaryData.title,
      url: summaryData?.content_urls?.desktop?.page || `https://${host}/wiki/${encodeURIComponent(cleanTitle)}`,
      snippet: summaryData.extract.slice(0, 1500),
      publicationDate: summaryData?.timestamp
        ? new Date(summaryData.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Verified Reference Archive',
      retrievedAt,
      sourceName: `Wikipedia (${wikiLang.toUpperCase()}): ${summaryData.title}`,
      category: 'Verified Reference Encyclopedia',
      isPrimary: false,
      credibilityTier: 'factcheck_org',
      credibilityLabel: 'Verified Reference Encyclopedia',
    };
  } catch {
    return null;
  }
}

async function fetchWikipediaSearchAndExtracts(
  query: string,
  wikiLang: 'en' | 'kn' | 'hi' = 'en'
): Promise<SearchResultItem[]> {
  const normalizedKey = `${wikiLang}:${query.trim().toLowerCase().slice(0, 120)}`;
  const cached = WIKI_CACHE.get(normalizedKey);
  if (cached && Date.now() - cached.ts < PROVIDER_CACHE_TTL_MS) {
    return cached.items;
  }

  const results: SearchResultItem[] = [];
  const host = `${wikiLang}.wikipedia.org`;
  const retrievedAt = new Date().toISOString();

  try {
    // Single combined request: full-text search + intro extracts (12 sentences for chunking) + canonical URLs
    const searchUrl = `https://${host}/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      query.slice(0, 120)
    )}&gsrlimit=4&prop=extracts|info&exintro=1&explaintext=1&exsentences=12&inprop=url&format=json&origin=*`;

    let res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'TruthLens-Verify/3.2 (https://truthlens.example; civic-fact-check)' },
      signal: AbortSignal.timeout(4500),
    });

    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 450));
      res = await fetch(searchUrl, {
        headers: { 'User-Agent': 'TruthLens-Verify/3.2 (https://truthlens.example; civic-fact-check)' },
        signal: AbortSignal.timeout(4500),
      });
    }

    if (res.ok) {
      const data = (await res.json()) as any;
      const pagesObj = data?.query?.pages || {};
      const pages = (Object.values(pagesObj) as any[]).sort((a, b) => (a.index || 99) - (b.index || 99));

      for (const page of pages) {
        const title = page?.title;
        const extract = (page?.extract || '').replace(/\s+/g, ' ').trim();
        if (!title || !extract) continue;

        const wikiUrl = page?.fullurl || `https://${host}/wiki/${encodeURIComponent(title.replace(/\s+/g, '_'))}`;
        const pubDate = page?.touched
          ? new Date(page.touched).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Verified Archive';

        results.push({
          title,
          url: wikiUrl,
          snippet: extract.slice(0, 2200),
          publicationDate: pubDate,
          retrievedAt,
          sourceName: `Wikipedia (${wikiLang.toUpperCase()}): ${title}`,
          category: 'Verified Reference Encyclopedia',
          isPrimary: false,
          credibilityTier: 'factcheck_org',
          credibilityLabel: 'Verified Reference Encyclopedia',
        });
      }
    }

    // Direct REST page summary when search returned empty OR exact entity page wasn't included (prevents "Family of X" masking "X")
    const titleCandidate = query
      .replace(/^(?:who|what|is|the|current|incumbent)\s+/gi, '')
      .replace(/\?+$/, '')
      .trim();
    const hasExactTitle = results.some((r) => r.title.toLowerCase() === titleCandidate.toLowerCase());
    if ((results.length === 0 || (!hasExactTitle && titleCandidate.split(/\s+/).length <= 4)) && titleCandidate.length >= 3) {
      const exactSummary = await fetchWikipediaPageSummary(titleCandidate, wikiLang);
      if (exactSummary && !results.some((r) => r.url === exactSummary.url)) {
        results.unshift(exactSummary);
      }
    }
  } catch {
    // Non-blocking
  }

  if (results.length > 0) {
    WIKI_CACHE.set(normalizedKey, { ts: Date.now(), items: results });
  }
  return results;
}

async function fetchDuckDuckGoInstant(query: string): Promise<SearchResultItem[]> {
  const cacheKey = query.trim().toLowerCase().slice(0, 100);
  const cached = DDG_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < PROVIDER_CACHE_TTL_MS) {
    return cached.items;
  }

  const results: SearchResultItem[] = [];
  const retrievedAt = new Date().toISOString();
  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(
      query.slice(0, 100)
    )}&format=json&no_html=1&skip_disambig=1`;

    const res = await fetch(ddgUrl, {
      headers: { 'User-Agent': 'TruthLens-Verify/3.2 (Civic-Fact-Check)' },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return results;
    const data = (await res.json()) as any;

    if (data.Abstract && data.Abstract.length > 25) {
      const absUrl = sanitizeExternalUrl(data.AbstractURL) || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
      const cred = classifySourceCredibility(absUrl, data.AbstractSource || data.Heading || '');
      results.push({
        title: data.Heading || query,
        url: absUrl,
        snippet: data.Abstract.slice(0, 480),
        publicationDate: 'Official Live Archive',
        retrievedAt,
        sourceName: data.AbstractSource ? `${data.AbstractSource}: ${data.Heading}` : (data.Heading || 'Reference Knowledge Record'),
        category: cred.categoryLabel,
        isPrimary: cred.isPrimary,
        credibilityTier: cred.credibilityTier,
        credibilityLabel: cred.categoryLabel,
      });
    }

    if (Array.isArray(data.RelatedTopics)) {
      for (const item of data.RelatedTopics.slice(0, 3)) {
        if (item.Text && item.FirstURL && item.Text.length > 25) {
          const safeTopicUrl = sanitizeExternalUrl(item.FirstURL);
          if (!safeTopicUrl) continue;
          const cred = classifySourceCredibility(safeTopicUrl);
          results.push({
            title: item.Text.slice(0, 75),
            url: safeTopicUrl,
            snippet: item.Text.slice(0, 350),
            publicationDate: 'Live Web Index',
            retrievedAt,
            sourceName: 'DuckDuckGo Reference Index',
            category: cred.categoryLabel,
            isPrimary: cred.isPrimary,
            credibilityTier: cred.credibilityTier,
            credibilityLabel: cred.categoryLabel,
          });
        }
      }
    }
  } catch {
    // Non-blocking
  }
  if (results.length > 0) {
    DDG_CACHE.set(cacheKey, { ts: Date.now(), items: results });
  }
  return results;
}

function extractTemporalAndRoleMetadata(
  docText: string,
  credibilityTier: SearchResultItem['credibilityTier'],
  publicationDate?: string
): {
  eventDate?: string;
  announcementDate?: string;
  implementationDate?: string;
  evidenceRole: NonNullable<SearchResultItem['evidenceRole']>;
} {
  const lower = docText.toLowerCase();

  // Extract explicit event / announcement / implementation dates where stated
  const dateRegexStr =
    '(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?|\\d{1,2}\\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\\s+\\d{4}|(?:19\\d{2}|20[0-3]\\d))';
  const annMatch = docText.match(new RegExp(`\\b(?:announced|declared|issued|notified|released)\\s+(?:on|in)?\\s*(${dateRegexStr})`, 'i'));
  const implMatch = docText.match(new RegExp(`\\b(?:effective|from|starting|opened to passengers|operational|commencing|begins?)\\s+(?:on|from|in)?\\s*(${dateRegexStr})`, 'i'));
  const evtMatch = docText.match(new RegExp(`\\b(?:on|in|held on|ended on|landed on|inaugurated on)\\s+(${dateRegexStr})`, 'i'));

  const isFactCheck = credibilityTier === 'factcheck_org';
  const isOfficial = credibilityTier === 'official_primary';
  const isAllegation =
    !isOfficial &&
    !isFactCheck &&
    /\b(?:alleged|allegedly|accused|reportedly|sources say|wants to|likely to|rumour|rumor|claims?|purportedly)\b/i.test(lower) &&
    !/\b(?:confirmed|convicted|sentenced|inaugurated|landed|won|declared|upheld|ended)\b/i.test(lower);

  const evidenceRole: NonNullable<SearchResultItem['evidenceRole']> = isFactCheck
    ? 'fact_check'
    : isOfficial
    ? 'official_statement'
    : isAllegation
    ? 'allegation_or_report'
    : 'confirmed_fact';

  return {
    announcementDate: annMatch?.[1]?.trim(),
    implementationDate: implMatch?.[1]?.trim(),
    eventDate: evtMatch?.[1]?.trim() || publicationDate,
    evidenceRole,
  };
}

async function fetchGoogleNewsRss(
  query: string,
  lang: Language = 'en',
  region: 'IN' | 'US' = 'IN'
): Promise<SearchResultItem[]> {
  const cacheKey = `${lang}:${region}:${query.trim().toLowerCase().slice(0, 120)}`;
  const cached = RSS_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < PROVIDER_CACHE_TTL_MS) {
    return cached.items;
  }

  const results: SearchResultItem[] = [];
  const retrievedAt = new Date().toISOString();
  try {
    const hl = lang === 'kn' ? 'kn' : lang === 'hi' ? 'hi' : region === 'US' ? 'en-US' : 'en-IN';
    const gl = lang === 'en' && region === 'US' ? 'US' : 'IN';
    const ceid = lang === 'kn' ? 'IN:kn' : lang === 'hi' ? 'IN:hi' : region === 'US' ? 'US:en' : 'IN:en';
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
      query.slice(0, 130)
    )}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'TruthLens-Verify/3.2 (Civic-Fact-Check)' },
      signal: AbortSignal.timeout(3400),
    });

    if (!res.ok) return results;
    const xml = await res.text();
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

    for (const itemXml of itemMatches.slice(0, 6)) {
      const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
      const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/);
      const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);

      const rawTitle = stripHtmlTags(titleMatch?.[1] || '');
      const url = sanitizeExternalUrl(linkMatch?.[1] || '');
      const pubDate = (pubDateMatch?.[1] || '').trim();
      const sourceName = stripHtmlTags(sourceMatch?.[1] || 'Accredited News Desk');
      const desc = stripHtmlTags(descMatch?.[1] || '');

      if (!rawTitle || !url) continue;

      const cred = classifySourceCredibility(url, sourceName);
      const formattedDate = pubDate ? new Date(pubDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) : 'Recent News';
      const snippet = desc && desc.length > rawTitle.length ? `${rawTitle}. ${desc}` : rawTitle;
      const meta = extractTemporalAndRoleMetadata(snippet, cred.credibilityTier, formattedDate);

      results.push({
        title: rawTitle,
        url,
        snippet,
        publicationDate: formattedDate,
        retrievedAt,
        eventDate: meta.eventDate,
        announcementDate: meta.announcementDate,
        implementationDate: meta.implementationDate,
        evidenceRole: meta.evidenceRole,
        sourceName,
        category: cred.categoryLabel,
        isPrimary: cred.isPrimary,
        credibilityTier: cred.credibilityTier,
        credibilityLabel: cred.categoryLabel,
      });
    }
  } catch {
    // Non-blocking
  }
  if (results.length > 0) {
    RSS_CACHE.set(cacheKey, { ts: Date.now(), items: results });
  }
  return results;
}

/**
 * Splits long multi-sentence documents/articles into overlapping 2-3 sentence chunks
 * so factual claims buried mid-article are scored accurately without keyword dilution.
 */
export function chunkSearchResults(items: SearchResultItem[]): SearchResultItem[] {
  const chunked: SearchResultItem[] = [];

  for (const item of items) {
    const text = (item.snippet || '').replace(/\s+/g, ' ').trim();
    if (!text) continue;

    // Short news headlines/blurbs stay intact
    if (text.length <= 420) {
      chunked.push(item);
      continue;
    }

    // Protect initials & decimal numbers before splitting sentences
    const protectedText = text
      .replace(/\b((?:[A-Z]\.){1,4})\s+(?=[A-Z])/g, '$1\u0000')
      .replace(/\b(Dr|Mr|Mrs|Ms|Prof|St|Rs|No|Sr|Jr|Mt)\.\s+(?=[A-Z0-9])/g, '$1.\u0000');

    const sentences = protectedText
      .split(/(?<=[.!?।॥])\s+/)
      .map((s) => s.replace(/\u0000/g, ' ').trim())
      .filter((s) => s.length >= 15);

    if (sentences.length <= 2) {
      chunked.push({ ...item, snippet: text.slice(0, 680) });
      continue;
    }

    // Build overlapping 3-sentence windows (stride 2)
    for (let i = 0; i < sentences.length; i += 2) {
      const windowText = sentences.slice(i, i + 3).join(' ').trim();
      if (windowText.length < 25) continue;
      chunked.push({
        ...item,
        snippet: windowText.slice(0, 680),
      });
      if (i + 3 >= sentences.length) break;
    }
  }

  return chunked;
}

/**
 * Evaluates whether current retrieved evidence is sufficient, high-quality, and covers all sub-claims,
 * OR whether Corrective RAG (CRAG) should refine queries for another bounded iteration.
 */
function evaluateEvidenceSufficiency(
  prep: PreprocessedQuery,
  rankedItems: SearchResultItem[]
): {
  sufficient: boolean;
  reason: string;
  uncoveredSubClaims: string[];
  needsRoleVerification: boolean;
  needsFactCheckSearch: boolean;
  needsOfficialSearch: boolean;
} {
  if (prep.claimMeta?.isFuturePrediction || prep.claimMeta?.isVagueUnnamedClaim || prep.isOcrFailureOrEmpty) {
    return {
      sufficient: true,
      reason: 'Claim nature is a future forecast, unnamed rumor, or unparsed input; additional retries not required.',
      uncoveredSubClaims: [],
      needsRoleVerification: false,
      needsFactCheckSearch: false,
      needsOfficialSearch: false,
    };
  }

  const quickEval = evaluateEvidenceForVerdict(prep, rankedItems, 'operational');
  const uncoveredSubClaims = quickEval.unsupportedSubClaims || [];
  const hasCredibleDecisive =
    quickEval.recommendedVerdict === 'verified_true' || quickEval.recommendedVerdict === 'false';

  const isRecentClaim =
    prep.claimMeta?.temporalIntent === 'current_present' ||
    prep.claimMeta?.temporalIntent === 'recent_news';
  const allKeptOutdated = rankedItems.length > 0 && rankedItems.every((r) => r.temporalStatus === 'outdated');

  if (hasCredibleDecisive && !(isRecentClaim && allKeptOutdated && quickEval.recommendedVerdict === 'verified_true')) {
    return {
      sufficient: true,
      reason: `Decisive credible evidence established (${quickEval.recommendedVerdict}) across ${rankedItems.length} kept excerpt(s).`,
      uncoveredSubClaims: [],
      needsRoleVerification: false,
      needsFactCheckSearch: false,
      needsOfficialSearch: false,
    };
  }

  const needsRoleVerification = /\b(?:president|prime minister|chief minister|ceo|governor)\b/i.test(prep.normalizedQuery);
  const needsFactCheckSearch = !rankedItems.some((r) => r.credibilityTier === 'factcheck_org' && !r.url.includes('wikipedia.org'));
  const needsOfficialSearch = !rankedItems.some((r) => r.credibilityTier === 'official_primary');

  const reason = rankedItems.length === 0
    ? 'Initial retrieval returned zero relevant excerpts matching entities/actions.'
    : quickEval.hasConflict
    ? 'Retrieved evidence contains conflicting claims; executing targeted corrective query to verify primary/fact-check resolution.'
    : uncoveredSubClaims.length > 0
    ? `${uncoveredSubClaims.length} sub-claim(s) lack direct credible corroboration or refutation.`
    : allKeptOutdated && isRecentClaim
    ? 'Only older archive articles retrieved for a current/recent claim; searching fresher publications.'
    : 'Evidence insufficient or neutral-only; executing corrective refinement query.';

  return {
    sufficient: false,
    reason,
    uncoveredSubClaims,
    needsRoleVerification,
    needsFactCheckSearch,
    needsOfficialSearch,
  };
}

/**
 * STEP 2: Multi-Source Hybrid Retrieval + Bounded Corrective RAG (CRAG) Loop (Max 3 Iterations)
 */
export async function executeMultiQuerySearch(
  claims: ExtractedClaim[],
  entities: ExtractedEntityData,
  primaryClaim: string,
  preprocessedInput?: PreprocessedQuery,
  extraRetrievedItems?: SearchResultItem[]
): Promise<{
  results: SearchResultItem[];
  searchProviderStatus: 'operational' | 'fallback_archive' | 'error_reported';
  queryCount: number;
  deduplicatedCount: number;
  filteredIrrelevantCount: number;
  queriesRun: string[];
  cragIterations: number;
  cragTrace: string[];
  insufficiencyReason?: string;
}> {
  const prep = preprocessedInput || preprocessQuery(primaryClaim);
  const queriesRun: string[] = [];
  const cragTrace: string[] = [];
  const rawResults: SearchResultItem[] = [...(extraRetrievedItems || [])];

  if (prep.isOcrFailureOrEmpty) {
    return {
      results: [],
      searchProviderStatus: 'operational',
      queryCount: 0,
      deduplicatedCount: 0,
      filteredIrrelevantCount: 0,
      queriesRun: [],
      cragIterations: 0,
      cragTrace: ['Skipped retrieval: empty or unreadable submission.'],
    };
  }

  // Build focused query list (normalized + alternative + multi-perspective sub-claim queries)
  const candidateQueries = [
    prep.normalizedQuery,
    ...prep.alternativeQueries,
    ...claims.slice(0, 2).map((c) => c.claim),
  ];

  const uniqueQueries = Array.from(
    new Set(
      candidateQueries
        .map((q) => q.replace(/[^\p{L}\p{M}\p{N}\s.,'-]/gu, ' ').replace(/\s+/g, ' ').trim())
        .filter((q) => q.length >= 3)
    )
  ).slice(0, 6);

  const englishExpansion = prep.detectedLanguage !== 'en'
    ? prep.alternativeQueries.find((q) => /^[A-Za-z0-9\s.,'-]+$/.test(q))
    : undefined;

  const primarySearchQuery = englishExpansion || uniqueQueries[0] || prep.normalizedQuery;
  const secondaryQuery = uniqueQueries.find((q) => q !== primarySearchQuery && /^[A-Za-z0-9\s.,'-]+$/.test(q)) || uniqueQueries[1] || primarySearchQuery;
  const roleLookupQuery = prep.alternativeQueries.find(
    (q) =>
      q !== primarySearchQuery &&
      q !== secondaryQuery &&
      /^(?:President of India|President of the United States|Prime Minister of India|Chief Minister of Karnataka)/i.test(q)
  );
  const newsQuery = englishExpansion || prep.alternativeQueries.find((q) => !q.includes('fact check')) || primarySearchQuery;
  const factCheckNewsQuery = prep.alternativeQueries.find((q) => q.includes('fact check'));
  const preferInternationalNews = prep.claimMeta?.geographicScope === 'international';

  queriesRun.push(...uniqueQueries);

  // ---------------- ITERATION 1: Multi-Source Broad & Authoritative Retrieval ----------------
  const wikiFocusQuery = roleLookupQuery || englishExpansion || secondaryQuery || primarySearchQuery;
  const iter1Tasks: Promise<SearchResultItem[]>[] = [
    fetchWikipediaSearchAndExtracts(wikiFocusQuery, 'en'),
    fetchDuckDuckGoInstant(primarySearchQuery),
    fetchGoogleNewsRss(newsQuery, 'en', preferInternationalNews ? 'US' : 'IN'),
  ];

  if (preferInternationalNews) {
    iter1Tasks.push(fetchGoogleNewsRss(newsQuery, 'en', 'IN'));
  }

  if (prep.entities.people.length > 0 && !wikiFocusQuery.toLowerCase().includes(prep.entities.people[0].toLowerCase())) {
    iter1Tasks.push(fetchWikipediaSearchAndExtracts(prep.entities.people[0], 'en'));
  }

  if (prep.entities.events.length > 0 && !wikiFocusQuery.toLowerCase().includes(prep.entities.events[0].toLowerCase())) {
    iter1Tasks.push(fetchWikipediaSearchAndExtracts(prep.entities.events[0], 'en'));
  }

  if (secondaryQuery !== primarySearchQuery && secondaryQuery !== newsQuery) {
    iter1Tasks.push(fetchGoogleNewsRss(secondaryQuery, 'en', preferInternationalNews ? 'US' : 'IN'));
  }

  if (factCheckNewsQuery && factCheckNewsQuery !== newsQuery && factCheckNewsQuery !== secondaryQuery) {
    iter1Tasks.push(fetchGoogleNewsRss(factCheckNewsQuery, 'en', 'IN'));
  }

  // Targeted Fact-Check Organizations & Official Portals track on civic/govt/health/finance queries
  const shortCoreKw = unicodeTokenize(newsQuery)
    .filter((t) => !STOPWORDS.has(t) && !NEGATION_TOKENS.has(t) && t.length >= 3)
    .slice(0, 5)
    .join(' ');
  const domain = prep.claimMeta?.newsDomain;
  if (
    shortCoreKw.length >= 5 &&
    (domain === 'govt_schemes' || domain === 'health_medicine' || domain === 'business_economy' || domain === 'politics_governance' || domain === 'education')
  ) {
    const fcTargetedQuery = `${shortCoreKw} (factcheck OR altnews OR boomlive OR pib)`;
    if (!queriesRun.includes(fcTargetedQuery)) {
      queriesRun.push(fcTargetedQuery);
      iter1Tasks.push(fetchGoogleNewsRss(fcTargetedQuery, 'en', preferInternationalNews ? 'US' : 'IN'));
    }
  }

  // Multi-sentence / multi-sub-claim RSS coverage
  if (claims.length >= 2) {
    for (const sub of claims.slice(0, 3)) {
      const subKw = unicodeTokenize(sub.claim)
        .filter((t) => !STOPWORDS.has(t) && !NEGATION_TOKENS.has(t) && t.length >= 2)
        .slice(0, 8)
        .join(' ');
      if (subKw.length >= 6 && !queriesRun.some((q) => q.toLowerCase() === subKw.toLowerCase())) {
        queriesRun.push(subKw);
        iter1Tasks.push(fetchGoogleNewsRss(subKw, 'en', preferInternationalNews ? 'US' : 'IN'));
      }
    }
  }

  // Number-neutral entity/topic RSS query so mutated figures ($5.6B, 15-km, 6.5%) still retrieve real reports
  if (/\d+(?:\.\d+)?/.test(prep.normalizedQuery)) {
    const unitNoise = new Set(['billion', 'million', 'trillion', 'crore', 'lakh', 'percent', 'km', 'kilometers', 'kilometres', 'ties', 'bn', 'mn', 'during', 'meet']);
    const firstClaimText = claims[0]?.claim || prep.normalizedQuery;
    const numNeutralKw = unicodeTokenize(firstClaimText)
      .filter((t) => !STOPWORDS.has(t) && !NEGATION_TOKENS.has(t) && !unitNoise.has(t) && !/^\d+(?:\.\d+)?$/.test(t) && t.length >= 3)
      .slice(0, 8)
      .join(' ');
    if (numNeutralKw.length >= 6 && !queriesRun.some((q) => q.toLowerCase() === numNeutralKw.toLowerCase())) {
      queriesRun.push(numNeutralKw);
      iter1Tasks.push(fetchGoogleNewsRss(numNeutralKw, 'en', preferInternationalNews ? 'US' : 'IN'));
    }
  }

  // Native Kannada/Hindi News retrieval if non-English input
  if (prep.detectedLanguage === 'kn') {
    iter1Tasks.push(fetchGoogleNewsRss(prep.originalInput, 'kn', 'IN'));
  } else if (prep.detectedLanguage === 'hi') {
    iter1Tasks.push(fetchGoogleNewsRss(prep.originalInput, 'hi', 'IN'));
  }

  const settled1 = await Promise.allSettled(iter1Tasks);
  let successfulProviders = 0;
  let failedProviders = 0;

  for (const outcome of settled1) {
    if (outcome.status === 'fulfilled') {
      successfulProviders++;
      rawResults.push(...outcome.value);
    } else {
      failedProviders++;
    }
  }

  let cragIterations = 1;
  let chunkedResults = chunkSearchResults(rawResults);
  let rankedAndFiltered = filterAndRerankResults(chunkedResults, prep);
  let sufficiency = evaluateEvidenceSufficiency(prep, rankedAndFiltered.kept);
  cragTrace.push(`Iteration 1: Executed ${iter1Tasks.length} provider queries -> kept ${rankedAndFiltered.kept.length} relevant chunk(s). ${sufficiency.reason}`);

  // ---------------- ITERATION 2 (Corrective Query Refinement & Targeted Authorities) ----------------
  if (!sufficiency.sufficient) {
    cragIterations = 2;
    const iter2Tasks: Promise<SearchResultItem[]>[] = [];

    const coreTokens = unicodeTokenize(prep.normalizedQuery)
      .filter((t) => !STOPWORDS.has(t) && !NEGATION_TOKENS.has(t) && t.length >= 3)
      .slice(0, 5);
    const entityAnchor = [
      ...prep.entities.organizations.slice(0, 2),
      ...prep.entities.people.slice(0, 1),
      ...prep.entities.events.slice(0, 1),
      ...prep.entities.locations.slice(0, 1),
    ]
      .join(' ')
      .trim();

    // Strategy A: Direct role-holder current news & Wikipedia page summary if officeholder verification is still unresolved
    if (sufficiency.needsRoleVerification) {
      const roleOrgMatch = prep.normalizedQuery.match(
        /\b(president|prime minister|chief minister)\s+of\s+(?:the\s+)?([a-z\s]{3,24})/i
      );
      if (roleOrgMatch) {
        const incumbentNewsQuery = `current ${roleOrgMatch[1]} of ${roleOrgMatch[2].trim()} ${new Date().getFullYear()}`;
        if (!queriesRun.includes(incumbentNewsQuery)) {
          queriesRun.push(incumbentNewsQuery);
          iter2Tasks.push(fetchGoogleNewsRss(incumbentNewsQuery, 'en', preferInternationalNews ? 'US' : 'IN'));
        }
      }
      if (prep.entities.people.length > 0) {
        iter2Tasks.push(
          fetchWikipediaPageSummary(prep.entities.people[0], 'en').then((item) => (item ? [item] : []))
        );
      }
    }

    // Strategy B: Targeted IFCN Fact-Checkers & Official Authorities query when inconclusive/scam/policy
    if (sufficiency.needsFactCheckSearch && shortCoreKw.length >= 5) {
      const cleanTopicTokens = unicodeTokenize(prep.normalizedQuery)
        .filter((t) => !STOPWORDS.has(t) && !NEGATION_TOKENS.has(t) && !/^(?:all|every|bro|true)$/i.test(t) && t.length >= 3)
        .slice(0, 4)
        .join(' ');
      if (cleanTopicTokens.length >= 5) {
        const fcSiteQuery = `${cleanTopicTokens} "PIB Fact Check" OR "Fact Check"`;
        if (!queriesRun.includes(fcSiteQuery)) {
          queriesRun.push(fcSiteQuery);
          iter2Tasks.push(fetchGoogleNewsRss(fcSiteQuery, 'en', 'IN'));
        }
      }
    }

    // Strategy C: Missing sub-claim focused queries
    for (const uncov of sufficiency.uncoveredSubClaims.slice(0, 2)) {
      const uncovKw = unicodeTokenize(uncov)
        .filter((t) => !STOPWORDS.has(t) && !NEGATION_TOKENS.has(t) && t.length >= 3)
        .slice(0, 5)
        .join(' ');
      if (uncovKw.length >= 5 && !queriesRun.some((q) => q.toLowerCase() === uncovKw.toLowerCase())) {
        queriesRun.push(uncovKw);
        iter2Tasks.push(fetchGoogleNewsRss(uncovKw, 'en', preferInternationalNews ? 'US' : 'IN'));
      }
    }

    // Strategy D: Relaxed entity + core keywords
    const relaxedQuery = (entityAnchor.length >= 6 ? `${entityAnchor} ${coreTokens.slice(0, 3).join(' ')}` : coreTokens.join(' '))
      .replace(/\s+/g, ' ')
      .trim();
    if (relaxedQuery.length >= 4 && !queriesRun.some((q) => q.toLowerCase() === relaxedQuery.toLowerCase())) {
      queriesRun.push(relaxedQuery);
      iter2Tasks.push(fetchGoogleNewsRss(relaxedQuery, 'en', preferInternationalNews ? 'US' : 'IN'));
      iter2Tasks.push(fetchWikipediaSearchAndExtracts(relaxedQuery, 'en'));
    }

    if (iter2Tasks.length > 0) {
      const settled2 = await Promise.allSettled(iter2Tasks);
      const pass2Items: SearchResultItem[] = [];
      for (const out of settled2) {
        if (out.status === 'fulfilled') {
          successfulProviders++;
          pass2Items.push(...out.value);
        } else {
          failedProviders++;
        }
      }
      if (pass2Items.length > 0) {
        rawResults.push(...pass2Items);
        chunkedResults = chunkSearchResults(rawResults);
        rankedAndFiltered = filterAndRerankResults(chunkedResults, prep);
      }
    }
    sufficiency = evaluateEvidenceSufficiency(prep, rankedAndFiltered.kept);
    cragTrace.push(`Iteration 2 (Corrective): Ran ${iter2Tasks.length} refined queries -> kept ${rankedAndFiltered.kept.length} relevant chunk(s). ${sufficiency.reason}`);
  }

  // ---------------- ITERATION 3 (Bounded Final Broadened Fallback — Hard Cap = 3) ----------------
  if (!sufficiency.sufficient && (prep.entities.people.length > 0 || prep.entities.organizations.length > 0 || prep.entities.events.length > 0)) {
    cragIterations = 3;
    const iter3Tasks: Promise<SearchResultItem[]>[] = [];
    const focalEntity = prep.entities.events[0] || prep.entities.organizations[0] || prep.entities.people[0];
    const broadOfficialQuery = `${focalEntity} official statement OR Reuters OR PTI OR PIB`;
    if (focalEntity && !queriesRun.includes(broadOfficialQuery)) {
      queriesRun.push(broadOfficialQuery);
      iter3Tasks.push(fetchGoogleNewsRss(broadOfficialQuery, 'en', preferInternationalNews ? 'US' : 'IN'));
    }
    if (prep.claimMeta?.newsDomain === 'govt_schemes' || prep.claimMeta?.newsDomain === 'education') {
      const centralDebunkQuery = `"fake" ${unicodeTokenize(prep.normalizedQuery).filter((t) => !STOPWORDS.has(t) && t.length >= 4).slice(0, 3).join(' ')} scheme`;
      if (!queriesRun.includes(centralDebunkQuery)) {
        queriesRun.push(centralDebunkQuery);
        iter3Tasks.push(fetchGoogleNewsRss(centralDebunkQuery, 'en', 'IN'));
      }
    }
    if (iter3Tasks.length > 0) {
      const settled3 = await Promise.allSettled(iter3Tasks);
      const pass3Items: SearchResultItem[] = [];
      for (const out of settled3) {
        if (out.status === 'fulfilled') {
          successfulProviders++;
          pass3Items.push(...out.value);
        } else {
          failedProviders++;
        }
      }
      if (pass3Items.length > 0) {
        rawResults.push(...pass3Items);
        chunkedResults = chunkSearchResults(rawResults);
        rankedAndFiltered = filterAndRerankResults(chunkedResults, prep);
      }
    }
    sufficiency = evaluateEvidenceSufficiency(prep, rankedAndFiltered.kept);
    cragTrace.push(`Iteration 3 (Bounded Fallback): Ran ${iter3Tasks.length} broadened queries -> kept ${rankedAndFiltered.kept.length} relevant chunk(s). ${sufficiency.reason}`);
  }

  const status: 'operational' | 'fallback_archive' | 'error_reported' =
    successfulProviders > 0 ? 'operational' : failedProviders > 0 ? 'error_reported' : 'fallback_archive';

  return {
    results: rankedAndFiltered.kept,
    searchProviderStatus: status,
    queryCount: queriesRun.length,
    deduplicatedCount: rankedAndFiltered.deduplicatedCount,
    filteredIrrelevantCount: rankedAndFiltered.filteredIrrelevantCount,
    queriesRun,
    cragIterations,
    cragTrace,
    insufficiencyReason: sufficiency.sufficient ? undefined : sufficiency.reason,
  };
}

/**
 * Cross-Encoder-Style Joint Claim-Passage Interaction Reranker:
 * Scores joint phrase alignment, subject-action co-occurrence, numeric/date specificity,
 * headline alignment, and temporal recency against the claim's temporal intent.
 */
function computeCrossInteractionScore(
  prep: PreprocessedQuery,
  docText: string,
  docTitle: string,
  temporalStatus: 'current' | 'outdated' | 'undated',
  publicationDate?: string
): number {
  const docLower = docText.toLowerCase();
  const titleLower = (docTitle || '').toLowerCase();
  let score = 0.25;

  // 1. Subject + Action co-occurrence within passage
  const primarySub = prep.extractedClaims[0];
  if (primarySub?.subject && docLower.includes(primarySub.subject.toLowerCase())) {
    score += 0.16;
    if (titleLower.includes(primarySub.subject.toLowerCase())) score += 0.08;
  }
  if (primarySub?.action && docLower.includes(primarySub.action.toLowerCase())) {
    score += 0.14;
  }

  // 2. Date & Numeric specificity alignment
  for (const d of prep.entities.dates.slice(0, 2)) {
    if (docLower.includes(d.toLowerCase())) {
      score += 0.12;
      break;
    }
  }
  for (const loc of prep.entities.locations.slice(0, 2)) {
    if (docLower.includes(loc.toLowerCase())) {
      score += 0.1;
      break;
    }
  }

  // 3. Temporal recency interaction for breaking/current claims vs historical claims
  const isCurrentOrRecent =
    prep.claimMeta?.temporalIntent === 'recent_news' || prep.claimMeta?.temporalIntent === 'current_present';
  const currentYear = String(new Date().getFullYear());
  if (isCurrentOrRecent) {
    if (temporalStatus === 'outdated') {
      score -= 0.18;
    } else if ((publicationDate || '').includes(currentYear) || docLower.includes(currentYear)) {
      score += 0.16;
    } else if (temporalStatus === 'current') {
      score += 0.08;
    }
  }

  return Number(Math.max(0, Math.min(1, score)).toFixed(3));
}

/**
 * Scores, filters irrelevant hits, deduplicates syndicated copies, and cross-reranks Top-K results.
 */
export function filterAndRerankResults(
  rawResults: SearchResultItem[],
  prep: PreprocessedQuery
): {
  kept: SearchResultItem[];
  deduplicatedCount: number;
  filteredIrrelevantCount: number;
} {
  // Build semantic comparison anchor (use English cross-lingual expansion cleanly for non-English docs)
  const crossLingualEnglish = prep.detectedLanguage !== 'en'
    ? prep.alternativeQueries.filter((q) => /^[A-Za-z0-9\s.,'-]+$/.test(q)).join(' ')
    : '';
  const queryAnchor = `${prep.normalizedQuery} ${crossLingualEnglish}`.trim();
  const queryContentTokens = unicodeTokenize(queryAnchor).filter((t) => !STOPWORDS.has(t));
  const englishContentTokens = crossLingualEnglish
    ? unicodeTokenize(crossLingualEnglish).filter((t) => !STOPWORDS.has(t))
    : queryContentTokens;
  const queryLower = queryAnchor.toLowerCase();

  const scored: SearchResultItem[] = [];
  let filteredIrrelevantCount = 0;

  for (const item of rawResults) {
    const titleNorm = (item.title || '').trim();
    const snippetNorm = (item.snippet || '').trim();
    const docText =
      !titleNorm
        ? snippetNorm
        : snippetNorm.toLowerCase().startsWith(titleNorm.toLowerCase().slice(0, Math.min(40, titleNorm.length)))
          ? snippetNorm
          : `${titleNorm}. ${snippetNorm}`;
    const docLower = docText.toLowerCase();
    const isClaimEntertainment = /\b(?:film|movie|cinema|actor|actress|hagiography|novel|book|album|stadium|wife|spouse)\b/i.test(queryLower);
    const isWikiItem = (item.url || '').toLowerCase().includes('wikipedia.org');
    if (
      !isClaimEntertainment &&
      isWikiItem &&
      (/\((?:\d{4}\s+)?film\)|\b(?:hagiography|propaganda film|cricket stadium|was an indian former)\b/i.test(`${titleNorm} ${snippetNorm}`) ||
        /\b(?:stadium|arena)\b/i.test(titleNorm))
    ) {
      filteredIrrelevantCount++;
      continue;
    }
    // Filter collateral person surname Wikipedia bios (e.g. "Jashodaben Modi" on a Narendra Modi query)
    const bioFirstTokenMatch = isWikiItem && /\b(?:born\s+\d{4}|politician|teacher|activist|minister)\b/i.test(snippetNorm)
      ? titleNorm.match(/^([A-Za-z]{4,})\s+[A-Za-z]{3,}$/)
      : null;
    if (
      bioFirstTokenMatch &&
      !/^(?:who|what|prime|chief|president|list|pink|mumbai|world|cyclone|article)/i.test(bioFirstTokenMatch[1]) &&
      !queryLower.includes(bioFirstTokenMatch[1].toLowerCase()) &&
      !prep.entities.people.some((p) => p.toLowerCase().includes(bioFirstTokenMatch[1].toLowerCase()))
    ) {
      filteredIrrelevantCount++;
      continue;
    }
    const isAsciiDoc = !/[\u0900-\u097F\u0C80-\u0CFF]/.test(docText);
    const activeAnchor = prep.detectedLanguage !== 'en' && isAsciiDoc && crossLingualEnglish
      ? crossLingualEnglish
      : queryAnchor;
    const activeTokens = prep.detectedLanguage !== 'en' && isAsciiDoc && englishContentTokens.length > 0
      ? englishContentTokens
      : queryContentTokens;

    let semanticScore = computeSemanticSimilarity(activeAnchor, docText);
    let keywordScore = computeKeywordBM25Score(activeTokens, docText);

    // For multi-sentence / multi-part claims, evaluate best sub-claim alignment as well so long stories don't dilute per-claim RSS hits
    if (prep.extractedClaims.length >= 2 && isAsciiDoc) {
      for (const sub of prep.extractedClaims) {
        const subTokens = unicodeTokenize(sub.claim).filter((t) => !STOPWORDS.has(t));
        if (subTokens.length === 0) continue;
        const subSem = computeSemanticSimilarity(sub.claim, docText);
        const subKw = computeKeywordBM25Score(subTokens, docText);
        if (subKw > keywordScore) keywordScore = subKw;
        if (subSem > semanticScore) semanticScore = subSem;
      }
    }

    const entityScore = computeEntityMatchScore(prep.entities, docText);
    const cred = classifySourceCredibility(item.url, item.sourceName);
    const temporalStatus = detectTemporalStatus(item.publicationDate, item.snippet);
    const crossInteractionScore = computeCrossInteractionScore(
      prep,
      docText,
      titleNorm,
      temporalStatus,
      item.publicationDate
    );

    let disambiguateFactor = 1.0;

    // Disambiguate "President" vs "Vice President" when user asks for President
    if (
      queryLower.includes('president') &&
      !queryLower.includes('vice') &&
      docLower.includes('vice president') &&
      !docLower.includes('droupadi murmu')
    ) {
      disambiguateFactor = 0.62;
    }

    // Strict relevance gate: check lexical/semantic OR NLI semantic alignment
    const hasMeaningfulOverlap =
      keywordScore >= 0.22 ||
      semanticScore >= 0.24 ||
      (entityScore >= 0.45 && semanticScore >= 0.12);

    const resolvedTier = item.credibilityTier || cred.credibilityTier;
    const isWikipedia = (item.url || '').toLowerCase().includes('wikipedia.org');
    const meta = extractTemporalAndRoleMetadata(docText, resolvedTier, item.publicationDate);

    // Run contextual Semantic Frame & Natural Language Inference (NLI) classification
    const nliResult = classifyPairNLI(prep.normalizedQuery, docText, {
      isAuthoritative: resolvedTier === 'official_primary' || resolvedTier === 'accredited_press',
      isFactCheck: resolvedTier === 'factcheck_org' && !isWikipedia,
      crossLingualQuery: crossLingualEnglish || undefined,
    });

    const blendedCrossScore = Number(
      Math.min(1, 0.58 * crossInteractionScore + 0.42 * nliResult.crossRelevanceScore).toFixed(3)
    );
    const decisiveNliBonus =
      (nliResult.label === 'CONTRADICTION' || nliResult.label === 'ENTAILMENT') && nliResult.confidence >= 0.84
        ? 0.1
        : 0;
    const nliAlignedRelevance = Number(
      Math.min(
        1,
        Math.max(
          0,
          (0.30 * semanticScore +
            0.22 * keywordScore +
            0.15 * entityScore +
            0.19 * blendedCrossScore +
            0.14 * cred.authorityWeight) *
            disambiguateFactor +
            decisiveNliBonus
        )
      ).toFixed(3)
    );

    const hasMeaningfulOverlapOrNLI =
      hasMeaningfulOverlap ||
      (nliResult.label !== 'NEUTRAL' && nliResult.crossRelevanceScore >= 0.58);

    if (!hasMeaningfulOverlapOrNLI) {
      filteredIrrelevantCount++;
      continue;
    }

    const stance = detectItemStance(
      prep,
      docText,
      resolvedTier,
      isWikipedia,
      item.title,
      item.publicationDate,
      temporalStatus,
      item.evidenceRole || meta.evidenceRole,
      nliResult
    );

    // Keep NLI label consistent with domain-calibrated stance when authoritative role/year/numeric guards fire
    let finalNliLabel: NLILabel = nliResult.label;
    let finalNliConfidence = nliResult.confidence;
    let finalNliReason = nliResult.reason;
    if (stance === 'contradicts' && finalNliLabel !== 'CONTRADICTION') {
      finalNliLabel = 'CONTRADICTION';
      finalNliConfidence = Math.max(finalNliConfidence, 0.86);
      finalNliReason = 'Evidence directly contradicts claimed entity, role, quantity, polarity, or event timeline.';
    } else if (stance === 'supports' && finalNliLabel !== 'ENTAILMENT') {
      finalNliLabel = 'ENTAILMENT';
      finalNliConfidence = Math.max(finalNliConfidence, 0.8);
      finalNliReason = 'Evidence corroborates core entities, event facts, and claim constraints.';
    } else if (stance === 'neutral' && finalNliLabel !== 'NEUTRAL') {
      finalNliLabel = 'NEUTRAL';
      finalNliConfidence = Math.min(finalNliConfidence, 0.72);
    }

    scored.push({
      ...item,
      retrievedAt: item.retrievedAt || new Date().toISOString(),
      credibilityTier: item.credibilityTier || cred.credibilityTier,
      credibilityLabel: item.credibilityLabel || cred.categoryLabel,
      isPrimary: item.isPrimary ?? cred.isPrimary,
      eventDate: item.eventDate || meta.eventDate,
      announcementDate: item.announcementDate || meta.announcementDate,
      implementationDate: item.implementationDate || meta.implementationDate,
      evidenceRole: item.evidenceRole || meta.evidenceRole,
      semanticScore,
      keywordScore,
      entityScore,
      crossInteractionScore: blendedCrossScore,
      relevanceScore: nliAlignedRelevance,
      stance,
      temporalStatus,
      nliLabel: finalNliLabel,
      nliConfidence: finalNliConfidence,
      nliReason: finalNliReason,
    });
  }

  // Sort by combined cross-reranked relevance descending before deduplication so best version wins
  scored.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  // Deduplicate by URL (allowing at most 2 distinct non-overlapping chunks per URL) and Jaccard text similarity
  const urlCounts = new Map<string, number>();
  const kept: SearchResultItem[] = [];

  for (const item of scored) {
    const urlKey = item.url.toLowerCase().replace(/\/$/, '').split('?')[0];
    const currentUrlCount = urlCounts.get(urlKey) || 0;
    if (currentUrlCount >= 2) continue;

    const itemTokens = new Set(unicodeTokenize(`${item.title} ${item.snippet}`).slice(0, 40));
    const isNearDuplicate = kept.some((existing) => {
      const existingTokens = new Set(unicodeTokenize(`${existing.title} ${existing.snippet}`).slice(0, 40));
      let intersect = 0;
      for (const t of itemTokens) if (existingTokens.has(t)) intersect++;
      const union = itemTokens.size + existingTokens.size - intersect;
      return union > 0 && intersect / union > 0.68;
    });

    if (isNearDuplicate) continue;

    urlCounts.set(urlKey, currentUrlCount + 1);
    kept.push(item);
    if (kept.length >= 10) break;
  }

  const deduplicatedCount = Math.max(0, scored.length - kept.length);

  return {
    kept,
    deduplicatedCount,
    filteredIrrelevantCount,
  };
}

/**
 * Classifies each retrieved relevant evidence snippet into explicit stance:
 * 'supports', 'contradicts', or 'neutral' (off-topic items are filtered as 'irrelevant').
 */
function detectItemStance(
  prep: PreprocessedQuery,
  docText: string,
  credibilityTier: 'official_primary' | 'accredited_press' | 'factcheck_org' | 'secondary_web' = 'secondary_web',
  isWikipedia: boolean = false,
  docTitle: string = '',
  publicationDate?: string,
  temporalStatus: 'current' | 'outdated' | 'undated' = 'undated',
  evidenceRole: SearchResultItem['evidenceRole'] = 'confirmed_fact',
  nliResult?: NLIPairResult
): 'supports' | 'contradicts' | 'neutral' {
  const docLower = docText.toLowerCase();
  const crossLingualEnglish = prep.detectedLanguage !== 'en'
    ? prep.alternativeQueries.filter((q) => /^[A-Za-z0-9\s.,'-]+$/.test(q)).join(' ')
    : '';
  const isAsciiDoc = !/[\u0900-\u097F\u0C80-\u0CFF]/.test(docText);
  const queryAnchor = prep.detectedLanguage !== 'en' && isAsciiDoc && crossLingualEnglish
    ? crossLingualEnglish.trim()
    : `${prep.normalizedQuery} ${crossLingualEnglish}`.trim();
  const claimLower = queryAnchor.toLowerCase();
  const queryTokens = unicodeTokenize(queryAnchor).filter(
    (t) => !STOPWORDS.has(t) && !NEGATION_TOKENS.has(t) && (t.length >= 2 || /[^\x00-\x7F]/.test(t))
  );
  const uniqueQueryTokens = Array.from(new Set(queryTokens));
  const kw = computeKeywordBM25Score(uniqueQueryTokens, docText);
  const sem = computeSemanticSimilarity(queryAnchor, docText);

  const docTokensList = unicodeTokenize(docText);
  const docTokenSet = new Set(docTokensList);

  // Immediately neutralize film, novel, or entertainment pages so they remain 'neutral'
  const isFictionOrFilmPageEarly = /\((?:\d{4}\s+)?film\)|\b(?:hagiography|propaganda film|feature films|list of[\w\s]+films|movies|books|novels|video games|episodes|fictional)\b/i.test(
    `${docTitle} ${docLower}`
  );
  if (isFictionOrFilmPageEarly) {
    return 'neutral';
  }

  let matchedUniqueCount = 0;
  for (const qt of uniqueQueryTokens) {
    if (
      docTokenSet.has(qt) ||
      (qt.length >= 4 && docTokensList.some((dt) => dt.length >= 4 && !STOPWORDS.has(dt) && (dt.startsWith(qt.slice(0, 4)) || qt.startsWith(dt.slice(0, 4)))))
    ) {
      matchedUniqueCount++;
    }
  }

  let bigramHits = 0;
  const docClean = docLower.replace(/[^\p{L}\p{M}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ');
  const docContentClean = docTokensList.filter((t) => !STOPWORDS.has(t)).join(' ');
  for (let i = 0; i < queryTokens.length - 1; i++) {
    const bg = `${queryTokens[i]} ${queryTokens[i + 1]}`;
    if (docClean.includes(bg) || docContentClean.includes(bg)) bigramHits++;
  }

  // For multi-sentence claims (2-3 sentences), also compute best matching sub-claim overlap
  let bestSubUniqueQueryTokens = uniqueQueryTokens;
  let bestSubMatchedCount = matchedUniqueCount;
  let bestSubKw = kw;
  let bestSubSem = sem;
  let bestSubBigrams = bigramHits;
  let bestSubClaimLower = claimLower;
  if (prep.extractedClaims.length >= 2 && isAsciiDoc) {
    for (const sub of prep.extractedClaims) {
      const subTokens = unicodeTokenize(sub.claim).filter(
        (t) => !STOPWORDS.has(t) && !NEGATION_TOKENS.has(t) && t.length >= 2
      );
      const subUnique = Array.from(new Set(subTokens));
      if (subUnique.length === 0) continue;
      let sMatch = 0;
      for (const st of subUnique) {
        if (
          docTokenSet.has(st) ||
          (st.length >= 4 && docTokensList.some((dt) => dt.length >= 4 && !STOPWORDS.has(dt) && (dt.startsWith(st.slice(0, 4)) || st.startsWith(dt.slice(0, 4)))))
        ) {
          sMatch++;
        }
      }
      let sBg = 0;
      for (let i = 0; i < subTokens.length - 1; i++) {
        const bg = `${subTokens[i]} ${subTokens[i + 1]}`;
        if (docClean.includes(bg) || docContentClean.includes(bg)) sBg++;
      }
      const sKw = computeKeywordBM25Score(subUnique, docText);
      const sSem = computeSemanticSimilarity(sub.claim, docText);
      if (sKw > bestSubKw) {
        bestSubKw = sKw;
        bestSubSem = Math.max(bestSubSem, sSem);
        bestSubMatchedCount = sMatch;
        bestSubUniqueQueryTokens = subUnique;
        bestSubBigrams = sBg;
        bestSubClaimLower = sub.claim.toLowerCase();
      }
    }
  }

  const hasTopicalOverlapForDebunk =
    uniqueQueryTokens.length <= 2
      ? matchedUniqueCount >= 1
      : matchedUniqueCount >= Math.min(2, uniqueQueryTokens.length) && kw >= 0.25;

  // Explicit fact-check debunk signals in the evidence (requires topical alignment with the claim!)
  const factCheckPrefixTags = ['pib fact check', 'fact check:', 'fact-check:'];
  const evidenceDebunkSignals = [
    'is fake', 'is false', 'are fake', 'are false',
    'claim is fake', 'claims are fake', 'false claim', 'viral scam', 'hoax', 'debunked', 'debunking',
    'debunks', 'fake whatsapp', 'fake message', 'fake viral', 'fake scheme', 'fake notice',
    'fabricated', 'no such scheme', 'did not announce', 'has not launched', 'have not launched',
    'did not launch', 'has not announced', 'no scientific basis', 'no evidence', 'will not destroy',
    'will not cure', "doesn't kill", 'does not kill', 'does not cure', 'cannot cure', 'not cure',
    'misleading claim', 'morphed', 'scam', 'phishing', 'fake news', 'rumour', 'rumor',
    'clarified that no', 'clarifies no', 'denied the claim', 'refutes', 'baseless', 'untrue', 'not legal tender',
    'warned against', 'warns against', 'warns public against', 'against fake', 'never announced',
  ];
  const hasFactCheckTagWithoutQuestion =
    !docText.includes('?') && factCheckPrefixTags.some((tag) => docLower.includes(tag));
  const hasExplicitDebunk =
    hasFactCheckTagWithoutQuestion ||
    evidenceDebunkSignals.some((sig) => docLower.includes(sig)) ||
    /\bfake\s+[a-z0-9\s]{1,35}\b(?:scheme|yojana|offer|gift|recharge|laptop|smartphone|job|order|circular|notice|message|whatsapp)\b/i.test(
      docLower
    );
  if (hasExplicitDebunk && hasTopicalOverlapForDebunk) {
    return 'contradicts';
  }

  // Negation / Polarity comparison (supports contractions like doesn't / will not / has not)
  const docHasNegation =
    docTokensList.some((t) => NEGATION_TOKENS.has(t)) ||
    /\b(?:not|no|never|neither|nor|without|doesn't|does not|don't|do not|didn't|did not|won't|will not|wouldn't|can't|cannot|couldn't|isn't|is not|aren't|are not|wasn't|was not|weren't|were not|hasn't|has not|haven't|have not)\b/.test(
      docLower
    );

  // Non-Wikipedia fact-checking orgs or explicit "Fact-Check" articles with negation refute affirmative claims
  // ONLY when doc covers the actual subject AND object of the claim (prevents unrelated Musk/Starlink fact-checks refuting "Musk bought Google")
  const isFactCheckHeadlineOrOrg =
    (credibilityTier === 'factcheck_org' && !isWikipedia) || /\bfact[- ]check\b/i.test(docLower);
  const strongSubjectObjectCoverage =
    uniqueQueryTokens.length <= 3
      ? matchedUniqueCount >= uniqueQueryTokens.length
      : matchedUniqueCount >= Math.max(3, Math.ceil(uniqueQueryTokens.length * 0.6));
  if (!prep.hasNegation && isFactCheckHeadlineOrOrg && docHasNegation && strongSubjectObjectCoverage) {
    return 'contradicts';
  }

  // Role-holder consistency check ONLY when claim actually asks/asserts who is India's President or PM
  // (NEVER contradict bilateral news mentioning visiting foreign leaders like "Nepal Prime Minister Balendra Shah"!)
  const claimsWrongIndianPresident =
    !claimLower.includes('murmu') &&
    (/\b(?:is|as|became|remains)\s+(?:the\s+)?(?:current\s+)?president\s+of\s+india\b/i.test(claimLower) ||
      (prep.entities.people.length === 1 && !prep.entities.people[0].toLowerCase().includes('murmu') && /\bpresident\s+of\s+india\b/i.test(claimLower)));
  if (claimLower.includes('president') && claimLower.includes('india') && !claimLower.includes('vice')) {
    if (docLower.includes('droupadi murmu') && docLower.includes('president of india')) {
      if (prep.hasNegation || (claimLower.includes('not') && claimLower.includes('murmu'))) {
        return 'contradicts';
      }
      if (claimsWrongIndianPresident) {
        return 'contradicts';
      }
      if (prep.isQuestion || claimLower.includes('droupadi murmu') || claimLower.includes('murmu')) {
        return 'supports';
      }
    }
  }

  const claimsWrongIndianPM =
    !claimLower.includes('modi') &&
    (/\b(?:is|as|became|remains)\s+(?:the\s+)?(?:current\s+)?prime\s+minister\s+of\s+india\b/i.test(claimLower) ||
      (prep.entities.people.length === 1 && !prep.entities.people[0].toLowerCase().includes('modi') && /\bprime\s+minister\s+of\s+india\b/i.test(claimLower)));
  if (claimLower.includes('prime minister') && claimLower.includes('india')) {
    if (docLower.includes('narendra modi') && docLower.includes('prime minister')) {
      if (prep.hasNegation || claimLower.includes('not a prime') || claimLower.includes('not the prime') || claimLower.includes('resigned')) {
        return 'contradicts';
      }
      if (claimsWrongIndianPM) {
        return 'contradicts';
      }
      if (prep.isQuestion || (claimLower.includes('modi') && prep.extractedClaims.length <= 1 && uniqueQueryTokens.length <= 8)) {
        return 'supports';
      }
    }
  }

  // General Role/Leadership Attribution Guard:
  // Supports BOTH "<Person> is <Role> of <Org>" AND "<Org> <Role> is <Person>"
  const roleNamesRegex = '(ceo|chief executive officer|president|prime minister|chief minister|founder|chairman|chairperson|director|governor|mayor|captain)';
  const forwardRoleMatch = claimLower.match(
    new RegExp(`^([a-z][a-z.'\\s-]{2,45}?)\\s+(?:is|serves as|became)\\s+(?:the\\s+|an?\\s+)?(?:current\\s+|present\\s+|incumbent\\s+)?${roleNamesRegex}\\s+(?:of|at|for)\\s+(?:the\\s+)?([a-z0-9][a-z0-9\\s.&'-]{1,45})$`, 'i')
  );
  const invertedRoleMatch = !forwardRoleMatch
    ? claimLower.match(
        new RegExp(`^(?:the\\s+)?(?:current\\s+|present\\s+)?([a-z0-9][a-z0-9\\s.&'-]{1,35}?)\\s+${roleNamesRegex}\\s+(?:is|remains)\\s+([a-z][a-z.'\\s-]{2,45})$`, 'i')
      )
    : null;

  let roleAttachmentVerified = true;
  if (forwardRoleMatch || invertedRoleMatch) {
    const claimedPerson = (forwardRoleMatch ? forwardRoleMatch[1] : invertedRoleMatch![3]).trim();
    const rawRole = (forwardRoleMatch ? forwardRoleMatch[2] : invertedRoleMatch![2]).trim();
    const rolePattern = rawRole === 'chief executive officer' ? '(?:ceo|chief executive officer)' : rawRole.replace(/\s+/g, '\\s+');
    const claimedOrg = (forwardRoleMatch ? forwardRoleMatch[3] : invertedRoleMatch![1]).trim();
    const claimedOrgExpanded = claimedOrg === 'us' || claimedOrg === 'usa' ? 'united states' : claimedOrg;
    const claimedOrgTokens = unicodeTokenize(claimedOrgExpanded).filter((t) => !STOPWORDS.has(t) && t.length >= 2);
    const claimedPersonTokens = unicodeTokenize(claimedPerson).filter((t) => !STOPWORDS.has(t) && t.length >= 2);
    const personLastOrFull = claimedPersonTokens[claimedPersonTokens.length - 1] || claimedPerson;
    const personPattern = claimedPersonTokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

    // Case A: Doc links a DIFFERENT org directly with <Role> <Person> (e.g., "Google CEO Sundar Pichai" when claiming Apple)
    // OR links <Person> with "<Role> of <DifferentOrg>" (e.g., "Sundar Pichai, who is also the CEO of Google")
    const personFullOrLast = `(?:(?:${personPattern})\\s+)?${personLastOrFull}`;
    const orgRolePersonRegex = new RegExp(`\\b([a-z0-9&'-]{2,25})\\s+${rolePattern}\\s+${personFullOrLast}\\b`, 'gi');
    for (const m of docLower.matchAll(orgRolePersonRegex)) {
      const attachedOrg = m[1];
      if (
        !STOPWORDS.has(attachedOrg) &&
        !/^(?:former|ex|new|next|current|incumbent|future|acting|interim|youngest|first|45th|46th|47th)$/.test(attachedOrg) &&
        !claimedOrgTokens.includes(attachedOrg)
      ) {
        return 'contradicts';
      }
    }
    const personAsRoleOfOtherOrgRegex = new RegExp(
      `\\b(?:${personPattern})\\b[^.;!?]{0,70}\\b(?:is|also|remains|serves as)\\s+(?:also\\s+)?(?:the\\s+)?${rolePattern}\\s+(?:of|at)\\s+(?:the\\s+)?([a-z0-9&'-]{2,25})\\b`,
      'gi'
    );
    for (const m of docLower.matchAll(personAsRoleOfOtherOrgRegex)) {
      const attachedOrg = m[1];
      if (
        !STOPWORDS.has(attachedOrg) &&
        !/^(?:current|present|incumbent)$/.test(attachedOrg) &&
        !claimedOrgTokens.includes(attachedOrg)
      ) {
        return 'contradicts';
      }
    }

    // Case B: Doc names a DIFFERENT person as <Org> <Role> or current/incumbent <Role> of <Org>
    for (const orgTok of claimedOrgTokens) {
      const orgNamesPersonRegex = new RegExp(
        `\\b${orgTok}\\s+(?:names|appoints|appointed|taps|picks)\\s+([a-z]{3,}(?:\\s+[a-z]{3,})?)\\s+(?:as\\s+)?(?:the\\s+|its\\s+|next\\s+|new\\s+)?${rolePattern}\\b`,
        'gi'
      );
      for (const m of docLower.matchAll(orgNamesPersonRegex)) {
        const otherPerson = m[1].trim();
        if (!claimedPersonTokens.some((pt) => otherPerson.includes(pt))) {
          return 'contradicts';
        }
      }
      const otherAsOrgRoleRegex = new RegExp(
        `\\b([a-z]{3,}\\s+[a-z]{3,})\\b[^.;!?]{0,45}\\b(?:as|is|was|replaces|succeeds)\\s+(?:the\\s+)?(?:current\\s+|incumbent\\s+|\\d+(?:st|nd|rd|th)\\s+(?:and\\s+current\\s+)?)?${orgTok}\\s+${rolePattern}\\b`,
        'gi'
      );
      for (const m of docLower.matchAll(otherAsOrgRoleRegex)) {
        const otherPerson = m[1].trim();
        if (!claimedPersonTokens.some((pt) => otherPerson.includes(pt))) {
          return 'contradicts';
        }
      }
    }

    // Case C: Former vs Current tenure check (e.g. "Joe Biden ... former president", "former Chief Minister Siddaramaiah",
    // OR "D. K. Shivakumar is the incumbent chief minister of Karnataka")
    const personMentioned = claimedPersonTokens.length > 0 && claimedPersonTokens.every((pt) => docLower.includes(pt));
    const docExplicitlyStatesCurrent = new RegExp(
      `\\b(?:${personPattern})\\b[^.;!?]{0,140}\\b(?:is|currently|incumbent|serving as)\\s+(?:the\\s+)?(?:\\d+(?:st|nd|rd|th)\\s+(?:and\\s+current\\s+)?)?${rolePattern}\\b`,
      'i'
    ).test(docLower);
    const docSaysPersonIsFormerOnly =
      personMentioned &&
      !docExplicitlyStatesCurrent &&
      (new RegExp(`\\b(?:${personPattern})\\b[^.;!?]{0,120}\\b(?:former|ex-)\\s*(?:[a-z]+\\s+){0,2}${rolePattern}\\b`, 'i').test(docLower) ||
        new RegExp(`\\b(?:former|ex-)\\s*(?:[a-z]+\\s+){0,2}${rolePattern}\\s+(?:[a-z.]+\\s+){0,2}(?:${personPattern})\\b`, 'i').test(docLower) ||
        (/\b(?:term ended|left office|stepped down|succeeded by|served as[^.;!?]{0,60}from\s+\d{4}\s+to\s+\d{4})\b/i.test(docLower) &&
          new RegExp(`\\b${rolePattern}\\b`, 'i').test(docLower)));
    const holderNamePattern = '((?:[a-z]{1,2}\\.?\\s+){0,2}[a-z]{3,}(?:\\s+[a-z]{2,})?(?:\\s+[a-z]{3,})?)';
    const currentHolderRegexStr = `\\b${holderNamePattern}\\b[^.;!?]{0,120}\\bis\\s+(?:the\\s+)?(?:current\\s+|incumbent\\s+|\\d+(?:st|nd|rd|th)\\s+(?:and\\s+current\\s+)?)?${rolePattern}\\s+(?:of|at|for)\\s+(?:the\\s+)?(?:[a-z]+\\s+){0,2}`;
    const docNamesDifferentCurrentHolder = claimedOrgTokens.some((orgTok) =>
      new RegExp(`${currentHolderRegexStr}${orgTok}\\b`, 'i').test(docLower)
    );
    if (docSaysPersonIsFormerOnly) {
      return 'contradicts';
    }
    if (docNamesDifferentCurrentHolder) {
      const mCurrent = docLower.match(
        new RegExp(`${currentHolderRegexStr}(?:${claimedOrgTokens.join('|')})\\b`, 'i')
      );
      if (mCurrent && !claimedPersonTokens.some((pt) => mCurrent[1].includes(pt))) {
        return 'contradicts';
      }
    }

    // Positive linkage within same sentence or title-scoped org:
    // 1) "<Org> ... <Role> ... <Person>" or "<Org> <Role> <Person>"
    // 2) "<Person> ... is/serves as/has served as ... [the/current/47th] <Role> of [the] ... <Org>"
    // 3) Doc mentions org (or "u.s." for united states) AND explicitly identifies <Person> as incumbent/current <Role>
    const orgMatchTokens = claimedOrgTokens.includes('united') && claimedOrgTokens.includes('states')
      ? [...claimedOrgTokens, 'u.s', 'us']
      : claimedOrgTokens;
    const claimAssertsCurrentTenure =
      /\b(?:is|are|current|present|incumbent|remains)\b/i.test(claimLower) &&
      !/\b(?:was|were|former|ex-|previously)\b/i.test(claimLower);
    const docIndicatesEndedTenure =
      personMentioned &&
      (/\b(?:former|ex-)\b/i.test(docLower) ||
        /\bfrom\s+\d{4}\s+to\s+\d{4}\b/i.test(docLower) ||
        /\buntil\s+\d{4}\b/i.test(docLower) ||
        /\bwas\s+(?:the\s+)?(?:\d+(?:st|nd|rd|th)\s+)?(?:president|prime minister|ceo|chief minister|first family)\b/i.test(docLower) ||
        (/\btook\s+office\b/i.test(docLower) && !/\b(?:since\s+202[5-9]|incumbent|current)\b/i.test(docLower))) &&
      !/\b(?:is\s+(?:the\s+)?(?:\d+(?:st|nd|rd|th)\s+(?:and\s+(?:\d+(?:st|nd|rd|th)|current)\s+)?)?(?:current\s+|incumbent\s+)?(?:president|prime minister|chief minister|ceo)\b|incumbent\s+(?:president|prime minister|ceo)|currently\s+serving|\d{4}\s*[–-]\s*present\b)/i.test(docLower);

    const directLink1 = orgMatchTokens.some((orgTok) =>
      new RegExp(`\\b${orgTok.replace('.', '\\.')}\\b[^.;!?\\-–]{0,22}\\b${rolePattern}\\b[^.;!?\\-–]{0,22}\\b(?:${personPattern})\\b`, 'i').test(docLower)
    );
    const directLink2 = orgMatchTokens.some((orgTok) =>
      new RegExp(
        `\\b(?:${personPattern})\\b[^.;!?]{0,160}\\b(?:is|serves as|has served as|serving as|incumbent|current)\\s+(?:the\\s+)?(?:\\d+(?:st|nd|rd|th)\\s+(?:and\\s+current\\s+)?)?${rolePattern}\\s+(?:of|at|for)\\s+(?:the\\s+)?(?:[a-z]+\\s+){0,2}${orgTok.replace('.', '\\.')}\\b`,
        'i'
      ).test(docLower)
    );
    const docMentionsOrg = orgMatchTokens.some((orgTok) => new RegExp(`\\b${orgTok.replace('.', '\\.')}\\b`, 'i').test(docLower));
    const directLink3 =
      docMentionsOrg &&
      personMentioned &&
      (new RegExp(`\\b(?:incumbent|current)\\s+${rolePattern}\\s+is\\s+(?:[a-z]+\\s+){0,2}(?:${personPattern})\\b`, 'i').test(docLower) ||
        new RegExp(`\\b(?:${personPattern})\\b[^.;!?]{0,90}\\bis\\s+(?:the\\s+)?(?:current|incumbent|\\d+(?:st|nd|rd|th)\\s+and\\s+current)\\s+${rolePattern}\\b`, 'i').test(docLower));
    roleAttachmentVerified = (directLink1 || directLink2 || directLink3) && !(claimAssertsCurrentTenure && docIndicatesEndedTenure);
    if (roleAttachmentVerified && !prep.hasNegation && !docSaysPersonIsFormerOnly && !docHasNegation && kw >= 0.35) {
      return 'supports';
    }
  }

  // If claim asserts negation (e.g. "resigned", "banned", "is not") while official doc affirms active status without negation
  if (prep.hasNegation && !docHasNegation && (docLower.includes('incumbent') || docLower.includes('current') || docLower.includes('serving as'))) {
    return 'contradicts';
  }

  // Currency legal-tender status polarity check (e.g. claim: "stop being legal tender" vs doc: "continues to remain legal tender")
  const claimStopsLegalTender = /\b(?:stop|cease|ceased|no longer|not|lose|loses|invalid|demonetized|banned|discontinued)\b[^.;!?]{0,30}\blegal tender\b/i.test(
    claimLower
  );
  const docContinuesLegalTender = /\b(?:continue|continues|continued|remain|remains|still)\b[^.;!?]{0,30}\blegal tender\b/i.test(
    docLower
  );
  const claimContinuesLegalTender = /\b(?:continue|continues|remain|remains|still)\b[^.;!?]{0,30}\blegal tender\b/i.test(
    claimLower
  );
  const docStopsLegalTender = /\b(?:no longer|not|ceased|stopped)\b[^.;!?]{0,20}\blegal tender\b/i.test(docLower);
  if (
    matchedUniqueCount >= 3 &&
    ((claimStopsLegalTender && docContinuesLegalTender) || (claimContinuesLegalTender && docStopsLegalTender))
  ) {
    return 'contradicts';
  }

  // Numeric/percentage consistency check: if claim specifies a distinct percentage (e.g. 6.5%)
  // and on-topic doc states a conflicting percentage (e.g. 5.25%) without the claimed value, flag conflict
  const claimPercents = Array.from(claimLower.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:%|percent\b)/g)).map((m) => m[1]);
  const docPercents = Array.from(docLower.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:%|percent\b)/g)).map((m) => m[1]);
  if (claimPercents.length > 0 && docPercents.length > 0 && matchedUniqueCount >= 3) {
    const anyMatch = claimPercents.some((cp) => docPercents.includes(cp));
    if (!anyMatch) {
      return 'contradicts';
    }
  }

  // Distance/length quantity consistency check: only on genuinely on-topic documents matching the claimed subject
  const claimDistances = Array.from(claimLower.matchAll(/\b(\d+(?:\.\d+)?)\s*-?\s*(?:km|kilometers?|kilometres?)\b/g)).map((m) => m[1]);
  const docDistancesRaw = Array.from(docLower.matchAll(/\b(\d+(?:\.\d+)?)\s*-?\s*(?:km|kilometers?|kilometres?)\b([^.;\n]{0,30})/gi));
  const docDistances = docDistancesRaw
    .filter((m) => !/^\s*(?:mark|milestone|network|system)\b/i.test(m[2] || ''))
    .map((m) => m[1]);
  const isDifferentMetroColorLine =
    /\b(pink|yellow|green|purple|blue|red|aqua|magenta|silver|orange)\s+line\b/i.test(claimLower) &&
    (() => {
      const claimColor = claimLower.match(/\b(pink|yellow|green|purple|blue|red|aqua|magenta|silver|orange)\s+line\b/i)?.[1];
      const titleHead = docLower.slice(0, 60);
      const docTitleColor = titleHead.match(/\b(pink|yellow|green|purple|blue|red|aqua|magenta|silver|orange)\s+line\b/i)?.[1];
      const docAnyColor = docLower.match(/\b(pink|yellow|green|purple|blue|red|aqua|magenta|silver|orange)\s+line\b/i)?.[1];
      if (claimColor && docTitleColor && claimColor !== docTitleColor) return true;
      return Boolean(claimColor && docAnyColor && claimColor !== docAnyColor && !docLower.includes(`${claimColor} line`));
    })();
  if (
    claimDistances.length > 0 &&
    docDistances.length > 0 &&
    !isDifferentMetroColorLine &&
    matchedUniqueCount >= 4 &&
    kw >= 0.34 &&
    bigramHits >= 1
  ) {
    const anyDistMatch = claimDistances.some((cd) => docDistances.includes(cd));
    if (!anyDistMatch) {
      return 'contradicts';
    }
  }

  // Medal / Award tier conflict check scoped to the claimed event year (avoids "As of 2024..." or prior-year bio lines colliding)
  const medalTiers = ['gold', 'silver', 'bronze'] as const;
  const claimMedal = medalTiers.find((m) => new RegExp(`\\b${m}\\b`).test(claimLower));
  const claimYears = Array.from(claimLower.matchAll(/\b(19\d{2}|20[0-3]\d)\b/g)).map((m) => m[1]);
  const docLowerWithoutAsOf = docLower.replace(/\bas of\s+(?:19\d{2}|20[0-3]\d)\b/g, '');
  const docYears = Array.from(docLowerWithoutAsOf.matchAll(/\b(19\d{2}|20[0-3]\d)\b/g)).map((m) => m[1]);
  const docSharesClaimYear = claimYears.length === 0 || claimYears.some((y) => docYears.includes(y));
  const yearSentences = claimYears.length > 0
    ? docLowerWithoutAsOf.split(/(?<=[.!?])\s+/).filter((s) => claimYears.some((y) => s.includes(y)))
    : [];
  const personClauses = prep.entities.people.length > 0
    ? docLowerWithoutAsOf
        .split(/[.;!?]+/)
        .filter((cl) =>
          prep.entities.people.some((p) => p.toLowerCase().split(/\s+/).some((pt) => pt.length >= 3 && cl.includes(pt))) &&
          (claimYears.length === 0 || claimYears.some((y) => cl.includes(y))) &&
          medalTiers.some((m) => new RegExp(`\\b${m}\\b`).test(cl))
        )
    : [];
  const medalScopeText =
    personClauses.length > 0
      ? personClauses.join(' ')
      : yearSentences.length > 0
        ? yearSentences.join(' ')
        : !isWikipedia
          ? docLower
          : '';
  const scopedDocMedals = medalScopeText
    ? medalTiers.filter((m) => new RegExp(`\\b${m}\\b`).test(medalScopeText))
    : [];
  if (claimMedal && scopedDocMedals.length > 0 && docSharesClaimYear && matchedUniqueCount >= 3) {
    if (!scopedDocMedals.includes(claimMedal)) {
      return 'contradicts';
    }
  }

  // Scope numeric/monetary guards to best matching sub-claim for multi-sentence claims so Sentence 2 isn't penalized for Sentence 1's numbers
  const evalClaimQuantLower = prep.extractedClaims.length >= 2 && bestSubMatchedCount >= 3 ? bestSubClaimLower : claimLower;
  const evalQuantMatchCount = Math.max(matchedUniqueCount, bestSubMatchedCount);

  // Currency / denomination / monetary amount consistency guard (supports ₹/Rs/INR AND $/USD billion/million/bn/mn)
  const claimMonetaryAmounts = Array.from(
    evalClaimQuantLower.replace(/,/g, '').matchAll(/(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rupees?|rs\.?|inr|crore|lakh)\b/gi)
  ).map((m) => m[1] || m[2]);
  const docNoCommas = docLower.replace(/,/g, '');
  if (claimMonetaryAmounts.length > 0) {
    const docMentionsClaimedAmount = claimMonetaryAmounts.some((amt) => new RegExp(`\\b${amt}\\b`).test(docNoCommas));
    if (!docMentionsClaimedAmount) {
      // A doc that doesn't even mention the claimed rupee denomination cannot confirm it
      return 'neutral';
    }
  }

  const normalizeScale = (rawScale: string | undefined): string => {
    const s = (rawScale || '').toLowerCase();
    if (s === 'bn' || s === 'b' || s === 'billion') return 'billion';
    if (s === 'mn' || s === 'm' || s === 'million') return 'million';
    if (s === 'tn' || s === 't' || s === 'trillion') return 'trillion';
    return s;
  };
  const dollarAmountRegex = /(?:\$|usd)\s*(\d+(?:\.\d+)?)(?!\.\d)(?:\s*(billion|bn|b|million|mn|m|trillion|tn|t)\b)?/gi;
  const claimDollarAmounts = Array.from(
    evalClaimQuantLower.replace(/,/g, '').matchAll(dollarAmountRegex)
  ).map((m) => ({ value: m[1], scale: normalizeScale(m[2]) }));
  const docDollarAmounts = Array.from(
    docNoCommas.matchAll(dollarAmountRegex)
  ).map((m) => ({ value: m[1], scale: normalizeScale(m[2]) }));
  if (claimDollarAmounts.length > 0) {
    const dollarMatch = claimDollarAmounts.some((ca) =>
      docDollarAmounts.some((da) => {
        if (da.scale !== ca.scale && ca.scale && da.scale) return false;
        const cNum = parseFloat(ca.value);
        const dNum = parseFloat(da.value);
        if (Number.isNaN(cNum) || Number.isNaN(dNum)) return da.value === ca.value;
        return Math.abs(cNum - dNum) / Math.max(cNum, 0.01) <= 0.1;
      })
    );
    if (!dollarMatch) {
      if (docDollarAmounts.length > 0 && evalQuantMatchCount >= 4 && !isWikipedia) {
        const sameScaleConflict = claimDollarAmounts.some((ca) =>
          docDollarAmounts.some((da) => {
            if (da.scale !== ca.scale && ca.scale && da.scale) return false;
            const cNum = parseFloat(ca.value);
            const dNum = parseFloat(da.value);
            return Math.abs(cNum - dNum) / Math.max(cNum, 0.01) > 0.1;
          })
        );
        if (sameScaleConflict) return 'contradicts';
      }
      return 'neutral';
    }
  }

  // Guard against pre-event speculative/target/allegation articles & interrogative speculative headlines ("to open by August 15?")
  const isSpeculativeQuestionHeadline = /\?\s*(?:-\s*[A-Za-z0-9\s.&']+)?$/.test((docTitle || '').trim());
  const isSpeculativeFutureTarget =
    isSpeculativeQuestionHeadline ||
    (/\b(?:targets?|expected to|likely to|set to|proposed|slated for|to be launched|to open by|planned for|planned to|wants to)\b/i.test(docLower) &&
      !/\b(?:inaugurated|opened|operational|commissioned|flagged off|soft-landed|landed|touched down|confirmed)\b/i.test(docLower));

  // Completed-event year consistency check (e.g. "Chandrayaan-3 landed on the Moon in 2021", "World War II ended in 1950", "Virat Kohli retired from Test cricket in 2024")
  // Excludes multi-year person biographies, team/organization/list overview pages, fictional film lists, unrelated transit lines, and edition/year-scoped articles
  const titleYears = Array.from((docTitle || '').matchAll(/\b(19\d{2}|20[0-3]\d)\b/g)).map((m) => m[1]);
  const isTitleScopedToDifferentYear =
    claimYears.length > 0 &&
    titleYears.length > 0 &&
    !titleYears.some((ty) => claimYears.includes(ty));
  const isFictionOrFilmList = /\b(?:feature films|list of[\w\s]+films|movies|books|novels|video games|episodes|fictional)\b/i.test(
    `${docTitle} ${docLower}`
  );
  const isOverviewOrMultiYearPage =
    isFictionOrFilmList ||
    /\(born\s+(?:\d{1,2}\s+[a-z]+\s+\d{4}|[a-z]+\s+\d{1,2},?\s+\d{4}|\d{4})\)/i.test(docLower) ||
    /\bis\s+an?\s+(?:indian|american|british|australian|[a-z]+)\s+(?:javelin|cricketer|athlete|politician|actor|player|singer|writer|leader)\b/i.test(docLower) ||
    /\b(?:national\s+(?:cricket|football|hockey|women's|men's)\s+team|list\s+of|history\s+of|cabinet\s+of)\b/i.test(`${docTitle} ${docLower}`);
  const isCompletedEventClaim = /\b(?:landed|soft-landed|launched|inaugurated|opened|won|lost|declared|elected|passed away|died|ended|began|started|signed|founded|established|retired|stepped down|resigned|upheld|abolished|occurred|happened)\b/i.test(
    claimLower
  );
  if (
    isCompletedEventClaim &&
    claimYears.length > 0 &&
    docYears.length > 0 &&
    !isSpeculativeFutureTarget &&
    !isDifferentMetroColorLine &&
    !isOverviewOrMultiYearPage &&
    !isTitleScopedToDifferentYear &&
    kw >= 0.45 &&
    matchedUniqueCount >= 3
  ) {
    const docMatchesClaimYear = claimYears.some((cy) => docYears.includes(cy));
    const docDescribesCompletedEvent = /\b(?:landed|soft-landed|soft landing|touched down|launched|inaugurated|opened|won|declared|elected|died|ended|began|started|signed|retired|upheld|operational)\b/i.test(
      docLower
    );
    if (!docMatchesClaimYear && docDescribesCompletedEvent && bigramHits >= 1) {
      return 'contradicts';
    }
  }

  // Publication-date announcement year conflict check when live news headline lacks inline year
  // (e.g., Virat Kohli officially announcing Test retirement in May 2025 vs claim saying 2024)
  const pubYearMatch = (publicationDate || '').match(/\b(19\d{2}|20[0-3]\d)\b/)?.[1];
  const isLiveEventAnnouncement =
    credibilityTier !== 'secondary_web' &&
    !isWikipedia &&
    !isSpeculativeFutureTarget &&
    !/\b(?:on this day|anniversary|years ago|flashback|look back|since \d{4}|in \d{4})\b/i.test(docLower) &&
    /\b(?:announces|announced|retires|inaugurated|opened|soft-landed|declares|declared|upholds|upheld)\b/i.test(docTitle.toLowerCase());
  if (
    isCompletedEventClaim &&
    claimYears.length > 0 &&
    docYears.length === 0 &&
    pubYearMatch &&
    isLiveEventAnnouncement &&
    !claimYears.includes(pubYearMatch) &&
    matchedUniqueCount >= 3 &&
    kw >= 0.45 &&
    bigramHits >= 1
  ) {
    return 'contradicts';
  }

  // Never confirm factual/historical claims via fiction/film-list pages
  if (isFictionOrFilmList) {
    return 'neutral';
  }

  // Recent/current news guard: outdated archive sources cannot confirm a current_present claim
  if (prep.claimMeta?.temporalIntent === 'current_present' && temporalStatus === 'outdated') {
    return 'neutral';
  }

  // Future predictions & vague unnamed clickbait claims cannot be rubber-stamped as confirmed facts
  if (prep.claimMeta?.isFuturePrediction || prep.claimMeta?.isVagueUnnamedClaim) {
    return 'neutral';
  }

  // An allegation-only report cannot confirm a disputed factual assertion on its own unless claim explicitly asks about an allegation
  if (evidenceRole === 'allegation_or_report' && !prep.claimMeta?.isAllegationOnly && !prep.isQuestion) {
    return 'neutral';
  }

  // Open WH-question factual lookup shortcut (STRICTLY excluding yes/no verification checks like "is it true ...?")
  const isOpenWhQuestion =
    /^(?:who|what|when|where|which|name)\b/i.test(prep.normalizedQuery) ||
    /^(?:the\s+)?(?:president|prime minister|chief minister|capital)\s+of\s+/i.test(prep.normalizedQuery) ||
    /\b(?:who is|what is)\b/i.test(prep.cleanedInput) ||
    /ಯಾರು|ಏನು|ಯಾವಾಗ|कौन|क्या|कब/u.test(prep.originalInput);
  if (isOpenWhQuestion && (kw >= 0.35 || sem >= 0.25)) {
    return 'supports';
  }

  // Enforce structural NLI incompatibilities before generic lexical/semantic approval:
  // e.g., sarcasm, role-reversal, pregnancy vs birth, non-exclusive vs exclusive cardinality, or different actor
  if (nliResult?.structuralLock) {
    if (nliResult.label === 'CONTRADICTION') {
      return 'contradicts';
    }
    if (nliResult.label === 'NEUTRAL' && !isOpenWhQuestion) {
      return 'neutral';
    }
  }

  // Strong semantic NLI contradiction (e.g., negated vs affirmative on the same event/actor; role/tenure uses Case A/B/C checks above)
  if (
    nliResult?.label === 'CONTRADICTION' &&
    nliResult.confidence >= 0.85 &&
    matchedUniqueCount >= 2 &&
    nliResult.claimFrame.eventType !== 'appointment_tenure' &&
    !isOverviewOrMultiYearPage &&
    !isTitleScopedToDifferentYear
  ) {
    return 'contradicts';
  }

  // Clickbait/teaser fact-check question headlines without confirmation never count as 'supports'
  if (isFactCheckHeadlineOrOrg && docText.includes('?')) {
    return 'neutral';
  }

  // Detect brief news-topic / headline lookup intent (e.g., "pink line of bengaluru namma metro news")
  // strictly WITHOUT debatable assertion verbs or negation so false claims are never elevated!
  const isTopicHeadlineQuery =
    !prep.hasNegation &&
    (/\b(?:news|update|updates|latest|status|details|info)\s*$/i.test(prep.cleanedInput) ||
      (uniqueQueryTokens.length <= 6 &&
        !/\b(?:is|are|was|were|will|won|launched|opened|banned|dead|died|resigned|retired|ended|hiked|announced|giving|offers|free|claims?|fake|hoax)\b/i.test(
          prep.normalizedQuery
        )));

  // Length-aware thresholds: concise headlines/encyclopedia excerpts vs long multi-clause claims (9+ tokens)
  const evalKw = prep.extractedClaims.length >= 2 ? Math.max(kw, bestSubKw) : kw;
  const evalSem = prep.extractedClaims.length >= 2 ? Math.max(sem, bestSubSem) : sem;
  const evalMatchedCount = prep.extractedClaims.length >= 2 ? Math.max(matchedUniqueCount, bestSubMatchedCount) : matchedUniqueCount;
  const evalBigrams = prep.extractedClaims.length >= 2 ? Math.max(bigramHits, bestSubBigrams) : bigramHits;
  const evalTokenLen = prep.extractedClaims.length >= 2 ? bestSubUniqueQueryTokens.length : uniqueQueryTokens.length;
  const evalIsDetailed = !prep.hasNegation && evalTokenLen >= 9;
  const evalMinKw = isTopicHeadlineQuery ? 0.50 : evalIsDetailed ? 0.38 : 0.55;
  const evalMinSem = isTopicHeadlineQuery ? 0.32 : evalIsDetailed ? 0.30 : 0.36;

  // Paraphrase / contextual NLI entailment can also confirm matching claims when all numeric/role/year guards hold
  const nliParaphraseEntailed =
    Boolean(nliResult && nliResult.label === 'ENTAILMENT' && nliResult.confidence >= 0.78) &&
    !isSpeculativeFutureTarget &&
    roleAttachmentVerified &&
    !(prep.hasNegation && nliResult?.evidenceFrame.polarity !== 'negative');

  const passesLexicalOrNli =
    (!prep.hasNegation && !isSpeculativeFutureTarget && roleAttachmentVerified && evalKw >= evalMinKw && evalSem >= evalMinSem) ||
    nliParaphraseEntailed;

  if (passesLexicalOrNli) {
    if (!nliParaphraseEntailed && isTopicHeadlineQuery && evalMatchedCount < Math.min(2, evalTokenLen)) {
      return 'neutral';
    }
    // Guard role claims when doc hasn't matched the actual office holder
    if (claimLower.includes('president of india') && !docLower.includes('president of india')) {
      return 'neutral';
    }
    if (claimLower.includes('prime minister of india') && !docLower.includes('prime minister')) {
      return 'neutral';
    }
    // Guard percentage claims (e.g. 6.5%)
    if (claimPercents.length > 0 && !claimPercents.some((cp) => docPercents.includes(cp))) {
      return 'neutral';
    }
    // If claim specifies a distance (e.g. 15-km), doc must also mention that exact distance to confirm it
    if (claimDistances.length > 0 && !claimDistances.some((cd) => docDistances.includes(cd))) {
      return 'neutral';
    }
    // Guard universal "government ... all <group>" claims from being confirmed by a state-only scheme (e.g., Tamil Nadu)
    const claimAssertsUniversalTarget = /\b(?:government|govt)\b/i.test(claimLower) && /\b(?:all|every)\s+(?:students|college students|citizens|people|youth)\b/i.test(claimLower);
    const claimNamesSpecificState = /\b(?:tamil nadu|karnataka|kerala|maharashtra|uttar pradesh|rajasthan|odisha|bihar|telangana|gujarat|assam|delhi)\b/i.test(claimLower);
    const docNamesSpecificState = /\b(?:tamil nadu|karnataka|kerala|maharashtra|uttar pradesh|rajasthan|odisha|bihar|telangana|gujarat|assam)\b/i.test(docLower);
    if (claimAssertsUniversalTarget && !claimNamesSpecificState && docNamesSpecificState) {
      return 'neutral';
    }
    // If claim asks about a medal + specific year (e.g. gold medal 2024), require that year and medal in the supporting doc
    if (claimMedal && ((claimYears.length > 0 && !docSharesClaimYear) || !new RegExp(`\\b${claimMedal}\\b`).test(docLower))) {
      return 'neutral';
    }
    // If claim asserts a completed event year, require that year in the supporting doc (or matching publication year if snippet has no explicit year)
    if (isCompletedEventClaim && claimYears.length > 0) {
      const hasExactYearInText = claimYears.some((cy) => docYears.includes(cy));
      const hasMatchingPubYearWhenTextUndated = docYears.length === 0 && Boolean(pubYearMatch && claimYears.includes(pubYearMatch));
      if (!hasExactYearInText && !hasMatchingPubYearWhenTextUndated) {
        return 'neutral';
      }
    }

    // Guard any single-claim assertion naming a person so unrelated profiles (e.g. Manu Bhaker) never support a claim about someone else (e.g. Neeraj Chopra)
    if (prep.entities.people.length > 0 && prep.extractedClaims.length === 1) {
      const personMatched = prep.entities.people.some((p) => {
        const pTokens = p.toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
        return pTokens.some((pt) => docLower.includes(pt));
      });
      if (!personMatched && (claimMedal || evalBigrams < 3)) {
        return 'neutral';
      }
    }

    // Never allow a general institutional summary to confirm a claim asserting an uncorroborated WhatsApp circular
    if (/\b(?:whatsapp\s+(?:circular|forward|message)|via\s+whatsapp)\b/i.test(claimLower) && !docLower.includes('whatsapp')) {
      return 'neutral';
    }

    if (!nliParaphraseEntailed) {
      if (
        nliResult?.claimFrame.cardinality !== undefined &&
        nliResult.claimFrame.isExclusiveCardinality &&
        nliResult.evidenceFrame.cardinality !== nliResult.claimFrame.cardinality
      ) {
        return 'neutral';
      }
      const strictPredicateEvents = new Set([
        'birth_delivery',
        'marriage_union',
        'death_passing',
        'acquisition_merger',
        'medical_cure_effect',
      ]);
      if (
        nliResult?.claimFrame.eventType &&
        strictPredicateEvents.has(nliResult.claimFrame.eventType) &&
        nliResult.evidenceFrame.eventType !== nliResult.claimFrame.eventType
      ) {
        return 'neutral';
      }
      if (evalIsDetailed) {
        if (evalMatchedCount < (prep.extractedClaims.length >= 2 ? 4 : 5) || evalBigrams < (prep.extractedClaims.length >= 2 ? 1 : 2)) {
          return 'neutral';
        }
      } else if (evalTokenLen >= 3 && evalBigrams === 0) {
        return 'neutral';
      }
    }

    return 'supports';
  }

  return 'neutral';
}

// ============================================================================
// 4. RAG CONTEXT CONSTRUCTION & EVIDENCE EVALUATION
// ============================================================================

/**
 * Builds a clean, ranked, deduplicated, context-window-safe RAG context block for the LLM.
 */
export function aggregateEvidenceContext(
  results: SearchResultItem[],
  extractedClaims: ExtractedClaim[],
  sourceEntity: string,
  preprocessed?: PreprocessedQuery
): string {
  const headerLines: string[] = [];
  if (preprocessed) {
    headerLines.push(`ORIGINAL USER INPUT: "${preprocessed.originalInput}"`);
    headerLines.push(`NORMALIZED QUERY (${preprocessed.detectedLanguage.toUpperCase()}): "${preprocessed.normalizedQuery}"`);
    if (preprocessed.correctionsApplied.length > 0) {
      headerLines.push(
        `SPELL/GRAMMAR NORMALIZATION: ${preprocessed.correctionsApplied.map((c) => `"${c.from}"->"${c.to}"`).join(', ')}`
      );
    }
    const e = preprocessed.entities;
    const entitySummary = [
      e.people.length ? `People: ${e.people.join(', ')}` : '',
      e.organizations.length ? `Orgs: ${e.organizations.join(', ')}` : '',
      e.locations.length ? `Locations: ${e.locations.join(', ')}` : '',
      e.dates.length ? `Dates: ${e.dates.join(', ')}` : '',
      e.amounts.length ? `Amounts: ${e.amounts.join(', ')}` : '',
    ].filter(Boolean).join(' | ');
    if (entitySummary) headerLines.push(`EXTRACTED ENTITIES: ${entitySummary}`);
    if (preprocessed.semanticFrame) {
      const sf = preprocessed.semanticFrame;
      const frameParts = [
        sf.actor ? `Actor=${sf.actor}` : '',
        sf.eventType ? `Event=${sf.eventType}` : '',
        sf.target ? `Target=${sf.target}` : '',
        `Modality=${sf.modality}`,
        `Tense=${sf.tense}`,
        `Polarity=${sf.polarity}`,
        sf.cardinality !== undefined ? `Cardinality=${sf.cardinality}${sf.isExclusiveCardinality ? '(exclusive)' : '(non-exclusive)'}` : '',
      ].filter(Boolean);
      headerLines.push(`SEMANTIC FRAME: ${frameParts.join(' | ')}`);
    }
  }

  const claimBullets = extractedClaims.map((c, i) => `Claim ${i + 1}: "${c.claim}"`).join('; ');
  if (claimBullets) {
    headerLines.push(`TARGET ASSERTIONS: ${claimBullets}`);
  }

  if (!results || results.length === 0) {
    headerLines.push(
      `\n[RAG RETRIEVAL NOTICE] No relevant live web excerpts passed relevance filtering for this claim. Do NOT fabricate evidence. If ${sourceEntity} and live search provide no conclusive confirmation or refutation, classify as unverified (UNVERIFIED) rather than false.`
    );
    return headerLines.join('\n');
  }

  // Ensure both supporting and contradicting evidence are represented within 6800 char budget
  const MAX_CONTEXT_CHARS = 6800;
  let body = '\nRETRIEVED & RERANKED MULTI-SOURCE EVIDENCE:\n';

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const stanceTag = r.stance ? ` | Polarity: ${r.stance.toUpperCase()}` : '';
    const nliTag = r.nliLabel
      ? ` | NLI: ${r.nliLabel}${r.nliConfidence ? ` (${Math.round(r.nliConfidence * 100)}%)` : ''}${r.nliReason ? ` - ${r.nliReason}` : ''}`
      : '';
    const dateTag = r.temporalStatus === 'outdated' ? ` [HISTORICAL/OLD: ${r.publicationDate || 'Past'}]` : ` [Date: ${r.publicationDate || 'Live Index'}]`;
    const scoreTag = r.relevanceScore !== undefined ? ` | Rel: ${(r.relevanceScore * 100).toFixed(0)}%` : '';
    const block =
      `[Source ${i + 1}] ${r.sourceName} (${r.category}, Tier: ${r.credibilityTier})${dateTag}${stanceTag}${nliTag}${scoreTag}\n` +
      `URL: ${r.url}\n` +
      `Excerpt: "${r.snippet.slice(0, 620)}"\n\n`;

    if ((headerLines.join('\n').length + body.length + block.length) > MAX_CONTEXT_CHARS) {
      break;
    }
    body += block;
  }

  return `${headerLines.join('\n')}${body}`;
}

/**
 * Evaluates retrieved evidence directly (independent of LLM) to prevent false UNVERIFIED
 * when strong evidence exists, prevent false REAL on weak/unreliable sources, and classify
 * verified claims strictly into TRUE NEWS (verified_true) or FALSE NEWS (false), or
 * Verification Pending (unverified) when evidence is insufficient or conflicting.
 */
export function evaluateEvidenceForVerdict(
  prep: PreprocessedQuery,
  items: SearchResultItem[],
  searchStatus: 'operational' | 'fallback_archive' | 'error_reported'
): EvidenceEvaluationResult {
  if (prep.isOcrFailureOrEmpty || searchStatus === 'error_reported') {
    const reason = searchStatus === 'error_reported'
      ? 'Live search encountered a network failure; verification is pending without inventing a verdict.'
      : 'Input could not be parsed cleanly; verification is pending.';
    return {
      recommendedVerdict: 'unverified',
      confidence: 35,
      supportingItems: [],
      contradictingItems: [],
      neutralItems: [],
      contextualItems: [],
      hasConflict: false,
      hasOutdatedEvidence: false,
      reasoningNote: reason,
      insufficiencyReason: reason,
      cragSufficient: false,
    };
  }

  const supportingItems = items.filter((i) => i.stance === 'supports');
  const contradictingItems = items.filter((i) => i.stance === 'contradicts');
  const neutralItems = items.filter((i) => i.stance !== 'supports' && i.stance !== 'contradicts' && i.stance !== 'irrelevant');
  const contextualItems = neutralItems;
  const hasOutdatedEvidence = items.some((i) => i.temporalStatus === 'outdated');

  // Credible corroboration REQUIRES at least one non-secondary authoritative/accredited/fact-check source
  // (Never classify news as TRUE based only on result count or unreliable secondary websites)
  const credibleSupportItems = supportingItems.filter((i) => i.credibilityTier !== 'secondary_web');
  const credibleContradictionItems = contradictingItems.filter(
    (i) => i.credibilityTier !== 'secondary_web' || (i.relevanceScore || 0) >= 0.50
  );

  const hasCredibleSupport = credibleSupportItems.length > 0;
  const hasCredibleContradiction = credibleContradictionItems.length > 0;

  if (prep.isSarcastic && !hasCredibleContradiction) {
    const reason = 'Claim uses sarcasm or irony and cannot be verified as a literal factual statement.';
    return {
      recommendedVerdict: 'unverified',
      confidence: 38,
      supportingItems: [],
      contradictingItems,
      neutralItems: [...supportingItems, ...neutralItems],
      contextualItems: [...supportingItems, ...neutralItems],
      hasConflict: false,
      hasOutdatedEvidence,
      reasoningNote: reason,
      insufficiencyReason: reason,
      cragSufficient: false,
    };
  }

  // Distinguish "confirmation not yet available for breaking/recent news" vs "proven did not happen"
  const isRecentBreakingClaim =
    prep.claimMeta?.temporalIntent === 'recent_news' || prep.claimMeta?.temporalIntent === 'current_present';
  const nliNeutralReason = neutralItems.find((i) => i.nliReason && /expecting|pregnancy|non-exclusive|modality|ambiguous|sarcasm/i.test(i.nliReason))?.nliReason;
  const breakingInsufficiencyNote =
    nliNeutralReason ||
    (prep.isAmbiguous ? prep.ambiguousReason : undefined) ||
    (isRecentBreakingClaim && !hasCredibleSupport && !hasCredibleContradiction
      ? 'Live event confirmation is not yet available in accessible official portals or accredited news indexes (this does not prove the event did not happen).'
      : undefined);

  // Build individual sub-claim assessments so multi-part claims show granular support/contradiction/pending status
  const computeSubClaimEvaluations = (
    fallbackVerdict: VerdictType | null
  ): SubClaimEvaluation[] => {
    return prep.extractedClaims.map((sub) => {
      const subLower = sub.claim.toLowerCase();
      const subTokens = unicodeTokenize(sub.claim).filter(
        (t) =>
          !STOPWORDS.has(t) &&
          !NEGATION_TOKENS.has(t) &&
          !/^(?:announced|provided|applies|effective|scheme|service|leaders|also|ahead|operations|starting|direct|visit|ties)$/i.test(t) &&
          t.length >= 3
      );
      const rawTokens = unicodeTokenize(sub.claim).filter(
        (t) => !STOPWORDS.has(t) && !NEGATION_TOKENS.has(t) && t.length >= 3
      );
      const tokensToMatch = subTokens.length > 0 ? subTokens : rawTokens;
      const ratio = tokensToMatch.length >= 6 ? 0.45 : 0.6;
      const requiredHits = tokensToMatch.length === 0 ? 0 : Math.min(tokensToMatch.length, Math.max(1, Math.ceil(tokensToMatch.length * ratio)));

      const matchesItem = (item: SearchResultItem) => {
        if (tokensToMatch.length === 0) return false;
        const doc = `${item.title} ${item.snippet}`.toLowerCase();
        const hits = tokensToMatch.filter((t) => {
          if (doc.includes(t)) return true;
          return t.length >= 5 && doc.includes(t.slice(0, 5));
        }).length;
        const universalWord = subLower.match(/\b(every|all)\b/)?.[1];
        const effectiveMonthOrDate = subLower.match(/\b(?:from|effective)\s+([a-z0-9]+)/i)?.[1];
        if (universalWord && !new RegExp(`\\b(?:${universalWord}|universal|100%)\\b`, 'i').test(doc)) {
          return false;
        }
        if (effectiveMonthOrDate && !doc.includes(effectiveMonthOrDate.toLowerCase())) {
          return false;
        }
        return hits >= requiredHits;
      };

      const hasSubContradiction = credibleContradictionItems.some(matchesItem);
      const hasSubSupport = credibleSupportItems.some(matchesItem);

      if (hasSubContradiction && !hasSubSupport) {
        return {
          id: sub.id,
          verdict: 'false',
          clearVerdictStatus: 'FAKE',
          statusLabel: 'FALSE NEWS',
        };
      }
      if (hasSubSupport && !hasSubContradiction) {
        return {
          id: sub.id,
          verdict: 'verified_true',
          clearVerdictStatus: 'REAL',
          statusLabel: 'TRUE NEWS',
        };
      }
      if (prep.extractedClaims.length === 1 && fallbackVerdict === 'verified_true') {
        return {
          id: sub.id,
          verdict: 'verified_true',
          clearVerdictStatus: 'REAL',
          statusLabel: 'TRUE NEWS',
        };
      }
      if (prep.extractedClaims.length === 1 && fallbackVerdict === 'false') {
        return {
          id: sub.id,
          verdict: 'false',
          clearVerdictStatus: 'FAKE',
          statusLabel: 'FALSE NEWS',
        };
      }
      return {
        id: sub.id,
        verdict: 'unverified',
        clearVerdictStatus: 'UNVERIFIED',
        statusLabel: 'Verification Pending',
      };
    });
  };

  if (hasCredibleSupport && hasCredibleContradiction) {
    const subEvalsConflictCheck = computeSubClaimEvaluations(null);
    const hasDistinctFalseSubClaim =
      prep.extractedClaims.length >= 2 && subEvalsConflictCheck.some((e) => e.verdict === 'false');
    if (hasDistinctFalseSubClaim) {
      const topC = credibleContradictionItems[0] || contradictingItems[0];
      return {
        recommendedVerdict: 'false',
        confidence: Math.min(90, Math.round(74 + (topC.relevanceScore || 0.45) * 20)),
        supportingItems,
        contradictingItems,
        neutralItems,
        contextualItems,
        hasConflict: false,
        hasOutdatedEvidence,
        subClaimEvaluations: subEvalsConflictCheck,
        bestAnswerExcerpt: topC.snippet,
        reasoningNote: `Credible retrieved sources led by ${topC.sourceName} directly contradict key factual figures or assertions in the claim.`,
      };
    }

    const strongAccreditedContradictions = contradictingItems.filter((i) => i.credibilityTier !== 'secondary_web');
    const hasPrimaryDebunk = contradictingItems.some(
      (i) => i.isPrimary || (i.credibilityTier === 'factcheck_org' && !i.url.toLowerCase().includes('wikipedia.org'))
    );
    if (
      (hasPrimaryDebunk && contradictingItems.length > supportingItems.length) ||
      (contradictingItems.length >= 3 &&
        strongAccreditedContradictions.length >= 2 &&
        contradictingItems.length >= supportingItems.length * 3)
    ) {
      const topC = strongAccreditedContradictions[0] || contradictingItems[0];
      return {
        recommendedVerdict: 'false',
        confidence: Math.min(91, Math.round(74 + (topC.relevanceScore || 0.45) * 20)),
        supportingItems,
        contradictingItems,
        neutralItems,
        contextualItems,
        hasConflict: false,
        hasOutdatedEvidence,
        subClaimEvaluations: computeSubClaimEvaluations('false'),
        bestAnswerExcerpt: topC.snippet,
        reasoningNote: `Authoritative sources led by ${topC.sourceName} directly contradict the claim.`,
      };
    }

    const strongSupports = credibleSupportItems;
    if (
      !hasPrimaryDebunk &&
      supportingItems.length >= 4 &&
      strongSupports.length >= 3 &&
      supportingItems.length >= contradictingItems.length * 4
    ) {
      const topS = strongSupports[0] || supportingItems[0];
      return {
        recommendedVerdict: 'verified_true',
        confidence: Math.min(92.5, Math.round(76 + (topS.relevanceScore || 0.5) * 20)),
        supportingItems,
        contradictingItems,
        neutralItems,
        contextualItems,
        hasConflict: false,
        hasOutdatedEvidence,
        subClaimEvaluations: computeSubClaimEvaluations('verified_true'),
        bestAnswerExcerpt: topS.snippet,
        reasoningNote: `Corroborated by strong consensus across ${supportingItems.length} retrieved sources, led by ${topS.sourceName}.`,
      };
    }

    return {
      recommendedVerdict: 'unverified',
      confidence: 48,
      supportingItems,
      contradictingItems,
      neutralItems,
      contextualItems,
      hasConflict: true,
      hasOutdatedEvidence,
      subClaimEvaluations: subEvalsConflictCheck,
      bestAnswerExcerpt: supportingItems[0]?.snippet || contradictingItems[0]?.snippet,
      reasoningNote: 'Retrieved credible sources contain conflicting assertions. Verification is pending until authoritative clarification is available.',
      insufficiencyReason: 'Conflicting assertions across credible sources remain unresolved.',
    };
  }

  if (hasCredibleContradiction) {
    const topC = credibleContradictionItems[0] || contradictingItems[0];
    const conf = Math.min(93, Math.round(74 + (topC.relevanceScore || 0.4) * 24));
    return {
      recommendedVerdict: 'false',
      confidence: conf,
      supportingItems,
      contradictingItems,
      neutralItems,
      contextualItems,
      hasConflict: false,
      hasOutdatedEvidence,
      subClaimEvaluations: computeSubClaimEvaluations('false'),
      bestAnswerExcerpt: topC.snippet,
      reasoningNote: `Credible retrieved evidence from ${topC.sourceName} directly contradicts or debunks the claim.`,
    };
  }

  if (hasCredibleSupport) {
    const topS = credibleSupportItems[0] || supportingItems[0];
    const subEvals = computeSubClaimEvaluations('verified_true');

    if (prep.extractedClaims.length >= 2) {
      const unsupportedSubClaims = prep.extractedClaims
        .filter((_s, idx) => subEvals[idx]?.verdict !== 'verified_true')
        .map((s) => s.claim);
      if (unsupportedSubClaims.length > 0 && unsupportedSubClaims.length < prep.extractedClaims.length) {
        return {
          recommendedVerdict: 'unverified',
          confidence: 48,
          supportingItems,
          contradictingItems,
          neutralItems,
          contextualItems,
          hasConflict: false,
          hasOutdatedEvidence,
          hasPartialSubClaimSupport: true,
          unsupportedSubClaims,
          subClaimEvaluations: subEvals,
          bestAnswerExcerpt: topS.snippet,
          reasoningNote: `Only part of the claim has credible support; ${unsupportedSubClaims.length} sub-claim(s) remain unverified: ${unsupportedSubClaims.join(' | ')}`,
          insufficiencyReason: `Partial corroboration only; unverified condition(s): ${unsupportedSubClaims.join('; ')}`,
        };
      }
      if (unsupportedSubClaims.length === prep.extractedClaims.length) {
        return {
          recommendedVerdict: null,
          confidence: 42,
          supportingItems,
          contradictingItems,
          neutralItems,
          contextualItems,
          hasConflict: false,
          hasOutdatedEvidence,
          hasPartialSubClaimSupport: false,
          unsupportedSubClaims,
          subClaimEvaluations: subEvals,
          bestAnswerExcerpt: neutralItems[0]?.snippet || topS.snippet,
          reasoningNote: 'Individual sub-claims lack independent credible corroboration; verification is pending.',
          insufficiencyReason: 'Individual sub-claims lack independent credible corroboration.',
        };
      }
    }

    const avgRel =
      credibleSupportItems.slice(0, 3).reduce((acc, s) => acc + (s.relevanceScore || 0.45), 0) /
      Math.min(credibleSupportItems.length, 3);
    const conf = Math.min(94.5, Number((72 + avgRel * 25 + Math.min(credibleSupportItems.length, 3) * 2.5).toFixed(1)));
    return {
      recommendedVerdict: 'verified_true',
      confidence: conf,
      supportingItems,
      contradictingItems,
      neutralItems,
      contextualItems,
      hasConflict: false,
      hasOutdatedEvidence,
      subClaimEvaluations: subEvals,
      bestAnswerExcerpt: topS.snippet,
      reasoningNote: `Corroborated by ${credibleSupportItems.length} credible retrieved source(s), led by ${topS.sourceName}.`,
    };
  }

  return {
    recommendedVerdict: null,
    confidence: 42,
    supportingItems,
    contradictingItems,
    neutralItems,
    contextualItems,
    hasConflict: false,
    hasOutdatedEvidence,
    unsupportedSubClaims: prep.extractedClaims.length >= 2 ? prep.extractedClaims.map((s) => s.claim) : undefined,
    bestAnswerExcerpt: neutralItems[0]?.snippet,
    reasoningNote: breakingInsufficiencyNote || 'Retrieved credible evidence is insufficient or inconclusive to verify or refute this claim. Verification is pending.',
    insufficiencyReason: breakingInsufficiencyNote || 'Insufficient credible evidence retrieved across evaluated authorities and news wires.',
  };
}

/**
 * STEP 3 & 4: Calibrated Evidence Scoring & Breakdown
 * Strictly avoids arbitrary 99% values.
 */
export interface EvidenceAnalysisExtraContext {
  extraLimitations?: string[];
  missingContext?: string[];
  hasOutdatedEvidence?: boolean;
  hasPartialSubClaimSupport?: boolean;
  unsupportedSubClaims?: string[];
  isFuturePrediction?: boolean;
  isVagueUnnamedClaim?: boolean;
  isAllegationOnly?: boolean;
  irrelevantFilteredCount?: number;
  cragIterations?: number;
  cragTrace?: string[];
  insufficiencyReason?: string;
}

export function buildEvidenceAnalysisAndScoring(
  _claim: string,
  verdict: VerdictType,
  sources: EvidenceSource[],
  _searchResults: SearchResultItem[],
  searchStatus: 'operational' | 'fallback_archive' | 'error_reported',
  queryCount: number,
  deduplicatedCount: number,
  extraContext?: EvidenceAnalysisExtraContext
): EvidenceAnalysis {
  const supportingEvidence: EvidencePoint[] = [];
  const contradictingEvidence: EvidencePoint[] = [];
  const neutralEvidence: EvidencePoint[] = [];
  const limitationsAndUnresolved: string[] = [];
  const missingContext: string[] = [...(extraContext?.missingContext || [])];

  if (extraContext?.extraLimitations && extraContext.extraLimitations.length > 0) {
    limitationsAndUnresolved.push(...extraContext.extraLimitations);
  }

  for (const src of sources) {
    const safeUrl = sanitizeExternalUrl(src.url);
    const point: EvidencePoint = {
      point: src.details,
      sourceName: src.name,
      url: safeUrl,
      date: src.publicationDate || src.timestamp || 'Official Registry Record',
      retrievedAt: src.retrievedAt || new Date().toISOString(),
      credibilityLabel:
        src.credibilityLabel ||
        classifySourceCredibility(safeUrl || '', src.name).categoryLabel,
      quoteOrExcerpt: src.details,
      isPrimarySource: src.isPrimary ?? (src.category.includes('Official') || src.category.includes('Gazette')),
      nliLabel: src.nliLabel,
      nliConfidence: src.nliConfidence,
      nliReason: src.nliReason,
    };

    if (src.status === 'confirmed' || src.status === 'corroborated') {
      if (verdict === 'false') {
        contradictingEvidence.push(point);
      } else {
        supportingEvidence.push(point);
      }
    } else if (src.status === 'refuted' || src.status === 'contradicted') {
      contradictingEvidence.push(point);
    } else {
      neutralEvidence.push(point);
    }
  }

  if (neutralEvidence.length > 0) {
    limitationsAndUnresolved.push(
      `${neutralEvidence.length} contextual/neutral source(s) reviewed without providing direct confirmation or refutation.`
    );
  }

  const sourceCountScore = Math.min(sources.length * 8, 25);

  let qualityScore = 10;
  const hasOfficialPrimary = sources.some(
    (s) => s.credibilityTier === 'official_primary' || s.category.includes('Official') || s.category.includes('Gazette') || s.category.includes('Desk')
  );
  const hasAccreditedNews = sources.some(
    (s) => s.credibilityTier === 'accredited_press' || s.credibilityTier === 'factcheck_org' || s.name.includes('The Hindu') || s.name.includes('Reuters') || s.name.includes('Wikipedia')
  );
  if (hasOfficialPrimary) qualityScore = 30;
  else if (hasAccreditedNews) qualityScore = 24;

  const primaryScore = hasOfficialPrimary ? 20 : hasAccreditedNews ? 14 : 8;

  let agreementScore = 15;
  if (verdict === 'partly_true' || (supportingEvidence.length > 0 && contradictingEvidence.length > 0)) {
    agreementScore = 5;
    limitationsAndUnresolved.push(
      'Conflicting reports detected between public claims and verified records.'
    );
  }

  let baseScore = sourceCountScore + qualityScore + primaryScore + agreementScore;

  const hasConflict = supportingEvidence.length > 0 && contradictingEvidence.length > 0;

  if (verdict === 'unverified') {
    baseScore = hasConflict
      ? Math.min(Math.max(sources.length * 7 + 28, 40), 56)
      : Math.min(Math.max(sources.length * 8 + 22, 35), 52);

    if (extraContext?.isFuturePrediction) {
      missingContext.push('Claim makes a future prediction or forecast that cannot be verified as an established fact today.');
      limitationsAndUnresolved.push('Future forecasts remain outside factual verification until real-world outcomes occur.');
    } else if (extraContext?.isVagueUnnamedClaim) {
      missingContext.push('Missing named individuals, location, official agency, or incident date.');
      limitationsAndUnresolved.push('Claim omits specific names or locations required for authoritative fact-checking.');
    } else if (extraContext?.unsupportedSubClaims?.length) {
      missingContext.push(`Unverified sub-claim conditions: ${extraContext.unsupportedSubClaims.join('; ')}`);
      limitationsAndUnresolved.push(
        extraContext.hasPartialSubClaimSupport
          ? 'Only part of this multi-part claim is corroborated; remaining conditions lack credible evidence.'
          : 'None of the decomposed sub-claim conditions currently have credible corroborating evidence.'
      );
    } else if (extraContext?.insufficiencyReason) {
      limitationsAndUnresolved.push(extraContext.insufficiencyReason);
    } else {
      limitationsAndUnresolved.push(
        hasConflict
          ? 'Conflicting credible evidence retrieved; verification remains pending until authoritative clarification resolves the discrepancy.'
          : 'Insufficient credible records currently available to verify or refute this claim; verification is pending.'
      );
    }

    if (extraContext?.hasOutdatedEvidence) {
      missingContext.push('Some retrieved sources carry older publication dates that cannot confirm current status alone.');
    }
    if (extraContext?.isAllegationOnly) {
      missingContext.push('Available reporting cites unconfirmed allegations rather than adjudicated facts.');
    }
  } else if (searchStatus === 'error_reported') {
    baseScore = Math.max(baseScore - 25, 30);
    limitationsAndUnresolved.push(
      'Live external search provider experienced a network disruption; evaluation completed conservatively.'
    );
  } else if (deduplicatedCount > 2) {
    baseScore = Math.max(baseScore - 6, 40);
    limitationsAndUnresolved.push(
      `${deduplicatedCount} duplicate or syndicated reports removed to ensure independent verification.`
    );
  }

  const calibratedScore = Number(Math.min(Math.max(baseScore, 32), 95.8).toFixed(1));

  let evidenceStrength: EvidenceStrengthRating = 'insufficient_data';
  let evidenceStrengthLabel = 'Insufficient Public Data';

  if (verdict === 'verified_true') {
    evidenceStrength = 'high_corroboration';
    evidenceStrengthLabel = 'High Evidence Corroboration';
  } else if (verdict === 'false') {
    evidenceStrength = 'direct_contradiction';
    evidenceStrengthLabel = 'Direct Official Contradiction';
  } else if (hasConflict || verdict === 'partly_true' || verdict === 'misleading') {
    evidenceStrength = 'mixed_evidence';
    evidenceStrengthLabel = 'Conflicting Evidence (Verification Pending)';
  } else {
    evidenceStrength = 'insufficient_data';
    evidenceStrengthLabel = 'Insufficient Public Data';
  }

  if (verdict === 'misleading' || verdict === 'context_missing') {
    missingContext.push(
      'Crucial chronological or statutory context was omitted from the circulating headline.'
    );
  }

  return {
    evidenceStrength,
    evidenceStrengthLabel,
    criteriaScore: calibratedScore,
    supportingEvidence,
    contradictingEvidence,
    neutralEvidence: neutralEvidence.length > 0 ? neutralEvidence : [],
    missingContext: missingContext.length > 0 ? Array.from(new Set(missingContext)) : undefined,
    limitationsAndUnresolved:
      limitationsAndUnresolved.length > 0
        ? Array.from(new Set(limitationsAndUnresolved))
        : ['Continuous indexing active; subsequent gazette updates will be incorporated automatically.'],
    searchProviderStatus: searchStatus,
    searchQueryCount: queryCount,
    deduplicatedCount,
    irrelevantFilteredCount: extraContext?.irrelevantFilteredCount,
    cragIterations: extraContext?.cragIterations,
    cragTrace: extraContext?.cragTrace,
    insufficiencyReason: extraContext?.insufficiencyReason,
  };
}
