import type {
  ClaimDossier,
  SubmissionMode,
  EvidenceSource,
  VerdictType,
  ClearVerdictStatus,
} from '../types.ts';
import {
  extractClaimsAndEntities,
  buildEvidenceAnalysisAndScoring,
  evaluateEvidenceForVerdict,
  classifySourceCredibility,
  sanitizeExternalUrl,
  type SearchResultItem,
  type EvidenceEvaluationResult,
} from './ragEngine.ts';

/**
 * Evidence-grounded civic fact-checking & forensic synthesis engine.
 *
 * Strict Verification Principles:
 * 1. Verified claims resolve strictly into two final categories:
 *    - TRUE NEWS ('verified_true' / 'REAL') when sufficient credible evidence supports core claim facts.
 *    - FALSE NEWS ('false' / 'FAKE') when sufficient credible evidence directly contradicts core claim facts (or explicit scam/phishing lures are present).
 * 2. When evidence is insufficient, unavailable, or conflicting, return Verification Pending ('unverified' / 'UNVERIFIED') without inventing a verdict or defaulting missing evidence to FALSE.
 * 3. Never rely on hardcoded positive truth shortcuts or fabricated synthetic sources when live evidence has not been retrieved.
 */
export interface AnalyzeClaimExtraOptions {
  ragLimitations?: string[];
  vectorHitsCount?: number;
  cragIterations?: number;
  cragTrace?: string[];
  insufficiencyReason?: string;
  irrelevantFilteredCount?: number;
  deduplicatedCount?: number;
  searchQueryCount?: number;
  missingContext?: string[];
}

export function analyzeClaimText(
  claimText: string,
  mode: SubmissionMode = 'text',
  imageName?: string,
  externalSources?: EvidenceSource[],
  searchResults?: SearchResultItem[],
  extraOptions?: AnalyzeClaimExtraOptions
): ClaimDossier {
  const rawText = (claimText || '').trim();

  // Step 1: Intelligent Query Preprocessing, Spell/Grammar Normalization & Entity Isolation
  const {
    cleanedInput,
    normalizedQuery,
    alternativeQueries,
    extractedClaims,
    extractedEntities,
    isOcrFailureOrEmpty,
    preprocessed,
  } = extractClaimsAndEntities(rawText, mode, imageName);

  // Use normalized + cross-lingual expanded text for domain classification
  // while strictly preserving rawText as originalClaim.
  const crossLingualTokens = alternativeQueries
    .filter((q) => /^[A-Za-z0-9\s.,'-]+$/.test(q))
    .join(' ');
  const textLower = `${normalizedQuery} ${crossLingualTokens} ${rawText}`.toLowerCase();

  let cleanedTitle = cleanedInput;
  if (cleanedTitle.length > 75) {
    const cut = cleanedTitle.slice(0, 72);
    const lastSpace = cut.lastIndexOf(' ');
    cleanedTitle = (lastSpace > 30 ? cut.slice(0, lastSpace) : cut) + '...';
  }
  if (!cleanedTitle) {
    cleanedTitle = imageName ? `Screenshot Evidence (${imageName})` : 'User Submitted Claim';
  }

  // Handle empty input or OCR failure state
  if (isOcrFailureOrEmpty) {
    return createEmptyOrOcrFailureDossier(cleanedTitle, mode, rawText, imageName);
  }

  // 1. Domain Categorization
  const isFinance =
    textLower.includes('rbi') ||
    textLower.includes('bank') ||
    textLower.includes('loan') ||
    textLower.includes('emi') ||
    textLower.includes('currency') ||
    textLower.includes('banknote') ||
    textLower.includes('rupee') ||
    textLower.includes('upi') ||
    textLower.includes('lottery') ||
    textLower.includes('tax') ||
    textLower.includes('income tax') ||
    textLower.includes('crypto');

  const isEducation =
    textLower.includes('school') ||
    textLower.includes('college') ||
    textLower.includes('exam') ||
    textLower.includes('sslc') ||
    textLower.includes('puc') ||
    textLower.includes('cbse') ||
    textLower.includes('neet') ||
    textLower.includes('upsc') ||
    textLower.includes('holiday') ||
    textLower.includes('syllabus') ||
    textLower.includes('leak') ||
    textLower.includes('student') ||
    textLower.includes('result');

  const isGovernance =
    textLower.includes('govt') ||
    textLower.includes('government') ||
    textLower.includes('pm ') ||
    textLower.includes('prime minister') ||
    textLower.includes('president') ||
    textLower.includes('cm ') ||
    textLower.includes('chief minister') ||
    textLower.includes('yojana') ||
    textLower.includes('scheme') ||
    textLower.includes('modi') ||
    textLower.includes('siddaramaiah') ||
    textLower.includes('ration') ||
    textLower.includes('aadhaar') ||
    textLower.includes('voter') ||
    textLower.includes('election') ||
    textLower.includes('subsidy') ||
    textLower.includes('pension') ||
    textLower.includes('gazette');

  const isTransport =
    textLower.includes('train') ||
    textLower.includes('railway') ||
    textLower.includes('metro') ||
    textLower.includes('flight') ||
    textLower.includes('petrol') ||
    textLower.includes('diesel') ||
    textLower.includes('toll') ||
    textLower.includes('bus') ||
    textLower.includes('collision') ||
    textLower.includes('accident') ||
    textLower.includes('fuel');

  const isHealth =
    textLower.includes('virus') ||
    textLower.includes('vaccine') ||
    textLower.includes('covid') ||
    textLower.includes('who ') ||
    textLower.includes('hospital') ||
    textLower.includes('medicine') ||
    textLower.includes('doctor') ||
    textLower.includes('health') ||
    textLower.includes('cancer') ||
    textLower.includes('cure');

  const isWeather =
    textLower.includes('cyclone') ||
    textLower.includes('flood') ||
    textLower.includes('rain') ||
    textLower.includes('monsoon') ||
    textLower.includes('earthquake') ||
    textLower.includes('tsunami') ||
    textLower.includes('weather') ||
    textLower.includes('warning');

  const isSpace =
    textLower.includes('isro') ||
    textLower.includes('nasa') ||
    textLower.includes('space') ||
    textLower.includes('moon') ||
    textLower.includes('solar') ||
    textLower.includes('aditya') ||
    textLower.includes('chandrayaan') ||
    textLower.includes('satellite');

  const domain = preprocessed.claimMeta?.newsDomain;

  const isCyber =
    textLower.includes('free recharge') ||
    textLower.includes('500gb') ||
    textLower.includes('click link') ||
    textLower.includes('win cash') ||
    textLower.includes('forward to') ||
    textLower.includes('otp') ||
    textLower.includes('phishing');

  const category = isCyber
    ? 'phishing'
    : isSpace || domain === 'science_tech'
    ? 'space'
    : isWeather || domain === 'weather_disasters'
    ? 'weather'
    : isHealth || domain === 'health_medicine'
    ? 'health'
    : isFinance || isEducation || isGovernance || isTransport || domain === 'politics_governance' || domain === 'govt_schemes' || domain === 'business_economy' || domain === 'education'
    ? 'governance'
    : 'general';

  const sourceEntity = isCyber
    ? 'National Cyber Crime Reporting Portal & DoT'
    : isFinance || domain === 'business_economy'
    ? 'Reserve Bank of India (RBI) & FinMin Desk'
    : isEducation || domain === 'education'
    ? 'Department of School Education & State Board'
    : isGovernance || domain === 'govt_schemes' || domain === 'politics_governance'
    ? 'Press Information Bureau (PIB Fact Check Desk)'
    : isTransport
    ? 'Ministry of Railways & Transport Authority'
    : isHealth || domain === 'health_medicine'
    ? 'Ministry of Health & ICMR Central Desk'
    : isWeather || domain === 'weather_disasters'
    ? 'India Meteorological Department (IMD) Warning Division'
    : isSpace || domain === 'science_tech'
    ? 'ISRO / NASA Science & Mission Desk'
    : domain === 'sports'
    ? 'Sports Governing Body & Official Match Registry'
    : domain === 'crime_safety'
    ? 'Law Enforcement & Public Safety Gazette'
    : domain === 'historical'
    ? 'National Archives & Historical Reference Desk'
    : 'TruthLens Evidence Verification Desk';

  // 2. Intrinsic Phishing / Credential-Harvesting Lure Signals (malicious forward mechanics)
  const hasPhishingSignals =
    textLower.includes('free recharge') ||
    textLower.includes('free 500gb') ||
    textLower.includes('500gb free') ||
    textLower.includes('win 1000') ||
    textLower.includes('win 10,000') ||
    textLower.includes('click link') ||
    textLower.includes('click here to claim') ||
    /\.(?:xyz|top|tk|ml|ga|cf)(?:\/|\b)/i.test(textLower) ||
    textLower.includes('claim your prize') ||
    (textLower.includes('forward to') && textLower.includes('groups'));

  const hasUrgencySensationalism =
    textLower.includes('urgent') ||
    textLower.includes('emergency') ||
    textLower.includes('share immediately') ||
    textLower.includes('tonight at 12') ||
    textLower.includes('dont ignore');

  // Failed Search API Request indicator (graceful handling -> never defaults to false!)
  const isSearchApiFailure =
    textLower.includes('[search_failure_simulated]') ||
    Boolean(externalSources && externalSources.length === 1 && externalSources[0].name.includes('Search Service Disruption'));

  // Step 2b: Evaluate retrieved RAG evidence strictly (no hardcoded positive shortcuts!)
  const effectiveSearchItems: SearchResultItem[] =
    searchResults && searchResults.length > 0
      ? searchResults
      : (externalSources || []).map((s) => ({
          title: s.name,
          url: s.url || '',
          snippet: s.details,
          publicationDate: s.publicationDate,
          sourceName: s.name,
          category: s.category,
          isPrimary: Boolean(s.isPrimary),
          credibilityTier: s.credibilityTier || 'secondary_web',
          relevanceScore: 0.55,
          stance:
            s.status === 'refuted' || s.status === 'contradicted'
              ? 'contradicts'
              : s.status === 'confirmed'
              ? 'supports'
              : 'contextual',
        }));

  const searchStatus: 'operational' | 'fallback_archive' | 'error_reported' = isSearchApiFailure
    ? 'error_reported'
    : 'operational';

  const evidenceEval: EvidenceEvaluationResult | null =
    effectiveSearchItems.length > 0 && !isSearchApiFailure
      ? evaluateEvidenceForVerdict(preprocessed, effectiveSearchItems, searchStatus)
      : null;

  // Step 3: Strict 2-Category Verified Verdict + Verification Pending (UNVERIFIED)
  let verdict: VerdictType = 'unverified';
  let clearVerdictStatus: ClearVerdictStatus = 'UNVERIFIED';
  const hasConflict = Boolean(evidenceEval?.hasConflict);

  if (isSearchApiFailure) {
    verdict = 'unverified';
    clearVerdictStatus = 'UNVERIFIED';
  } else if (hasPhishingSignals && evidenceEval?.recommendedVerdict !== 'verified_true') {
    verdict = 'false';
    clearVerdictStatus = 'FAKE';
  } else if (evidenceEval?.recommendedVerdict === 'verified_true') {
    verdict = 'verified_true';
    clearVerdictStatus = 'REAL';
  } else if (evidenceEval?.recommendedVerdict === 'false') {
    verdict = 'false';
    clearVerdictStatus = 'FAKE';
  } else {
    // Insufficient, inconclusive, or conflicting credible evidence -> Verification Pending
    // RULE: Absence of evidence or unresolved conflict is NOT evidence of falsity!
    verdict = 'unverified';
    clearVerdictStatus = 'UNVERIFIED';
  }

  const isFuturePrediction = Boolean(preprocessed.claimMeta?.isFuturePrediction);
  const isVagueUnnamedClaim = Boolean(preprocessed.claimMeta?.isVagueUnnamedClaim);
  const isAllegationOnly = Boolean(preprocessed.claimMeta?.isAllegationOnly);
  const hasPartialSubClaimSupport = Boolean(evidenceEval?.hasPartialSubClaimSupport);
  const unsupportedSubClaims = evidenceEval?.unsupportedSubClaims || [];

  // Extract distinct dates from supporting/contradicting retrieved evidence when available
  const datedEvidenceNotes: string[] = [];
  for (const item of effectiveSearchItems.slice(0, 5)) {
    const parts: string[] = [];
    if (item.announcementDate) parts.push(`Announced: ${item.announcementDate}`);
    if (item.eventDate) parts.push(`Event: ${item.eventDate}`);
    if (item.implementationDate) parts.push(`Effective: ${item.implementationDate}`);
    if (parts.length > 0) {
      datedEvidenceNotes.push(`${item.sourceName} (${parts.join(', ')})`);
    }
  }

  // Build structured true-news facts from retrieved credible contradicting/corrective sources
  const contradictingItems = effectiveSearchItems.filter((i) => i.stance === 'contradicts');
  const seenCorrectiveSources = new Set<string>();
  const correctiveFacts: { sourceName: string; date?: string; excerpt: string; nliReason?: string }[] = [];
  for (const item of contradictingItems) {
    const cleanExcerpt = (item.snippet || item.title || '').replace(/\s+/g, ' ').trim();
    if (!cleanExcerpt) continue;
    const srcKey = item.sourceName.toLowerCase();
    if (seenCorrectiveSources.has(srcKey) && correctiveFacts.length >= 2) continue;
    seenCorrectiveSources.add(srcKey);
    correctiveFacts.push({
      sourceName: item.sourceName,
      date: item.publicationDate || item.eventDate,
      excerpt: cleanExcerpt.slice(0, 220),
      nliReason: item.nliReason,
    });
    if (correctiveFacts.length >= 3) break;
  }

  // Multilingual synthesis based on verified verdict + retrieved evidence excerpts
  const topicLabelEn = cleanedTitle.replace(/^(Claim:\s*|Viral\s*)/i, '');
  const { summary, debunkExplanation, spokenAudioScript, whatsappDebunkNote, redFlags } =
    generateMultilingualDossierContent({
      rawText,
      topicLabelEn,
      cleanedTitle,
      clearVerdictStatus,
      hasPhishingSignals,
      hasUrgencySensationalism,
      hasConflict,
      isSearchApiFailure,
      hasPartialSubClaimSupport,
      unsupportedSubClaims,
      isFuturePrediction,
      isVagueUnnamedClaim,
      isAllegationOnly,
      datedEvidenceNotes,
      bestAnswerExcerpt: evidenceEval?.bestAnswerExcerpt,
      reasoningNote: evidenceEval?.reasoningNote,
      correctiveFacts,
    });

  // Step 4: Preserve strictly real retrieved/evaluated sources (zero fabricated source arrays)
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(cleanedTitle + ' fact check')}`;
  const verifiedAt = new Date().toISOString();
  let sources: EvidenceSource[] = [];

  if (isSearchApiFailure) {
    sources = [
      {
        name: 'Live Search Service Monitor',
        category: 'Search Engine Interface',
        status: 'unverified',
        details:
          'The external web search provider encountered a network timeout or disruption. No claims could be verified or refuted.',
        timestamp: 'Just now',
        publicationDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        retrievedAt: verifiedAt,
        credibilityTier: 'secondary_web',
        credibilityLabel: 'Live Search Diagnostic',
        accessStatus: 'unaccessible',
      },
    ];
  } else if (externalSources && externalSources.length > 0) {
    sources = externalSources.map((src, idx) => {
      const matchedSearch = searchResults?.[idx] || effectiveSearchItems[idx];
      let resolvedStatus: EvidenceSource['status'] = src.status;
      if (matchedSearch?.stance === 'contradicts') resolvedStatus = 'contradicted';
      else if (matchedSearch?.stance === 'supports') resolvedStatus = 'confirmed';
      else if (matchedSearch?.stance === 'neutral' || matchedSearch?.stance === 'contextual') resolvedStatus = 'unverified';
      const safeUrl = sanitizeExternalUrl(src.url);
      const credInfo = classifySourceCredibility(safeUrl || '', src.name);
      return {
        ...src,
        url: safeUrl,
        retrievedAt: src.retrievedAt || matchedSearch?.retrievedAt || verifiedAt,
        credibilityLabel: src.credibilityLabel || matchedSearch?.credibilityLabel || credInfo.categoryLabel,
        accessStatus: src.accessStatus || (safeUrl ? 'accessible' : 'unaccessible'),
        status: resolvedStatus,
        nliLabel: src.nliLabel || matchedSearch?.nliLabel,
        nliConfidence: src.nliConfidence ?? matchedSearch?.nliConfidence,
        nliReason: src.nliReason || matchedSearch?.nliReason,
      };
    });
  } else if (searchResults && searchResults.length > 0) {
    sources = searchResults.map((r) => {
      const safeUrl = sanitizeExternalUrl(r.url);
      const credInfo = classifySourceCredibility(safeUrl || '', r.sourceName);
      return {
        name: r.sourceName,
        category: r.category,
        status:
          r.stance === 'supports'
            ? 'confirmed'
            : r.stance === 'contradicts'
            ? 'contradicted'
            : 'unverified',
        details: r.snippet,
        url: safeUrl,
        timestamp: 'Retrieved live',
        publicationDate: r.publicationDate || 'Live Index',
        retrievedAt: r.retrievedAt || verifiedAt,
        isPrimary: r.isPrimary,
        credibilityTier: r.credibilityTier,
        credibilityLabel: r.credibilityLabel || credInfo.categoryLabel,
        accessStatus: safeUrl ? 'accessible' : 'unaccessible',
        nliLabel: r.nliLabel,
        nliConfidence: r.nliConfidence,
        nliReason: r.nliReason,
      };
    });
  }

  // Populate individual verdicts for extracted sub-claims using per-sub-claim RAG evaluations when available
  for (let idx = 0; idx < extractedClaims.length; idx++) {
    const sub = extractedClaims[idx];
    const subLower = sub.claim.toLowerCase();
    const subHasPhishing =
      subLower.includes('free recharge') ||
      subLower.includes('500gb') ||
      /\.(?:xyz|top|tk|ml)\b/i.test(subLower) ||
      subLower.includes('click link') ||
      subLower.includes('claim your prize');

    const perSubEval = evidenceEval?.subClaimEvaluations?.[idx];

    if (subHasPhishing) {
      sub.verdict = 'false';
      sub.clearVerdictStatus = 'FAKE';
      sub.statusLabel = 'FALSE NEWS';
    } else if (perSubEval && extractedClaims.length >= 2) {
      sub.verdict = perSubEval.verdict;
      sub.clearVerdictStatus = perSubEval.clearVerdictStatus;
      sub.statusLabel = perSubEval.statusLabel;
    } else if (verdict === 'verified_true') {
      sub.verdict = 'verified_true';
      sub.clearVerdictStatus = 'REAL';
      sub.statusLabel = 'TRUE NEWS';
    } else if (verdict === 'false') {
      sub.verdict = 'false';
      sub.clearVerdictStatus = 'FAKE';
      sub.statusLabel = 'FALSE NEWS';
    } else {
      sub.verdict = 'unverified';
      sub.clearVerdictStatus = 'UNVERIFIED';
      sub.statusLabel = 'Verification Pending';
    }
  }

  // Step 5: Calibrated Evidence Scoring & Breakdown
  const evidenceAnalysis = buildEvidenceAnalysisAndScoring(
    cleanedTitle,
    verdict,
    sources,
    effectiveSearchItems,
    searchStatus,
    extraOptions?.searchQueryCount ?? extractedClaims.length + 1,
    extraOptions?.deduplicatedCount ?? 0,
    {
      extraLimitations: extraOptions?.ragLimitations,
      missingContext: extraOptions?.missingContext,
      hasOutdatedEvidence: Boolean(evidenceEval?.hasOutdatedEvidence),
      hasPartialSubClaimSupport,
      unsupportedSubClaims,
      isFuturePrediction,
      isVagueUnnamedClaim,
      isAllegationOnly,
      irrelevantFilteredCount: extraOptions?.irrelevantFilteredCount,
      cragIterations: extraOptions?.cragIterations,
      cragTrace: extraOptions?.cragTrace,
      insufficiencyReason: extraOptions?.insufficiencyReason || evidenceEval?.insufficiencyReason,
    }
  );

  const calibratedConfidenceScore = evidenceAnalysis.criteriaScore;
  const dossierId = `user-dossier-${Date.now()}`;

  return {
    id: dossierId,
    title: cleanedTitle,
    originalClaim: rawText,
    verdict,
    verdictLabel: getVerdictLabel(clearVerdictStatus, hasConflict),
    verdictSubtitle: getVerdictSubtitle(clearVerdictStatus, hasConflict, isSearchApiFailure),
    confidenceScore: calibratedConfidenceScore,
    timeAgo: 'Just verified',
    verifiedAt,
    category,
    sourceEntity,
    languages: ['en', 'kn', 'hi'],
    clearVerdictStatus,
    spokenAudioScript,
    summary,
    debunkExplanation,
    whatsappDebunkNote,
    sources,
    redFlags,
    timeline: [
      {
        time: 'T-00:30',
        event: 'Claim ingested, normalized, and factual entities extracted',
        source: 'Query Preprocessor',
      },
      {
        time: 'T-00:15',
        event:
          sources.length > 0
            ? `Evaluated ${sources.length} retrieved source excerpt(s) for corroboration and contradiction`
            : 'Checked public knowledge and news indices (no conclusive sources retrieved)',
        source: 'RAG Evidence Retriever',
      },
      {
        time: 'Just now',
        event: `Evidence assessment: ${
          clearVerdictStatus === 'REAL'
            ? 'TRUE NEWS'
            : clearVerdictStatus === 'FAKE'
            ? 'FALSE NEWS'
            : 'Verification Pending'
        }`,
        source: 'Verification Engine',
      },
    ],
    originVector:
      mode === 'ocr'
        ? 'Attached Visual Screenshot / Photo'
        : mode === 'url'
        ? 'Shared Link'
        : 'User Entered News / Claim Forward',
    officialRefId: `TL-${clearVerdictStatus}-${Math.floor(10000 + Math.random() * 90000)}`,
    groundingInfo: {
      isGrounded: sources.length > 0,
      queries: Array.from(
        new Set([normalizedQuery, ...alternativeQueries, `${cleanedTitle} fact check`])
      ).slice(0, 5),
      sources: sources.map((s) => ({ title: s.name, uri: s.url || googleSearchUrl })),
    },
    extractedClaims,
    extractedEntities: {
      dates: extractedEntities.dates,
      locations: extractedEntities.locations,
      organizations: extractedEntities.organizations,
      amounts: extractedEntities.amounts,
      people: extractedEntities.people,
    },
    semanticFrame: preprocessed.semanticFrame,
    evidenceAnalysis,
    evidenceStrength: evidenceAnalysis.evidenceStrengthLabel,
    submissionMode: mode,
  };
}

/**
 * Creates a clear Verification Pending (UNVERIFIED) dossier when OCR fails or input is empty.
 * Never classifies technical errors or unreadable input as FALSE NEWS.
 */
function createEmptyOrOcrFailureDossier(
  _cleanedTitle: string,
  mode: SubmissionMode,
  rawText: string,
  imageName?: string
): ClaimDossier {
  const isOcr = mode === 'ocr' || !!imageName;
  const title = isOcr
    ? `Image Verification (${imageName || 'Attached Screenshot'})`
    : 'Incomplete / Ambiguous Claim';

  return {
    id: `unverified-${Date.now()}`,
    title,
    originalClaim: rawText || (isOcr ? 'Image uploaded for verification' : 'No claim text provided'),
    verdict: 'unverified',
    verdictLabel: 'Verification Pending • Insufficient Input',
    verdictSubtitle: isOcr
      ? 'Could not extract legible text or clear factual claims from the provided image.'
      : 'The submitted claim is too brief or ambiguous to cross-reference against retrieved records.',
    confidenceScore: 35.0,
    timeAgo: 'Just verified',
    verifiedAt: new Date().toISOString(),
    category: 'general',
    sourceEntity: 'TruthLens Intake & OCR Parser',
    languages: ['en', 'kn', 'hi'],
    clearVerdictStatus: 'UNVERIFIED',
    spokenAudioScript: {
      kn: 'ಗಮನಿಸಿ: ಒದಗಿಸಲಾದ ಚಿತ್ರ ಅಥವಾ ಸಂದೇಶದಿಂದ ಸ್ಪಷ್ಟ ಪಠ್ಯವನ್ನು ಹೊರತೆಗೆಯಲು ಸಾಧ್ಯವಾಗಿಲ್ಲ. ಸಾಕ್ಷ್ಯಾಧಾರಗಳ ಕೊರತೆಯಿಂದಾಗಿ ಈ ಸುದ್ದಿಯ ಪರಿಶೀಲನೆ ಬಾಕಿ ಇದೆ. ದಯವಿಟ್ಟು ಸ್ಪಷ್ಟವಾದ ಚಿತ್ರ ಅಥವಾ ಪಠ್ಯವನ್ನು ನಮೂದಿಸಿ ಮತ್ತೆ ಪರಿಶೀಲಿಸಿ.',
      hi: 'ध्यान दें: प्रदान की गई छवि या संदेश से स्पष्ट पाठ प्राप्त नहीं हो सका। साक्ष्य के अभाव में इसका सत्यापन लंबित है। कृपया स्पष्ट टेक्स्ट या छवि प्रदान करें।',
      en: 'Notice: Could not extract clear, legible text or claims to verify. Verification is pending due to insufficient input. Please provide clear text or a sharper screenshot.',
    },
    summary: {
      en: isOcr
        ? 'OCR text extraction could not identify distinct factual claims from the uploaded image. Verification remains pending without inventing a verdict.'
        : 'The provided submission contains insufficient text to corroborate or refute any factual claim. Verification remains pending.',
      kn: 'ಚಿತ್ರದಿಂದ ಯಾವುದೇ ಸ್ಪಷ್ಟ ಪಠ್ಯ ಅಥವಾ ಸುದ್ದಿಯನ್ನು ಗುರುತಿಸಲು ಸಾಧ್ಯವಾಗಿಲ್ಲ. ಸಾಕ್ಷ್ಯಾಧಾರಗಳ ಕೊರತೆಯಿಂದ ಪರಿಶೀಲನೆ ಬಾಕಿ ಇದೆ.',
      hi: 'अपलोड की गई छवि से स्पष्ट दावा नहीं निकाला जा सका। पर्याप्त जानकारी के बिना कोई निष्कर्ष नहीं निकाला जा सकता, अतः सत्यापन लंबित है।',
    },
    debunkExplanation: {
      en: 'TruthLens never classifies a claim as false merely because an image is blurry or input text is incomplete. Please enter the claim text directly or upload a sharper screenshot.',
      kn: 'ಪಠ್ಯ ಸಿಗದ ಕಾರಣಕ್ಕಾಗಿ ಯಾವುದೇ ಸುದ್ದಿಯನ್ನು ಸುಳ್ಳು ಎಂದು ಘೋಷಿಸಲಾಗುವುದಿಲ್ಲ. ದಯವಿಟ್ಟು ಪಠ್ಯ ಬಾಕ್ಸ್‌ನಲ್ಲಿ ನೇರವಾಗಿ ಟೈಪ್ ಮಾಡಿ ಪರಿಶೀಲಿಸಿ.',
      hi: 'केवल छवि अस्पष्ट या पाठ अधूरा होने पर किसी दावे को फर्जी नहीं कहा जाता। कृपया स्पष्ट दावा लिखकर जांचें।',
    },
    whatsappDebunkNote: {
      en: '🔍 *TRUTHLENS NOTICE: VERIFICATION PENDING*\n\nUnable to extract clear text from the submission. Please resubmit with legible text.',
      kn: '🔍 *ಟ್ರೂತ್‌ಲೆನ್ಸ್ ಮಾಹಿತಿ: ಪರಿಶೀಲನೆ ಬಾಕಿ ಇದೆ*\n\nಚಿತ್ರದಲ್ಲಿ ಸ್ಪಷ್ಟ ಪಠ್ಯ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ಪಠ್ಯವನ್ನು ನಮೂದಿಸಿ ಪರಿಶೀಲಿಸಿ.',
      hi: '🔍 *ट्रूथलेन्स सूचना: सत्यापन लंबित*\n\nछवि से स्पष्ट पाठ नहीं मिला। कृपया स्पष्ट विवरण के साथ पुनः प्रयास करें।',
    },
    sources: [],
    redFlags: [
      'Image resolution or text legibility too low for factual claim extraction',
      'No specific entity, date, or verifiable statement detected',
    ],
    timeline: [
      {
        time: 'Just now',
        event: 'Intake parsing completed: insufficient text extracted',
        source: 'OCR / Intake Engine',
      },
    ],
    originVector: isOcr ? 'Uploaded Image' : 'User Input',
    officialRefId: 'TL-PENDING-INPUT',
    extractedClaims: [],
    extractedEntities: {
      dates: [],
      locations: [],
      organizations: [],
      amounts: [],
      people: [],
    },
    evidenceAnalysis: {
      evidenceStrength: 'insufficient_data',
      evidenceStrengthLabel: 'Insufficient Public Data',
      criteriaScore: 35.0,
      supportingEvidence: [],
      contradictingEvidence: [],
      neutralEvidence: [],
      limitationsAndUnresolved: [
        'Could not extract legible factual claims from the uploaded image or input text.',
        'Absence of extracted text prevents retrieval against verified sources.',
      ],
      searchProviderStatus: 'operational',
      searchQueryCount: 0,
    },
  };
}

/**
 * Generates multilingual text content for TRUE NEWS, FALSE NEWS, and Verification Pending.
 */
function generateMultilingualDossierContent(params: {
  rawText: string;
  topicLabelEn: string;
  cleanedTitle: string;
  clearVerdictStatus: ClearVerdictStatus;
  hasPhishingSignals: boolean;
  hasUrgencySensationalism: boolean;
  hasConflict: boolean;
  isSearchApiFailure: boolean;
  hasPartialSubClaimSupport?: boolean;
  unsupportedSubClaims?: string[];
  isFuturePrediction?: boolean;
  isVagueUnnamedClaim?: boolean;
  isAllegationOnly?: boolean;
  datedEvidenceNotes?: string[];
  bestAnswerExcerpt?: string;
  reasoningNote?: string;
  correctiveFacts?: { sourceName: string; date?: string; excerpt: string; nliReason?: string }[];
}) {
  const {
    rawText,
    topicLabelEn,
    cleanedTitle,
    clearVerdictStatus,
    hasPhishingSignals,
    hasUrgencySensationalism,
    hasConflict,
    isSearchApiFailure,
    hasPartialSubClaimSupport,
    unsupportedSubClaims,
    isFuturePrediction,
    isVagueUnnamedClaim,
    isAllegationOnly,
    datedEvidenceNotes,
    bestAnswerExcerpt,
    reasoningNote,
    correctiveFacts = [],
  } = params;

  const dateContextSuffix =
    datedEvidenceNotes && datedEvidenceNotes.length > 0
      ? ` Key evidence dates: ${datedEvidenceNotes.slice(0, 2).join('; ')}.`
      : '';

  let spokenAudioKn = '';
  let spokenAudioHi = '';
  let spokenAudioEn = '';

  let summaryEn = '';
  let summaryKn = '';
  let summaryHi = '';

  let debunkEn = '';
  let debunkKn = '';
  let debunkHi = '';

  let whatsappNoteEn = '';
  let whatsappNoteKn = '';
  let whatsappNoteHi = '';

  const redFlags: string[] = [];

  if (clearVerdictStatus === 'FAKE') {
    const specificWhyFake =
      correctiveFacts.find((f) => f.nliReason)?.nliReason ||
      reasoningNote ||
      (hasPhishingSignals
        ? 'Contains fraudulent link, giveaway, or phishing lure patterns rejected by official security norms.'
        : 'Retrieved credible sources directly contradict key facts of the claim.');

    const trueNewsEntries = correctiveFacts.map((f) => {
      const datePart = f.date ? ` (${f.date})` : '';
      return `${f.sourceName}${datePart}: "${f.excerpt}"`;
    });
    const trueNewsBrief =
      trueNewsEntries.length > 0
        ? trueNewsEntries.slice(0, 2).join(' | ')
        : bestAnswerExcerpt
        ? bestAnswerExcerpt.slice(0, 240)
        : '';
    const trueNewsDetailed =
      trueNewsEntries.length > 0
        ? trueNewsEntries.join('; ')
        : bestAnswerExcerpt || '';

    spokenAudioKn = trueNewsBrief
      ? `ಸ್ಪಷ್ಟ ಎಚ್ಚರಿಕೆ! '${topicLabelEn}' ಕುರಿತು ಹರಡುತ್ತಿರುವ ಈ ಸುದ್ದಿ ಸುಳ್ಳಾಗಿದೆ. ಕಾರಣ: ${specificWhyFake} ವಿಶ್ವಾಸಾರ್ಹ ಮೂಲಗಳ ಪ್ರಕಾರ ನಿಜವಾದ ಸುದ್ದಿ: ${trueNewsBrief}. ದಯವಿಟ್ಟು ಈ ನಕಲಿ ಸಂದೇಶವನ್ನು ಫಾರ್ವರ್ಡ್ ಮಾಡಬೇಡಿ.`
      : `ಸ್ಪಷ್ಟ ಎಚ್ಚರಿಕೆ! '${topicLabelEn}' ಕುರಿತು ಹರಡುತ್ತಿರುವ ಈ ಸುದ್ದಿ ಸುಳ್ಳಾಗಿದೆ. ಲಭ್ಯವಿರುವ ವಿಶ್ವಾಸಾರ್ಹ ದಾಖಲೆಗಳು ಈ ಹೇಳಿಕೆಯನ್ನು ನೇರವಾಗಿ ನಿರಾಕರಿಸುತ್ತವೆ. ದಯವಿಟ್ಟು ಈ ನಕಲಿ ಸಂದೇಶವನ್ನು ಫಾರ್ವರ್ಡ್ ಮಾಡಬೇಡಿ.`;
    spokenAudioHi = trueNewsBrief
      ? `सावधान! '${topicLabelEn}' से जुड़ा यह दावा झूठा (फर्जी) पाया गया है। कारण: ${specificWhyFake} विश्वसनीय स्रोतों के अनुसार सही खबर: ${trueNewsBrief}। कृपया इस झूठे संदेश को आगे न भेजें।`
      : `सावधान! '${topicLabelEn}' से जुड़ा यह दावा झूठा (फर्जी) पाया गया है। उपलब्ध विश्वसनीय साक्ष्य इस दावे का सीधे खंडन करते हैं। कृपया इस झूठे संदेश को आगे न भेजें।`;
    spokenAudioEn = trueNewsBrief
      ? `False News alert! The claim regarding "${topicLabelEn}" is false. Why it is false: ${specificWhyFake} True news from retrieved resources: ${trueNewsBrief}`
      : `False News alert! This claim regarding "${topicLabelEn}" displays clear fraudulent or deceptive indicators contradicted by verification checks. Do not share.`;

    summaryEn = trueNewsBrief
      ? `FALSE NEWS — Why it is false: ${specificWhyFake} True news from retrieved resources: ${trueNewsBrief}${dateContextSuffix}`
      : `FALSE NEWS: ${specificWhyFake}`;
    summaryKn = trueNewsBrief
      ? `ಸುಳ್ಳು ಸುದ್ದಿ — ಕಾರಣ: ${specificWhyFake} ವಿಶ್ವಾಸಾರ್ಹ ಮೂಲಗಳ ನಿಜವಾದ ಸುದ್ದಿ: ${trueNewsBrief}`
      : `ಸುಳ್ಳು ಸುದ್ದಿ: ಲಭ್ಯವಿರುವ ವಿಶ್ವಾಸಾರ್ಹ ಸಾಕ್ಷ್ಯಗಳು ಈ ಹೇಳಿಕೆಯನ್ನು ನೇರವಾಗಿ ನಿರಾಕರಿಸುತ್ತವೆ.`;
    summaryHi = trueNewsBrief
      ? `फर्जी खबर — कारण: ${specificWhyFake} विश्वसनीय स्रोतों से सही खबर: ${trueNewsBrief}`
      : `फर्जी खबर: उपलब्ध विश्वसनीय साक्ष्य इस दावे का सीधे खंडन करते हैं।`;

    debunkEn = trueNewsDetailed
      ? `FALSE NEWS: The claim "${rawText}" is false. Why it is false: ${specificWhyFake} True news from retrieved credible resources: ${trueNewsDetailed}${dateContextSuffix}`
      : `FALSE NEWS: The claim "${rawText}" contains verified phishing or deceptive lure indicators contradicting legitimate institutional practices.`;
    debunkKn = trueNewsDetailed
      ? `'${rawText}' ಎಂಬ ಸುದ್ದಿ ಸುಳ್ಳಾಗಿದೆ. ಕಾರಣ: ${specificWhyFake} ವಿಶ್ವಾಸಾರ್ಹ ಮೂಲಗಳ ಪ್ರಕಾರ ನಿಜವಾದ ಸುದ್ದಿ: ${trueNewsDetailed}`
      : `'${rawText}' ಎಂಬ ಸುದ್ದಿಯ ಪ್ರಮುಖ ಅಂಶಗಳು ವಿಶ್ವಾಸಾರ್ಹ ದಾಖಲೆಗಳಿಗೆ ವಿರುದ್ಧವಾಗಿವೆ. ಇದನ್ನು ಸುಳ್ಳು ಸುದ್ದಿ (FALSE NEWS) ಎಂದು ವರ್ಗೀಕರಿಸಲಾಗಿದೆ.`;
    debunkHi = trueNewsDetailed
      ? `'${rawText}' का दावा झूठा है। कारण: ${specificWhyFake} विश्वसनीय स्रोतों के अनुसार सही खबर: ${trueNewsDetailed}`
      : `'${rawText}' का मुख्य दावा विश्वसनीय साक्ष्यों के विपरीत है। इसे फर्जी खबर (FALSE NEWS) के रूप में चिह्नित किया गया है।`;

    whatsappNoteEn = `🚨 *TRUTHLENS FACT CHECK* 🚨\n\n❌ *VERDICT: FALSE NEWS / ಸುಳ್ಳು ಸುದ್ದಿ / फर्जी खबर*\n\n*Claim:* ${cleanedTitle}\n*Why Fake:* ${specificWhyFake}${trueNewsBrief ? `\n*True News:* ${trueNewsBrief}` : ''}\n\n_Ref: TruthLens Verification Engine_`;
    whatsappNoteKn = `🚨 *ಟ್ರೂತ್‌ಲೆನ್ಸ್ ಫ್ಯಾಕ್ಟ್ ಚೆಕ್* 🚨\n\n❌ *ತೀರ್ಪು: ಸುಳ್ಳು ಸುದ್ದಿ (FALSE NEWS)*\n\n*ಸುದ್ದಿ:* ${cleanedTitle}\n*ಸತ್ಯಾಂಶ:* ${trueNewsBrief || 'ವಿಶ್ವಾಸಾರ್ಹ ದಾಖಲೆಗಳು ಈ ಹೇಳಿಕೆಯನ್ನು ನಿರಾಕರಿಸುತ್ತವೆ.'}`;
    whatsappNoteHi = `🚨 *ट्रूथलेन्स फैक्ट चेक* 🚨\n\n❌ *निष्कर्ष: फर्जी खबर (FALSE NEWS)*\n\n*दावा:* ${cleanedTitle}\n*सही खबर:* ${trueNewsBrief || 'विश्वसनीय साक्ष्य इस दावे का खंडन करते हैं।'}`;

    if (hasPhishingSignals) {
      redFlags.push('Contains free giveaway, suspicious domain, or forward-chain lure typical of scams');
    }
    if (hasUrgencySensationalism) {
      redFlags.push('Employs emotional urgency or command phrasing urging fast forwarding');
    }
    redFlags.push(`Why false: ${specificWhyFake}`);
    if (trueNewsBrief) {
      redFlags.push(`True news reported: ${trueNewsBrief.slice(0, 220)}`);
    }
  } else if (clearVerdictStatus === 'REAL') {
    spokenAudioKn = `ದೃಢೀಕೃತ ಸತ್ಯ ಸುದ್ದಿ! '${topicLabelEn}' ಕುರಿತು ನೀವು ಕೇಳಿದ ಮಾಹಿತಿಯು ವಿಶ್ವಾಸಾರ್ಹ ಸಾಕ್ಷ್ಯಾಧಾರಗಳಿಂದ ಸತ್ಯವೆಂದು ದೃಢಪಟ್ಟಿದೆ.`;
    spokenAudioHi = `सत्यापित सत्य खबर! '${topicLabelEn}' से संबंधित यह जानकारी विश्वसनीय साक्ष्यों द्वारा सत्य प्रमाणित हुई है।`;
    spokenAudioEn = bestAnswerExcerpt
      ? `True News confirmed! Based on retrieved credible sources regarding "${topicLabelEn}": ${bestAnswerExcerpt.slice(0, 220)}`
      : `True News confirmed! Retrieved credible records corroborate the core facts regarding "${topicLabelEn}".`;

    summaryEn = bestAnswerExcerpt
      ? `TRUE NEWS: Corroborated by retrieved credible sources — ${bestAnswerExcerpt.slice(0, 280)}${dateContextSuffix}`
      : `TRUE NEWS: Core factual assertions are corroborated by retrieved credible sources.`;
    summaryKn = `ಸತ್ಯ ಸುದ್ದಿ: ವಿಶ್ವಾಸಾರ್ಹ ದಾಖಲೆಗಳು ಮತ್ತು ಸುದ್ದಿ ಮೂಲಗಳಿಂದ ಈ ಮಾಹಿತಿಯ ಪ್ರಮುಖ ಅಂಶಗಳು ದೃಢಪಟ್ಟಿವೆ.`;
    summaryHi = `सत्य खबर: विश्वसनीय अभिलेखों एवं समाचार स्रोतों द्वारा इस दावे के मुख्य तथ्य प्रमाणित हुए हैं।`;

    debunkEn = bestAnswerExcerpt
      ? `TRUE NEWS: Verification confirms "${rawText}" based on retrieved credible records. ${reasoningNote || ''}${dateContextSuffix} Evidence: "${bestAnswerExcerpt}"`
      : `TRUE NEWS: Verification confirms "${rawText}" is corroborated by retrieved credible records.`;
    debunkKn = `'${rawText}' ಕುರಿತಾದ ಮಾಹಿತಿಯನ್ನು ವಿಶ್ವಾಸಾರ್ಹ ಸರ್ಕಾರಿ, ಸುದ್ದಿ ಮತ್ತು ಉಲ್ಲೇಖ ಮೂಲಗಳು ದೃಢಪಡಿಸಿವೆ.`;
    debunkHi = `'${rawText}' का विवरण विश्वसनीय आधिकारिक और समाचार स्रोतों द्वारा प्रमाणित है।`;

    whatsappNoteEn = `✅ *TRUTHLENS FACT CHECK* ✅\n\n*VERDICT: TRUE NEWS / ಸತ್ಯ ಸುದ್ದಿ / सत्य खबर*\n\n*Claim:* ${cleanedTitle}\n*Status:* Corroborated by credible retrieved sources.\n\n_Ref: TruthLens Verification Engine_`;
    whatsappNoteKn = `✅ *ಟ್ರೂತ್‌ಲೆನ್ಸ್ ಫ್ಯಾಕ್ಟ್ ಚೆಕ್* ✅\n\n*ತೀರ್ಪು: ಸತ್ಯ ಸುದ್ದಿ (TRUE NEWS)*\n\n*ವಿಷಯ:* ${cleanedTitle}\n*ಸ್ಥಿತಿ:* ವಿಶ್ವಾಸಾರ್ಹ ಮೂಲಗಳಿಂದ ದೃಢಪಟ್ಟಿದೆ.`;
    whatsappNoteHi = `✅ *ट्रूथलेन्स फैक्ट चेक* ✅\n\n*निष्कर्ष: सत्य खबर (TRUE NEWS)*\n\n*विषय:* ${cleanedTitle}\n*स्थिति:* विश्वसनीय स्रोतों द्वारा प्रमाणित।`;
  } else {
    // Verification Pending (Insufficient evidence, partial sub-claims, future prediction, vague claim, conflicting sources, or provider failure)
    const pendingReasonEn = isSearchApiFailure
      ? 'Live web retrieval encountered a temporary service interruption. Verification is pending without inventing a verdict.'
      : isFuturePrediction
      ? 'This statement makes a future forecast or prediction that has not yet occurred and cannot be verified as an established fact today.'
      : isVagueUnnamedClaim
      ? 'This claim omits specific names, locations, dates, or issuing authorities needed to verify it reliably against primary records.'
      : hasPartialSubClaimSupport && unsupportedSubClaims && unsupportedSubClaims.length > 0
      ? `Only part of this claim is supported by retrieved records; unsupported or unverified parts remain (${unsupportedSubClaims.join('; ')}). TruthLens does not mark multi-part claims as TRUE NEWS until every key condition is verified.`
      : isAllegationOnly
      ? 'Available sources report unconfirmed allegations rather than verified or adjudicated facts; verification remains pending.'
      : hasConflict
      ? 'Retrieved credible sources contain conflicting reports regarding key facts of this claim. Verification remains pending until authoritative clarification resolves the discrepancy.'
      : 'Retrieved credible sources are insufficient or inconclusive to verify or refute this claim. Absence of conclusive evidence does not make a claim false; verification remains pending.';

    const pendingReasonKn = isSearchApiFailure
      ? 'ಲೈವ್ ಹುಡುಕಾಟ ಸೇವೆಯಲ್ಲಿ ತಾತ್ಕಾಲಿಕ ಅಡಚಣೆ ಉಂಟಾಗಿದೆ. ಸಾಕ್ಷ್ಯಾಧಾರಗಳಿಲ್ಲದೆ ತೀರ್ಪು ನೀಡಲಾಗುವುದಿಲ್ಲ; ಪರಿಶೀಲನೆ ಬಾಕಿ ಇದೆ.'
      : isFuturePrediction
      ? 'ಈ ಹೇಳಿಕೆಯು ಭವಿಷ್ಯದ ಅಂದಾಜನ್ನು ಒಳಗೊಂಡಿದ್ದು, ಪ್ರಸ್ತುತ ಸತ್ಯ ಅಥವಾ ಸುಳ್ಳು ಎಂದು ದೃಢಪಡಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.'
      : isVagueUnnamedClaim
      ? 'ಈ ಸಂದೇಶದಲ್ಲಿ ನಿರ್ದಿಷ್ಟ ವ್ಯಕ್ತಿ, ಸ್ಥಳ ಅಥವಾ ದಿನಾಂಕದ ವಿವರಗಳಿಲ್ಲದ ಕಾರಣ ನಿಖರ ಪರಿಶೀಲನೆ ಬಾಕಿ ಇದೆ.'
      : hasPartialSubClaimSupport
      ? 'ಈ ಹೇಳಿಕೆಯ ಕೆಲವು ಅಂಶಗಳಿಗೆ ಮಾತ್ರ ಆಂಶಿಕ ಮಾಹಿತಿ ಲಭ್ಯವಿದ್ದು, ಉಳಿದ ಪ್ರಮುಖ ಭಾಗಗಳಿಗೆ ಸಾಕ್ಷ್ಯಗಳಿಲ್ಲ. ಪರಿಶೀಲನೆ ಬಾಕಿ ಇದೆ.'
      : hasConflict
      ? 'ಲಭ್ಯವಿರುವ ವಿಶ್ವಾಸಾರ್ಹ ಮೂಲಗಳಲ್ಲಿ ಪರಸ್ಪರ ವಿರುದ್ಧವಾದ ಮಾಹಿತಿ ಕಂಡುಬಂದಿದೆ. ಸ್ಪಷ್ಟ ಅಧಿಕೃತ ದಾಖಲೆ ಸಿಗುವವರೆಗೆ ಪರಿಶೀಲನೆ ಬಾಕಿ ಇದೆ.'
      : `'${topicLabelEn}' ಕುರಿತು ನಿರ್ಣಾಯಕ ತೀರ್ಪು ನೀಡಲು ಸಾಕಷ್ಟು ವಿಶ್ವಾಸಾರ್ಹ ಸಾಕ್ಷ್ಯಗಳು ಲಭ್ಯವಾಗಿಲ್ಲ. ಸಾಕ್ಷ್ಯಗಳ ಕೊರತೆಯಿಂದ ಇದನ್ನು ಸುಳ್ಳು ಎಂದು ಪರಿಗಣಿಸುವುದಿಲ್ಲ; ಪರಿಶೀಲನೆ ಬಾಕಿ ಇದೆ.`;

    const pendingReasonHi = isSearchApiFailure
      ? 'लाइव वेब खोज सेवा में अस्थायी व्यवधान आया। बिना साक्ष्य के कोई निष्कर्ष नहीं निकाला जा सकता; सत्यापन लंबित है।'
      : isFuturePrediction
      ? 'यह कथन भविष्य की संभावना या पूर्वानुमान से जुड़ा है, जिसे आज तथ्य के रूप में सत्यापित नहीं किया जा सकता।'
      : isVagueUnnamedClaim
      ? 'इस दावे में किसी व्यक्ति, स्थान, तिथि या आधिकारिक स्रोत का स्पष्ट नाम नहीं है; अतः सत्यापन लंबित है।'
      : hasPartialSubClaimSupport
      ? 'इस दावे के केवल कुछ हिस्सों का आंशिक समर्थन मिला है, जबकि शेष प्रमुख शर्तों के विश्वसनीय प्रमाण उपलब्ध नहीं हैं। सत्यापन लंबित है।'
      : hasConflict
      ? 'उपलब्ध विश्वसनीय स्रोतों में इस दावे के मुख्य तथ्यों पर परस्पर विरोधी जानकारी मिली है। स्पष्ट आधिकारिक पुष्टि तक सत्यापन लंबित है।'
      : `'${topicLabelEn}' पर निर्णायक निष्कर्ष देने के लिए पर्याप्त विश्वसनीय साक्ष्य उपलब्ध नहीं हैं। साक्ष्य के अभाव को झूठा नहीं माना जा सकता; सत्यापन लंबित है।`;

    spokenAudioKn = `ಗಮನಿಸಿ: ${pendingReasonKn}`;
    spokenAudioHi = `ध्यान दें: ${pendingReasonHi}`;
    spokenAudioEn = `Verification Pending: ${pendingReasonEn}`;

    summaryEn = bestAnswerExcerpt
      ? `VERIFICATION PENDING: ${pendingReasonEn}${dateContextSuffix} Closest context retrieved: ${bestAnswerExcerpt.slice(0, 200)}`
      : `VERIFICATION PENDING: ${pendingReasonEn}${dateContextSuffix}`;
    summaryKn = `ಪರಿಶೀಲನೆ ಬಾಕಿ: ${pendingReasonKn}`;
    summaryHi = `सत्यापन लंबित: ${pendingReasonHi}`;

    debunkEn = `${pendingReasonEn}${reasoningNote ? ` (${reasoningNote})` : ''}${dateContextSuffix} TruthLens classifies news strictly as TRUE NEWS or FALSE NEWS only when sufficient credible corroborating or contradicting evidence supports all important conditions of the claim.`;
    debunkKn = `${pendingReasonKn} ಸಾಕಷ್ಟು ವಿಶ್ವಾಸಾರ್ಹ ಸಾಕ್ಷ್ಯಾಧಾರಗಳು ಲಭ್ಯವಾದಾಗ ಮಾತ್ರ ಸುದ್ದಿಯನ್ನು ಸತ್ಯ ಅಥವಾ ಸುಳ್ಳು ಎಂದು ನಿರ್ಧರಿಸಲಾಗುತ್ತದೆ.`;
    debunkHi = `${pendingReasonHi} पर्याप्त विश्वसनीय साक्ष्य मिलने पर ही किसी खबर को सत्य या फर्जी घोषित किया जाता है।`;

    whatsappNoteEn = `🔍 *TRUTHLENS FACT CHECK: VERIFICATION PENDING*\n\n*Claim:* ${cleanedTitle}\n*Status:* ${hasConflict ? 'Conflicting credible sources retrieved.' : hasPartialSubClaimSupport ? 'Partial evidence only; key sub-claims unverified.' : 'Insufficient credible evidence retrieved.'} Cannot classify as TRUE NEWS or FALSE NEWS without conclusive evidence.\n\n_Ref: TruthLens Verification Engine_`;
    whatsappNoteKn = `🔍 *ಟ್ರೂತ್‌ಲೆನ್ಸ್ ಫ್ಯಾಕ್ಟ್ ಚೆಕ್: ಪರಿಶೀಲನೆ ಬಾಕಿ ಇದೆ*\n\n*ಸುದ್ದಿ:* ${cleanedTitle}\n*ಸ್ಥಿತಿ:* ಸಾಕಷ್ಟು ನಿರ್ಣಾಯಕ ಸಾಕ್ಷ್ಯಗಳು ಲಭ್ಯವಾಗಿಲ್ಲ. ಆಧಾರವಿಲ್ಲದೆ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.`;
    whatsappNoteHi = `🔍 *ट्रूथलेन्स फैक्ट चेक: सत्यापन लंबित*\n\n*दावा:* ${cleanedTitle}\n*स्थिति:* पर्याप्त निर्णायक साक्ष्य उपलब्ध नहीं हैं। पुष्टि होने तक प्रतीक्षा करें।`;

    if (isSearchApiFailure) {
      redFlags.push('Live evidence search encountered a service timeout or network failure');
    } else if (isFuturePrediction) {
      redFlags.push('Future prediction or forecast cannot be verified as an established factual event');
    } else if (isVagueUnnamedClaim) {
      redFlags.push('Claim uses generic unnamed actors without verifiable identities, dates, or locations');
    } else if (hasPartialSubClaimSupport) {
      redFlags.push('Multi-part claim has partial support only; critical scope/date conditions remain unverified');
    } else if (hasConflict) {
      redFlags.push('Retrieved credible sources present conflicting facts requiring authoritative clarification');
    } else {
      redFlags.push('Insufficient credible corroboration or contradiction retrieved to issue TRUE NEWS or FALSE NEWS');
    }
  }

  return {
    summary: { en: summaryEn, kn: summaryKn, hi: summaryHi },
    debunkExplanation: { en: debunkEn, kn: debunkKn, hi: debunkHi },
    spokenAudioScript: { en: spokenAudioEn, kn: spokenAudioKn, hi: spokenAudioHi },
    whatsappDebunkNote: { en: whatsappNoteEn, kn: whatsappNoteKn, hi: whatsappNoteHi },
    redFlags,
  };
}

function getVerdictLabel(status: ClearVerdictStatus, hasConflict: boolean = false): string {
  switch (status) {
    case 'REAL':
      return 'TRUE NEWS • Verified by Evidence';
    case 'FAKE':
      return 'FALSE NEWS • Contradicted by Evidence';
    case 'UNVERIFIED':
    default:
      return hasConflict
        ? 'Verification Pending • Conflicting Evidence'
        : 'Verification Pending • Insufficient Evidence';
  }
}

function getVerdictSubtitle(
  status: ClearVerdictStatus,
  hasConflict: boolean = false,
  isSearchApiFailure: boolean = false
): string {
  switch (status) {
    case 'REAL':
      return 'Retrieved credible official, news, or reference sources corroborate the core facts of this claim.';
    case 'FAKE':
      return 'Credible retrieved records or scam indicators directly contradict the core facts of this claim.';
    case 'UNVERIFIED':
    default:
      if (isSearchApiFailure) {
        return 'Live evidence retrieval was interrupted. Verification remains pending without inventing a verdict.';
      }
      if (hasConflict) {
        return 'Retrieved credible sources contain conflicting information; verification remains pending.';
      }
      return 'Insufficient credible evidence retrieved to classify as True News or False News. Absence of evidence is not falsity.';
  }
}
