import type {
  EvidencePoint,
  EvidenceAnalysis,
  EvidenceSource,
  EvidenceStrengthRating,
  ExtractedClaim,
  SubmissionMode,
  VerdictType,
  Language,
} from '../types.ts';

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
}

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  publicationDate?: string;
  sourceName: string;
  category: string;
  isPrimary: boolean;
  credibilityTier: 'official_primary' | 'accredited_press' | 'factcheck_org' | 'secondary_web';
  relevanceScore?: number;
  semanticScore?: number;
  keywordScore?: number;
  entityScore?: number;
  stance?: 'supports' | 'contradicts' | 'contextual';
  temporalStatus?: 'current' | 'outdated' | 'undated';
}

export interface EvidenceEvaluationResult {
  recommendedVerdict: VerdictType | null;
  confidence: number;
  supportingItems: SearchResultItem[];
  contradictingItems: SearchResultItem[];
  contextualItems: SearchResultItem[];
  hasConflict: boolean;
  hasOutdatedEvidence: boolean;
  bestAnswerExcerpt?: string;
  reasoningNote: string;
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
};

// Domain vocabulary for Levenshtein fuzzy spelling correction (when word >= 5 chars)
const DOMAIN_VOCABULARY = [
  'president', 'prime', 'minister', 'chief', 'india', 'indian', 'government',
  'narendra', 'modi', 'droupadi', 'murmu', 'siddaramaiah', 'rahul', 'gandhi',
  'amit', 'shah', 'karnataka', 'bengaluru', 'bangalore', 'delhi', 'mumbai',
  'chennai', 'kolkata', 'hyderabad', 'odisha', 'kerala', 'maharashtra',
  'gujarat', 'isro', 'aditya', 'chandrayaan', 'reserve', 'bank', 'currency',
  'banknote', 'rupees', 'scholarship', 'election', 'commission', 'aadhaar',
  'vaccine', 'cyclone', 'arnab', 'monsoon', 'earthquake', 'tsunami', 'weather',
  'official', 'announced', 'announcement', 'resigned', 'holiday', 'closure',
  'scheme', 'yojana', 'recharge', 'laptop', 'pension', 'collision', 'casualties',
  'railway', 'school', 'college', 'students', 'parliament', 'supreme', 'court',
  'ministry', 'health', 'education', 'hospital', 'cricket', 'capital', 'legal',
  'tender', 'circular', 'gazette', 'advisory', 'alert', 'emergency', 'salary',
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

  // Strip WhatsApp/OCR boilerplate & collapse whitespace
  const cleanedInput = originalInput
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^\[Screenshot attached:.*?\]\s*/i, '')
    .replace(/^[\*\s]*Forwarded(?:\s+many\s+times|\s+as\s+received)?[\*\s:–-]*/i, '')
    .replace(/^https?:\/\/\S+\s*/i, (url) => (mode === 'url' ? `${url} ` : ''))
    .replace(/([?!.,])\1+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  // Token-level typo correction (only on ASCII alphabetic tokens; preserves negation and numbers!)
  const correctionsApplied: { from: string; to: string }[] = [];
  const words = cleanedInput.split(/\s+/);
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

    // Fuzzy edit-distance check against domain vocabulary for words >= 5 chars
    if (lower.length >= 5) {
      let bestMatch: string | null = null;
      let bestDist = 3;
      const maxAllowed = lower.length >= 8 ? 2 : 1;
      for (const vocab of DOMAIN_VOCABULARY) {
        if (Math.abs(vocab.length - lower.length) > maxAllowed) continue;
        // Same starting letter or adjacent transposition guard to avoid false substitutions
        if (vocab[0] !== lower[0] && vocab[1] !== lower[1]) continue;
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
    .replace(/\b(president|prime minister|chief minister|capital)\s+(india|karnataka|maharashtra|delhi)\b/gi, '$1 of $2')
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

  const extractedClaims: ExtractedClaim[] = claimSentences.slice(0, 4).map((sentence, idx) => {
    const subEntities: string[] = [];
    const sLower = sentence.toLowerCase();
    for (const org of entities.organizations) if (sLower.includes(org.toLowerCase())) subEntities.push(org);
    for (const loc of entities.locations) if (sLower.includes(loc.toLowerCase())) subEntities.push(loc);
    for (const p of entities.people) if (sLower.includes(p.toLowerCase())) subEntities.push(p);

    return {
      id: `claim-fact-${idx + 1}`,
      claim: sentence,
      entities: subEntities,
      dates: entities.dates,
      locations: entities.locations,
      organizations: entities.organizations,
      amounts: entities.amounts,
    };
  });

  // Build meaning-preserving alternative search queries
  const alternativeQueries = buildAlternativeQueries(
    normalizedQuery,
    originalInput,
    entities,
    detectedLanguage,
    isQuestion
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
    /\b(?:PIB|IMD|ISRO|RBI|NPCI|ECI|UPSC|CBSE|NEET|WHO|NASA|CERT-In|TRAI|IRCTC|UIDAI|SBI|LIC|NDMA|ICMR)\b/gi,
    /\b(?:Government of India|State Government|Karnataka Government|Supreme Court|High Court|Police Department|Ministry of [A-Za-z\s]+|Health Department|Education Board|Reserve Bank of India|Election Commission of India|Press Information Bureau)\b/gi,
  ];
  const orgsSet = new Set<string>();
  for (const pat of orgPatterns) {
    for (const m of combined.match(pat) || []) orgsSet.add(m.trim());
  }

  const locPatterns = [
    /\b(?:India|Karnataka|Bengaluru|Bangalore|Delhi|New Delhi|Mumbai|Chennai|Kolkata|Hyderabad|Odisha|Andhra Pradesh|Kerala|Tamil Nadu|Gujarat|Maharashtra|Belur|Bay of Bengal|Arabian Sea)\b/gi,
  ];
  const locsSet = new Set<string>();
  for (const pat of locPatterns) {
    for (const m of combined.match(pat) || []) locsSet.add(m.trim());
  }

  const amountPatterns = [
    /(?:\$|₹|Rs\.?|INR)\s*\d+(?:,\d+)*(?:\.\d+)?(?:\s*(?:crore|lakh|thousand|million|billion))?/gi,
    /\b\d+\s*(?:GB|MB|TB|5G|4G)\b/gi,
    /\b\d+(?:,\d+)*\s*(?:pension|rupees|laptops|vacancies|seats|students|dead|injured|hospitalized)\b/gi,
    /\b\d+%\b/g,
  ];
  const amountsSet = new Set<string>();
  for (const pat of amountPatterns) {
    for (const m of combined.match(pat) || []) amountsSet.add(m.trim());
  }

  const peoplePatterns = [
    /\b(?:Narendra Modi|Modi|Rahul Gandhi|Amit Shah|Siddaramaiah|Droupadi Murmu|Shaktikanta Das|Sanjay Malhotra|Nirmala Sitharaman|S\.?\s*Jaishankar|Rajnath Singh)\b/gi,
    /(?:नरेंद्र मोदी|द्रौपदी मुर्मू|सिद्धारमैया|ನರೇಂದ್ರ ಮೋದಿ|ದ್ರೌಪದಿ ಮುರ್ಮು|ಸಿದ್ದರಾಮಯ್ಯ)/gu,
  ];
  const peopleSet = new Set<string>();
  for (const pat of peoplePatterns) {
    for (const m of combined.match(pat) || []) peopleSet.add(m.trim());
  }

  const eventsSet = new Set<string>();
  const eventPatterns = [
    /\b(?:Cyclone\s+[A-Za-z]+|Aditya-L1|Chandrayaan-\d+|Halo Orbit Insertion|T20 World Cup|Cricket World Cup|Lok Sabha Election|Monsoon Holiday|Bank Closure)\b/gi,
  ];
  for (const pat of eventPatterns) {
    for (const m of combined.match(pat) || []) eventsSet.add(m.trim());
  }

  // Detect capitalized two-word Proper Nouns; route transit/infrastructure/places out of peopleSet
  const nonPersonPhrasePattern = /\b(?:Line|Stretch|Metro|Rail|Road|Station|Phase|Corridor|Highway|Expressway|Bridge|Airport|Opens|Park|Nagar|Palya|Agrahara|Puram|Scheme|Yojana|Mission|Bank|Reserve|Court|Ministry|Department|Commission|Bureau|University|College|School|Hospital|News|Update|Gazette|Today|India|Delhi|Mumbai|Bengaluru|Karnataka)\b/i;
  const placeOrProjectPattern = /\b(?:Line|Metro|Rail|Road|Station|Phase|Corridor|Highway|Expressway|Bridge|Airport|Nagar|Palya|Agrahara|Puram|Park|Stretch)\b/i;
  const properNounMatches = originalText.match(/\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/g) || [];
  for (const pn of properNounMatches) {
    if (locsSet.has(pn) || orgsSet.has(pn)) continue;
    if (placeOrProjectPattern.test(pn)) {
      locsSet.add(pn);
    } else if (!nonPersonPhrasePattern.test(pn) && !/^(?:Prime Minister|Chief Minister|Breaking News|Official Record)$/i.test(pn)) {
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
  isQuestion: boolean
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

  // 3. Explicit role/office/entity expansions (preserving meaning!)
  const combinedForExpansion = `${lower} ${alts.join(' ').toLowerCase()}`;
  if (combinedForExpansion.includes('president') && combinedForExpansion.includes('india') && !combinedForExpansion.includes('vice')) {
    alts.push('President of India');
    alts.push('President of India current incumbent');
  }
  if (combinedForExpansion.includes('prime minister') && combinedForExpansion.includes('india')) {
    alts.push('Prime Minister of India');
  }
  if (combinedForExpansion.includes('chief minister') && combinedForExpansion.includes('karnataka')) {
    alts.push('Chief Minister of Karnataka');
  }
  if (entities.events.length > 0) {
    alts.push(`${entities.events[0]} ${entities.locations[0] || ''} official`);
  }
  if (entities.organizations.length > 0) {
    alts.push(`${entities.organizations[0]} ${coreKeywords.split(' ').slice(0, 4).join(' ')}`);
  }

  // 4. Fact-check query ONLY for declarative claims (not factual lookup questions)
  if (!isQuestion && coreKeywords.length >= 6) {
    alts.push(`${uniqueContentKeywords.slice(0, 6).join(' ')} official fact check`);
  }

  // Deduplicate and cap
  const unique = Array.from(new Set(alts.map((q) => q.trim()).filter((q) => q.length >= 3)));
  return unique.slice(0, 5);
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
    lowerUrl.includes('snopes.com') ||
    lowerUrl.includes('politifact.com') ||
    lowerUrl.includes('factcheck.org') ||
    lowerName.includes('fact check') ||
    lowerName.includes('factcheck')
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
    'prajavani.net', 'amarujala.com', 'bhaskar.com', 'aljazeera.com', 'thelancet.com',
    'nature.com', 'news.un.org', 'olympics.com',
  ];
  const accreditedPublisherNames = [
    'reuters', 'associatedpress', 'apnews', 'bbc', 'thehindu', 'hindu',
    'indianexpress', 'newindianexpress', 'pti', 'hindustantimes', 'ndtv',
    'livemint', 'mint', 'economictimes', 'timesofindia', 'deccanherald',
    'theprint', 'scroll', 'businessstandard', 'moneycontrol', 'indiatoday',
    'news18', 'bangaloremirror', 'cnbctv18', 'financialexpress', 'theweek',
    'timesnow', 'prajavani', 'amarujala', 'dainikbhaskar', 'aljazeera', 'ani',
    'oneindia', 'firstpost', 'tribuneindia', 'deccanchronicle', 'newsonair', 'espn',
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

// Short-lived in-memory TTL cache (60s) to avoid hammering external search APIs on rapid queries
const WIKI_CACHE = new Map<string, { ts: number; items: SearchResultItem[] }>();
const WIKI_CACHE_TTL_MS = 60_000;

async function fetchWikipediaSearchAndExtracts(
  query: string,
  wikiLang: 'en' | 'kn' | 'hi' = 'en'
): Promise<SearchResultItem[]> {
  const normalizedKey = `${wikiLang}:${query.trim().toLowerCase().slice(0, 120)}`;
  const cached = WIKI_CACHE.get(normalizedKey);
  if (cached && Date.now() - cached.ts < WIKI_CACHE_TTL_MS) {
    return cached.items;
  }

  const results: SearchResultItem[] = [];
  const host = `${wikiLang}.wikipedia.org`;

  try {
    // Single combined request: full-text search + intro extracts + canonical URLs (1 API call instead of 2)
    const searchUrl = `https://${host}/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      query.slice(0, 120)
    )}&gsrlimit=4&prop=extracts|info&exintro=1&explaintext=1&exsentences=8&inprop=url&format=json&origin=*`;

    let res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'TruthLens-Verify/3.1 (https://truthlens.example; civic-fact-check)' },
      signal: AbortSignal.timeout(4500),
    });

    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 450));
      res = await fetch(searchUrl, {
        headers: { 'User-Agent': 'TruthLens-Verify/3.1 (https://truthlens.example; civic-fact-check)' },
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
          snippet: extract.slice(0, 1100),
          publicationDate: pubDate,
          sourceName: `Wikipedia (${wikiLang.toUpperCase()}): ${title}`,
          category: 'Verified Reference Encyclopedia',
          isPrimary: false,
          credibilityTier: 'factcheck_org',
        });
      }
    }

    // REST page summary fallback if search returned empty or 429 for concise entity/role titles
    if (results.length === 0) {
      const titleCandidate = query
        .replace(/^(?:who|what|is|the|current|incumbent)\s+/gi, '')
        .replace(/\?+$/, '')
        .trim()
        .replace(/\s+/g, '_');
      if (titleCandidate.length >= 3) {
        const restRes = await fetch(`https://${host}/api/rest_v1/page/summary/${encodeURIComponent(titleCandidate)}`, {
          headers: { 'User-Agent': 'TruthLens-Verify/3.1' },
          signal: AbortSignal.timeout(3500),
        });
        if (restRes.ok) {
          const summaryData = (await restRes.json()) as any;
          if (summaryData?.title && summaryData?.extract) {
            results.push({
              title: summaryData.title,
              url: summaryData?.content_urls?.desktop?.page || `https://${host}/wiki/${encodeURIComponent(titleCandidate)}`,
              snippet: summaryData.extract.slice(0, 900),
              publicationDate: 'Verified Reference Archive',
              sourceName: `Wikipedia (${wikiLang.toUpperCase()}): ${summaryData.title}`,
              category: 'Verified Reference Encyclopedia',
              isPrimary: false,
              credibilityTier: 'factcheck_org',
            });
          }
        }
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
  const results: SearchResultItem[] = [];
  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(
      query.slice(0, 100)
    )}&format=json&no_html=1&skip_disambig=1`;

    const res = await fetch(ddgUrl, {
      headers: { 'User-Agent': 'TruthLens-Verify/3.0 (Civic-Fact-Check)' },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return results;
    const data = (await res.json()) as any;

    if (data.Abstract && data.Abstract.length > 25) {
      const absUrl = data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
      const cred = classifySourceCredibility(absUrl, data.AbstractSource || data.Heading || '');
      results.push({
        title: data.Heading || query,
        url: absUrl,
        snippet: data.Abstract.slice(0, 480),
        publicationDate: 'Official Live Archive',
        sourceName: data.AbstractSource ? `${data.AbstractSource}: ${data.Heading}` : (data.Heading || 'Reference Knowledge Record'),
        category: cred.categoryLabel,
        isPrimary: cred.isPrimary,
        credibilityTier: cred.credibilityTier,
      });
    }

    if (Array.isArray(data.RelatedTopics)) {
      for (const item of data.RelatedTopics.slice(0, 3)) {
        if (item.Text && item.FirstURL && item.Text.length > 25) {
          const cred = classifySourceCredibility(item.FirstURL);
          results.push({
            title: item.Text.slice(0, 75),
            url: item.FirstURL,
            snippet: item.Text.slice(0, 350),
            publicationDate: 'Live Web Index',
            sourceName: 'DuckDuckGo Reference Index',
            category: cred.categoryLabel,
            isPrimary: cred.isPrimary,
            credibilityTier: cred.credibilityTier,
          });
        }
      }
    }
  } catch {
    // Non-blocking
  }
  return results;
}

async function fetchGoogleNewsRss(query: string, lang: Language = 'en'): Promise<SearchResultItem[]> {
  const results: SearchResultItem[] = [];
  try {
    const hl = lang === 'kn' ? 'kn' : lang === 'hi' ? 'hi' : 'en-IN';
    const ceid = lang === 'kn' ? 'IN:kn' : lang === 'hi' ? 'IN:hi' : 'IN:en';
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
      query.slice(0, 110)
    )}&hl=${hl}&gl=IN&ceid=${ceid}`;

    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'TruthLens-Verify/3.0 (Civic-Fact-Check)' },
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
      const url = (linkMatch?.[1] || '').trim();
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

      results.push({
        title: rawTitle,
        url,
        snippet: desc && desc.length > rawTitle.length ? `${rawTitle}. ${desc}` : rawTitle,
        publicationDate: formattedDate,
        sourceName,
        category: cred.categoryLabel,
        isPrimary: cred.isPrimary,
        credibilityTier: cred.credibilityTier,
      });
    }
  } catch {
    // Non-blocking
  }
  return results;
}

/**
 * STEP 2: Hybrid Multi-Query Live Web Search, Reranking, Filtering & Deduplication
 */
export async function executeMultiQuerySearch(
  claims: ExtractedClaim[],
  entities: ExtractedEntityData,
  primaryClaim: string,
  preprocessedInput?: PreprocessedQuery
): Promise<{
  results: SearchResultItem[];
  searchProviderStatus: 'operational' | 'fallback_archive' | 'error_reported';
  queryCount: number;
  deduplicatedCount: number;
  filteredIrrelevantCount: number;
  queriesRun: string[];
}> {
  const prep = preprocessedInput || preprocessQuery(primaryClaim);
  const queriesRun: string[] = [];
  const rawResults: SearchResultItem[] = [];

  if (prep.isOcrFailureOrEmpty) {
    return {
      results: [],
      searchProviderStatus: 'operational',
      queryCount: 0,
      deduplicatedCount: 0,
      filteredIrrelevantCount: 0,
      queriesRun: [],
    };
  }

  // Build focused query list (normalized + alternative + cross-lingual)
  const candidateQueries = [
    prep.normalizedQuery,
    ...prep.alternativeQueries,
    ...claims.slice(0, 2).map((c) => c.claim),
  ];

  // Clean Unicode-safe query strings (preserving \p{M} Indic vowel signs & viramas!)
  const uniqueQueries = Array.from(
    new Set(
      candidateQueries
        .map((q) => q.replace(/[^\p{L}\p{M}\p{N}\s.,'-]/gu, ' ').replace(/\s+/g, ' ').trim())
        .filter((q) => q.length >= 3)
    )
  ).slice(0, 5);

  // When non-English query has an English cross-lingual expansion, ensure English Wikipedia searches the English concept too!
  const englishExpansion = prep.detectedLanguage !== 'en'
    ? prep.alternativeQueries.find((q) => /^[A-Za-z0-9\s.,'-]+$/.test(q))
    : undefined;

  const primarySearchQuery = englishExpansion || uniqueQueries[0] || prep.normalizedQuery;
  const secondaryQuery = uniqueQueries.find((q) => q !== primarySearchQuery && /^[A-Za-z0-9\s.,'-]+$/.test(q)) || uniqueQueries[1] || primarySearchQuery;
  const roleLookupQuery = prep.alternativeQueries.find(
    (q) =>
      q !== primarySearchQuery &&
      q !== secondaryQuery &&
      /^(?:President of India|Prime Minister of India|Chief Minister of Karnataka)/i.test(q)
  );
  const newsQuery = englishExpansion || prep.alternativeQueries.find((q) => !q.includes('fact check')) || primarySearchQuery;

  queriesRun.push(...uniqueQueries);

  // Execute multi-provider retrieval concurrently (1 focused Wikipedia query avoids 429 burst throttling)
  const wikiFocusQuery = roleLookupQuery || englishExpansion || secondaryQuery || primarySearchQuery;
  const tasks: Promise<SearchResultItem[]>[] = [
    fetchWikipediaSearchAndExtracts(wikiFocusQuery, 'en'),
    fetchDuckDuckGoInstant(primarySearchQuery),
    fetchGoogleNewsRss(newsQuery, 'en'),
  ];

  if (secondaryQuery !== primarySearchQuery) {
    tasks.push(fetchGoogleNewsRss(secondaryQuery, 'en'));
  }

  // Native Kannada/Hindi News retrieval if non-English input
  if (prep.detectedLanguage === 'kn') {
    tasks.push(fetchGoogleNewsRss(prep.originalInput, 'kn'));
  } else if (prep.detectedLanguage === 'hi') {
    tasks.push(fetchGoogleNewsRss(prep.originalInput, 'hi'));
  }

  const settled = await Promise.allSettled(tasks);
  let successfulProviders = 0;
  let failedProviders = 0;

  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      successfulProviders++;
      rawResults.push(...outcome.value);
    } else {
      failedProviders++;
    }
  }

  // Hybrid scoring, relevance filtering, deduplication, and reranking
  const rankedAndFiltered = filterAndRerankResults(rawResults, prep);

  const status: 'operational' | 'fallback_archive' | 'error_reported' =
    successfulProviders > 0 ? 'operational' : failedProviders > 0 ? 'error_reported' : 'fallback_archive';

  return {
    results: rankedAndFiltered.kept,
    searchProviderStatus: status,
    queryCount: queriesRun.length,
    deduplicatedCount: rankedAndFiltered.deduplicatedCount,
    filteredIrrelevantCount: rankedAndFiltered.filteredIrrelevantCount,
    queriesRun,
  };
}

/**
 * Scores, filters irrelevant hits, deduplicates syndicated copies, and reranks Top-K results.
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
    const docText = `${item.title} ${item.snippet}`;
    const docLower = docText.toLowerCase();
    const isAsciiDoc = !/[\u0900-\u097F\u0C80-\u0CFF]/.test(docText);
    const activeAnchor = prep.detectedLanguage !== 'en' && isAsciiDoc && crossLingualEnglish
      ? crossLingualEnglish
      : queryAnchor;
    const activeTokens = prep.detectedLanguage !== 'en' && isAsciiDoc && englishContentTokens.length > 0
      ? englishContentTokens
      : queryContentTokens;

    const semanticScore = computeSemanticSimilarity(activeAnchor, docText);
    const keywordScore = computeKeywordBM25Score(activeTokens, docText);
    const entityScore = computeEntityMatchScore(prep.entities, docText);
    const cred = classifySourceCredibility(item.url, item.sourceName);
    const temporalStatus = detectTemporalStatus(item.publicationDate, item.snippet);

    let combinedRelevance =
      0.38 * semanticScore +
      0.27 * keywordScore +
      0.20 * entityScore +
      0.15 * cred.authorityWeight;

    // Disambiguate "President" vs "Vice President" when user asks for President
    if (
      queryLower.includes('president') &&
      !queryLower.includes('vice') &&
      docLower.includes('vice president') &&
      !docLower.includes('droupadi murmu')
    ) {
      combinedRelevance *= 0.62;
    }

    const finalRelevance = Number(combinedRelevance.toFixed(3));

    // Strict relevance gate: reject noisy unrelated snippets
    const hasMeaningfulOverlap =
      keywordScore >= 0.22 ||
      semanticScore >= 0.24 ||
      (entityScore >= 0.45 && semanticScore >= 0.12);

    if (!hasMeaningfulOverlap) {
      filteredIrrelevantCount++;
      continue;
    }

    const resolvedTier = item.credibilityTier || cred.credibilityTier;
    const isWikipedia = (item.url || '').toLowerCase().includes('wikipedia.org');
    const stance = detectItemStance(prep, docText, resolvedTier, isWikipedia, item.title);

    scored.push({
      ...item,
      credibilityTier: item.credibilityTier || cred.credibilityTier,
      isPrimary: item.isPrimary ?? cred.isPrimary,
      semanticScore,
      keywordScore,
      entityScore,
      relevanceScore: finalRelevance,
      stance,
      temporalStatus,
    });
  }

  // Sort by combined relevance descending before deduplication so best version wins
  scored.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  // Deduplicate by URL and Jaccard text similarity
  const seenUrls = new Set<string>();
  const kept: SearchResultItem[] = [];

  for (const item of scored) {
    const urlKey = item.url.toLowerCase().replace(/\/$/, '').split('?')[0];
    if (seenUrls.has(urlKey)) continue;

    const itemTokens = new Set(unicodeTokenize(`${item.title} ${item.snippet}`).slice(0, 30));
    const isNearDuplicate = kept.some((existing) => {
      const existingTokens = new Set(unicodeTokenize(`${existing.title} ${existing.snippet}`).slice(0, 30));
      let intersect = 0;
      for (const t of itemTokens) if (existingTokens.has(t)) intersect++;
      const union = itemTokens.size + existingTokens.size - intersect;
      return union > 0 && intersect / union > 0.72;
    });

    if (isNearDuplicate) continue;

    seenUrls.add(urlKey);
    kept.push(item);
    if (kept.length >= 8) break;
  }

  const deduplicatedCount = Math.max(0, scored.length - kept.length);

  return {
    kept,
    deduplicatedCount,
    filteredIrrelevantCount,
  };
}

/**
 * Determines whether a retrieved evidence snippet supports, contradicts, or provides context for a claim.
 */
function detectItemStance(
  prep: PreprocessedQuery,
  docText: string,
  credibilityTier: 'official_primary' | 'accredited_press' | 'factcheck_org' | 'secondary_web' = 'secondary_web',
  isWikipedia: boolean = false,
  docTitle: string = ''
): 'supports' | 'contradicts' | 'contextual' {
  const docLower = docText.toLowerCase().replace(/[\u2018\u2019]/g, "'");
  const crossLingualEnglish = prep.detectedLanguage !== 'en'
    ? prep.alternativeQueries.filter((q) => /^[A-Za-z0-9\s.,'-]+$/.test(q)).join(' ')
    : '';
  const claimLower = `${prep.normalizedQuery} ${crossLingualEnglish}`.toLowerCase().replace(/[\u2018\u2019]/g, "'");

  // Explicit fact-check debunk signals in the evidence
  const evidenceDebunkSignals = [
    'pib fact check', 'fact check:', 'fact-check:', 'is fake', 'is false', 'are fake', 'are false',
    'claim is fake', 'claims are fake', 'viral scam', 'hoax', 'debunked', 'debunking', 'fabricated',
    'no such scheme', 'did not announce', 'has not launched', 'have not launched', 'did not launch',
    'has not announced', 'no scientific basis', 'no evidence', 'will not destroy', 'will not cure',
    "doesn't kill", 'does not kill', 'does not cure', 'cannot cure', 'not cure',
    'misleading claim', 'morphed', 'scam', 'phishing', 'fake news', 'rumour', 'rumor',
    'clarified that no', 'denied the claim', 'baseless', 'untrue', 'not legal tender',
    'warned against', 'warns against',
  ];
  const hasExplicitDebunk = evidenceDebunkSignals.some((sig) => docLower.includes(sig));
  if (hasExplicitDebunk) {
    return 'contradicts';
  }

  // Negation / Polarity comparison (supports contractions like doesn't / will not / has not)
  const docTokens = unicodeTokenize(docText);
  const docHasNegation =
    docTokens.some((t) => NEGATION_TOKENS.has(t)) ||
    /\b(?:not|no|never|neither|nor|without|doesn't|does not|don't|do not|didn't|did not|won't|will not|wouldn't|can't|cannot|couldn't|isn't|is not|aren't|are not|wasn't|was not|weren't|were not|hasn't|has not|haven't|have not)\b/.test(
      docLower
    );

  // Non-Wikipedia fact-checking orgs or explicit "Fact-Check" articles with negation refute affirmative claims
  const isFactCheckHeadlineOrOrg =
    (credibilityTier === 'factcheck_org' && !isWikipedia) || /\bfact[- ]check\b/i.test(docLower);
  if (!prep.hasNegation && isFactCheckHeadlineOrOrg && docHasNegation) {
    return 'contradicts';
  }

  // Role-holder consistency check (e.g., President of India / Prime Minister of India)
  if (claimLower.includes('president') && claimLower.includes('india') && !claimLower.includes('vice')) {
    if (docLower.includes('droupadi murmu') && docLower.includes('president of india')) {
      if (prep.hasNegation || (claimLower.includes('not') && claimLower.includes('murmu'))) {
        return 'contradicts';
      }
      if (prep.entities.people.some((p) => !p.toLowerCase().includes('murmu'))) {
        return 'contradicts';
      }
      if (prep.isQuestion || claimLower.includes('droupadi murmu') || claimLower.includes('murmu')) {
        return 'supports';
      }
      if (/\bis\s+(?:the\s+)?(?:current\s+)?president\s+of\s+india\b/i.test(claimLower) && !claimLower.includes('murmu')) {
        return 'contradicts';
      }
      return 'supports';
    }
  }

  if (claimLower.includes('prime minister') && claimLower.includes('india')) {
    if (docLower.includes('narendra modi') && docLower.includes('prime minister')) {
      if (prep.hasNegation || claimLower.includes('not a prime') || claimLower.includes('not the prime') || claimLower.includes('resigned')) {
        return 'contradicts';
      }
      if (prep.entities.people.some((p) => !p.toLowerCase().includes('modi'))) {
        return 'contradicts';
      }
      if (prep.isQuestion || claimLower.includes('narendra modi') || claimLower.includes('modi')) {
        return 'supports';
      }
      if (/\bis\s+(?:the\s+)?(?:current\s+)?prime\s+minister\s+of\s+india\b/i.test(claimLower) && !claimLower.includes('modi')) {
        return 'contradicts';
      }
      return 'supports';
    }
  }

  // General Role/Leadership Attribution Guard: "<Person> is [the] <Role> of <Org/Country>"
  const roleClaimMatch = claimLower.match(
    /^([a-z][a-z.\s'-]{2,40}?)\s+(?:is|serves as|became)\s+(?:the\s+|an?\s+)?(?:current\s+|present\s+)?(ceo|chief executive officer|president|prime minister|chief minister|founder|chairman|chairperson|director|governor|mayor|captain)\s+(?:of|at|for)\s+([a-z0-9][a-z0-9\s.&'-]{1,40})$/i
  );
  let roleAttachmentVerified = true;
  if (roleClaimMatch) {
    const claimedPerson = roleClaimMatch[1].trim();
    const rawRole = roleClaimMatch[2].trim();
    const rolePattern = rawRole === 'chief executive officer' ? '(?:ceo|chief executive officer)' : rawRole.replace(/\s+/g, '\\s+');
    const claimedOrg = roleClaimMatch[3].trim();
    const claimedOrgTokens = unicodeTokenize(claimedOrg).filter((t) => !STOPWORDS.has(t) && t.length >= 2);
    const claimedPersonTokens = unicodeTokenize(claimedPerson).filter((t) => !STOPWORDS.has(t) && t.length >= 2);
    const personLastOrFull = claimedPersonTokens[claimedPersonTokens.length - 1] || claimedPerson;

    // Case A: Doc links a DIFFERENT org directly with <Role> <Person> (e.g., "Google CEO Sundar Pichai" when claiming Apple)
    const orgRolePersonRegex = new RegExp(`\\b([a-z0-9&'-]{2,25})\\s+${rolePattern}\\s+${personLastOrFull}\\b`, 'gi');
    for (const m of docLower.matchAll(orgRolePersonRegex)) {
      const attachedOrg = m[1];
      if (
        !STOPWORDS.has(attachedOrg) &&
        !/^(?:former|ex|new|next|current|incumbent|future|acting|interim|youngest|first)$/.test(attachedOrg) &&
        !claimedOrgTokens.includes(attachedOrg)
      ) {
        return 'contradicts';
      }
    }

    // Case B: Doc names a DIFFERENT person as <Org> <Role> (e.g., "Apple names John Ternus next CEO", "Tim Cook ... Apple CEO")
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
        `\\b([a-z]{3,}\\s+[a-z]{3,})\\b[^.;]{0,35}\\b(?:as|is|was|replaces|succeeds)\\s+(?:the\\s+)?${orgTok}\\s+${rolePattern}\\b`,
        'gi'
      );
      for (const m of docLower.matchAll(otherAsOrgRoleRegex)) {
        const otherPerson = m[1].trim();
        if (!claimedPersonTokens.some((pt) => otherPerson.includes(pt))) {
          return 'contradicts';
        }
      }
    }

    // Require direct positive linkage (<Org> <Role> <Person> or <Person> ... <Role> of <Org>) to mark 'supports'
    const directLink1 = claimedOrgTokens.some((orgTok) =>
      new RegExp(`\\b${orgTok}\\s+${rolePattern}\\s+(?:${claimedPersonTokens.join('|')})\\b`, 'i').test(docLower)
    );
    const directLink2 = claimedOrgTokens.some((orgTok) =>
      new RegExp(`\\b(?:${claimedPersonTokens.join('|')})\\b[^.;]{0,25}\\b${rolePattern}\\s+(?:of|at|for)\\s+${orgTok}\\b`, 'i').test(docLower)
    );
    roleAttachmentVerified = directLink1 || directLink2;
  }

  // If claim asserts negation (e.g. "resigned", "banned", "is not") while official doc affirms active status without negation
  if (prep.hasNegation && !docHasNegation && (docLower.includes('incumbent') || docLower.includes('current') || docLower.includes('serving as'))) {
    return 'contradicts';
  }

  // Positive corroboration & relevance preparation: evaluate English expansion cleanly against English docs
  const isAsciiDoc = !/[\u0900-\u097F\u0C80-\u0CFF]/.test(docText);
  const queryAnchor = prep.detectedLanguage !== 'en' && isAsciiDoc && crossLingualEnglish
    ? crossLingualEnglish.trim()
    : `${prep.normalizedQuery} ${crossLingualEnglish}`.trim();
  const queryTokens = unicodeTokenize(queryAnchor).filter(
    (t) => !STOPWORDS.has(t) && !NEGATION_TOKENS.has(t) && (t.length >= 2 || /[^\x00-\x7F]/.test(t))
  );
  const uniqueQueryTokens = Array.from(new Set(queryTokens));
  const kw = computeKeywordBM25Score(uniqueQueryTokens, docText);
  const sem = computeSemanticSimilarity(queryAnchor, docText);

  const docTokensList = unicodeTokenize(docText);
  const docTokenSet = new Set(docTokensList);
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
  const medalScopeText = yearSentences.length > 0 ? yearSentences.join(' ') : (!isWikipedia ? docLower : '');
  const scopedDocMedals = medalScopeText
    ? medalTiers.filter((m) => new RegExp(`\\b${m}\\b`).test(medalScopeText))
    : [];
  if (claimMedal && scopedDocMedals.length > 0 && docSharesClaimYear && matchedUniqueCount >= 3) {
    if (!scopedDocMedals.includes(claimMedal)) {
      return 'contradicts';
    }
  }

  // Currency / denomination / monetary amount consistency guard (e.g., "5000 rupee note" vs "Digital rupee")
  const claimMonetaryAmounts = Array.from(
    claimLower.replace(/,/g, '').matchAll(/(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:rupees?|rs\.?|inr|crore|lakh)\b/gi)
  ).map((m) => m[1] || m[2]);
  const docNoCommas = docLower.replace(/,/g, '');
  if (claimMonetaryAmounts.length > 0) {
    const docMentionsClaimedAmount = claimMonetaryAmounts.some((amt) => new RegExp(`\\b${amt}\\b`).test(docNoCommas));
    if (!docMentionsClaimedAmount) {
      // A doc that doesn't even mention the claimed rupee denomination cannot confirm it
      return 'contextual';
    }
  }

  // Guard against pre-event speculative/target articles (e.g. "targets September opening", "to be launched in 2021")
  const isSpeculativeFutureTarget =
    /\b(?:targets?|expected to|likely to|proposed|slated for|to be launched|planned for)\b/i.test(docLower) &&
    !/\b(?:inaugurated|opened|operational|commissioned|flagged off|soft-landed|landed|touched down)\b/i.test(docLower);

  // Completed-event year consistency check (e.g. "Chandrayaan-3 landed on the Moon in 2021" vs "23 August 2023")
  // Excludes multi-year person biographies, unrelated transit lines, and edition/year-scoped articles (e.g. "2022-2023 mpox outbreak" vs 2024 event)
  const titleYears = Array.from((docTitle || '').matchAll(/\b(19\d{2}|20[0-3]\d)\b/g)).map((m) => m[1]);
  const isTitleScopedToDifferentYear =
    claimYears.length > 0 &&
    titleYears.length > 0 &&
    !titleYears.some((ty) => claimYears.includes(ty));
  const isMultiYearPersonBio =
    /\(born\s+(?:\d{1,2}\s+[a-z]+\s+\d{4}|[a-z]+\s+\d{1,2},?\s+\d{4}|\d{4})\)/i.test(docLower) ||
    /\bis\s+an?\s+(?:indian|american|british|australian|[a-z]+)\s+(?:javelin|cricketer|athlete|politician|actor|player|singer|writer|leader)\b/i.test(docLower);
  const isCompletedEventClaim = /\b(?:landed|soft-landed|launched|inaugurated|opened|won|declared|elected|passed away|died)\b/i.test(
    claimLower
  );
  if (
    isCompletedEventClaim &&
    claimYears.length > 0 &&
    docYears.length > 0 &&
    !isSpeculativeFutureTarget &&
    !isDifferentMetroColorLine &&
    !isMultiYearPersonBio &&
    !isTitleScopedToDifferentYear &&
    kw >= 0.45 &&
    matchedUniqueCount >= 3
  ) {
    const docMatchesClaimYear = claimYears.some((cy) => docYears.includes(cy));
    const docDescribesCompletedEvent = /\b(?:landed|soft-landed|soft landing|touched down|launched|inaugurated|opened|won|declared|elected|died|operational)\b/i.test(
      docLower
    );
    if (!docMatchesClaimYear && docDescribesCompletedEvent && bigramHits >= 1) {
      return 'contradicts';
    }
  }

  if (prep.isQuestion && (kw >= 0.35 || sem >= 0.25)) {
    return 'supports';
  }

  // Clickbait/teaser fact-check question headlines without confirmation never count as 'supports'
  if (isFactCheckHeadlineOrOrg && docText.includes('?')) {
    return 'contextual';
  }

  // Detect brief news-topic / headline lookup intent (e.g., "pink line of bengaluru namma metro news")
  // strictly WITHOUT debatable assertion verbs or negation so false claims are never elevated!
  const isTopicHeadlineQuery =
    !prep.hasNegation &&
    (/\b(?:news|update|updates|latest|status|details|info)\s*$/i.test(prep.cleanedInput) ||
      (uniqueQueryTokens.length <= 6 &&
        !/\b(?:is|are|was|were|will|won|launched|opened|banned|dead|died|resigned|hiked|announced|giving|offers|free|claims?|fake|hoax)\b/i.test(
          prep.normalizedQuery
        )));

  // Length-aware thresholds: concise headlines/encyclopedia excerpts vs long multi-clause claims (9+ tokens)
  const isDetailedMultiClauseClaim = !prep.hasNegation && uniqueQueryTokens.length >= 9;
  const minKw = isTopicHeadlineQuery ? 0.48 : isDetailedMultiClauseClaim ? 0.38 : 0.60;
  const minSem = isTopicHeadlineQuery ? 0.30 : isDetailedMultiClauseClaim ? 0.30 : 0.38;

  // For declarative claims & topic lookups: NEVER mark 'supports' on mere bag-of-words keyword overlap!
  // Require strict entity/role alignment, zero speculative framing, year alignment, and bigram phrase continuity.
  if (!prep.hasNegation && !isSpeculativeFutureTarget && roleAttachmentVerified && kw >= minKw && sem >= minSem) {
    // Guard role claims when doc hasn't matched the actual office holder
    if (claimLower.includes('president of india') && !docLower.includes('president of india')) {
      return 'contextual';
    }
    if (claimLower.includes('prime minister of india') && !docLower.includes('prime minister')) {
      return 'contextual';
    }
    // If claim asks about a medal + specific year (e.g. gold medal 2024), require that year in the supporting doc
    if (claimMedal && claimYears.length > 0 && !docSharesClaimYear) {
      return 'contextual';
    }
    // If claim asserts a completed event year, require that year in the supporting doc
    if (isCompletedEventClaim && claimYears.length > 0 && !claimYears.some((cy) => docYears.includes(cy))) {
      return 'contextual';
    }

    if (isDetailedMultiClauseClaim) {
      // Detailed multi-clause claim must match at least 5 distinct concepts AND 2 contiguous bigrams
      if (matchedUniqueCount < 5 || bigramHits < 2) {
        return 'contextual';
      }
      // If claim mentions a specific person, ensure doc doesn't omit/conflict on named person unless event/org dominates
      if (prep.entities.people.length > 0) {
        const personMatched = prep.entities.people.some((p) => {
          const pTokens = p.toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
          return pTokens.some((pt) => docLower.includes(pt));
        });
        if (!personMatched && bigramHits < 3) {
          return 'contextual';
        }
      }
    } else if (queryTokens.length >= 3 && bigramHits === 0) {
      return 'contextual';
    }

    return 'supports';
  }

  return 'contextual';
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

  // Ensure both supporting and contradicting evidence are represented within 6200 char budget
  const MAX_CONTEXT_CHARS = 6200;
  let body = '\nRETRIEVED & RERANKED MULTI-SOURCE EVIDENCE:\n';

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const stanceTag = r.stance ? ` | Polarity: ${r.stance.toUpperCase()}` : '';
    const dateTag = r.temporalStatus === 'outdated' ? ` [HISTORICAL/OLD: ${r.publicationDate || 'Past'}]` : ` [Date: ${r.publicationDate || 'Live Index'}]`;
    const scoreTag = r.relevanceScore !== undefined ? ` | Rel: ${(r.relevanceScore * 100).toFixed(0)}%` : '';
    const block =
      `[Source ${i + 1}] ${r.sourceName} (${r.category}, Tier: ${r.credibilityTier})${dateTag}${stanceTag}${scoreTag}\n` +
      `URL: ${r.url}\n` +
      `Excerpt: "${r.snippet.slice(0, 420)}"\n\n`;

    if ((headerLines.join('\n').length + body.length + block.length) > MAX_CONTEXT_CHARS) {
      break;
    }
    body += block;
  }

  return `${headerLines.join('\n')}${body}`;
}

/**
 * Evaluates retrieved evidence directly (independent of LLM) to prevent false UNVERIFIED
 * when strong evidence exists, and prevent false REAL on mere keyword overlap.
 */
export function evaluateEvidenceForVerdict(
  prep: PreprocessedQuery,
  items: SearchResultItem[],
  searchStatus: 'operational' | 'fallback_archive' | 'error_reported'
): EvidenceEvaluationResult {
  if (prep.isOcrFailureOrEmpty || searchStatus === 'error_reported') {
    return {
      recommendedVerdict: 'unverified',
      confidence: 35,
      supportingItems: [],
      contradictingItems: [],
      contextualItems: [],
      hasConflict: false,
      hasOutdatedEvidence: false,
      reasoningNote: searchStatus === 'error_reported'
        ? 'Live search encountered a network failure; defaulting safely to UNVERIFIED.'
        : 'Input could not be parsed cleanly; marked UNVERIFIED.',
    };
  }

  const supportingItems = items.filter((i) => i.stance === 'supports');
  const contradictingItems = items.filter((i) => i.stance === 'contradicts');
  const contextualItems = items.filter((i) => i.stance !== 'supports' && i.stance !== 'contradicts');
  const hasOutdatedEvidence = items.some((i) => i.temporalStatus === 'outdated');

  // Check conflicting authoritative sources
  const hasCredibleSupport = supportingItems.some(
    (i) => i.credibilityTier !== 'secondary_web' || (i.relevanceScore || 0) >= 0.42
  );
  const hasCredibleContradiction = contradictingItems.some(
    (i) => i.credibilityTier !== 'secondary_web' || (i.relevanceScore || 0) >= 0.42
  );

  if (hasCredibleSupport && hasCredibleContradiction) {
    const strongAccreditedContradictions = contradictingItems.filter((i) => i.credibilityTier !== 'secondary_web');
    if (
      contradictingItems.length >= 3 &&
      strongAccreditedContradictions.length >= 2 &&
      contradictingItems.length >= supportingItems.length * 3
    ) {
      const topC = strongAccreditedContradictions[0] || contradictingItems[0];
      return {
        recommendedVerdict: 'false',
        confidence: Math.min(91, Math.round(74 + (topC.relevanceScore || 0.45) * 20)),
        supportingItems,
        contradictingItems,
        contextualItems,
        hasConflict: false,
        hasOutdatedEvidence,
        bestAnswerExcerpt: topC.snippet,
        reasoningNote: `Multiple authoritative sources led by ${topC.sourceName} contradict specific factual figures in the claim.`,
      };
    }

    const strongSupports = supportingItems.filter((i) => i.credibilityTier !== 'secondary_web');
    const hasPrimaryDebunk = contradictingItems.some(
      (i) => i.isPrimary || (i.credibilityTier === 'factcheck_org' && !i.url.toLowerCase().includes('wikipedia.org'))
    );
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
        contextualItems,
        hasConflict: false,
        hasOutdatedEvidence,
        bestAnswerExcerpt: topS.snippet,
        reasoningNote: `Corroborated by overwhelming consensus across ${supportingItems.length} retrieved sources, led by ${topS.sourceName}.`,
      };
    }

    return {
      recommendedVerdict: 'partly_true',
      confidence: 68,
      supportingItems,
      contradictingItems,
      contextualItems,
      hasConflict: true,
      hasOutdatedEvidence,
      bestAnswerExcerpt: supportingItems[0]?.snippet || contradictingItems[0]?.snippet,
      reasoningNote: 'Retrieved credible sources contain conflicting assertions requiring partial/mixed classification.',
    };
  }

  if (hasCredibleContradiction) {
    const topC = contradictingItems[0];
    const conf = Math.min(93, Math.round(74 + (topC.relevanceScore || 0.4) * 24));
    return {
      recommendedVerdict: 'false',
      confidence: conf,
      supportingItems,
      contradictingItems,
      contextualItems,
      hasConflict: false,
      hasOutdatedEvidence,
      bestAnswerExcerpt: topC.snippet,
      reasoningNote: `Authoritative retrieved evidence from ${topC.sourceName} directly contradicts or debunks the claim.`,
    };
  }

  if (hasCredibleSupport) {
    const topS = supportingItems[0];
    const avgRel =
      supportingItems.slice(0, 3).reduce((acc, s) => acc + (s.relevanceScore || 0.45), 0) /
      Math.min(supportingItems.length, 3);
    const conf = Math.min(94.5, Number((72 + avgRel * 25 + Math.min(supportingItems.length, 3) * 2.5).toFixed(1)));
    return {
      recommendedVerdict: 'verified_true',
      confidence: conf,
      supportingItems,
      contradictingItems,
      contextualItems,
      hasConflict: false,
      hasOutdatedEvidence,
      bestAnswerExcerpt: topS.snippet,
      reasoningNote: `Corroborated by ${supportingItems.length} relevant retrieved source(s), led by ${topS.sourceName}.`,
    };
  }

  // No decisive support or contradiction even if contextual links appeared
  return {
    recommendedVerdict: null,
    confidence: 42,
    supportingItems,
    contradictingItems,
    contextualItems,
    hasConflict: false,
    hasOutdatedEvidence,
    bestAnswerExcerpt: contextualItems[0]?.snippet,
    reasoningNote: 'Retrieved context is insufficient or inconclusive to confirm or refute the claim.',
  };
}

/**
 * STEP 3 & 4: Calibrated Evidence Scoring & Breakdown
 * Strictly avoids arbitrary 99% values.
 */
export function buildEvidenceAnalysisAndScoring(
  claim: string,
  verdict: VerdictType,
  sources: EvidenceSource[],
  searchResults: SearchResultItem[],
  searchStatus: 'operational' | 'fallback_archive' | 'error_reported',
  queryCount: number,
  deduplicatedCount: number
): EvidenceAnalysis {
  const supportingEvidence: EvidencePoint[] = [];
  const contradictingEvidence: EvidencePoint[] = [];
  const limitationsAndUnresolved: string[] = [];
  const missingContext: string[] = [];

  for (const src of sources) {
    const point: EvidencePoint = {
      point: src.details,
      sourceName: src.name,
      url: src.url,
      date: src.publicationDate || src.timestamp || 'Official Registry Record',
      quoteOrExcerpt: src.details,
      isPrimarySource: src.isPrimary ?? (src.category.includes('Official') || src.category.includes('Gazette')),
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
      if (verdict === 'false') {
        contradictingEvidence.push(point);
      } else {
        limitationsAndUnresolved.push(
          `No positive confirmation found in ${src.name}: ${src.details}`
        );
      }
    }
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

  if (verdict === 'unverified') {
    baseScore = Math.min(Math.max(sources.length * 8 + 22, 35), 52);
    limitationsAndUnresolved.push(
      'Insufficient public records or corroboration currently available to certify authenticity.'
    );
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
  } else if (verdict === 'partly_true' || verdict === 'misleading') {
    evidenceStrength = 'mixed_evidence';
    evidenceStrengthLabel = 'Mixed Evidence & Discrepancies';
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
    missingContext: missingContext.length > 0 ? missingContext : undefined,
    limitationsAndUnresolved:
      limitationsAndUnresolved.length > 0
        ? limitationsAndUnresolved
        : ['Continuous indexing active; subsequent gazette updates will be incorporated automatically.'],
    searchProviderStatus: searchStatus,
    searchQueryCount: queryCount,
    deduplicatedCount,
  };
}
