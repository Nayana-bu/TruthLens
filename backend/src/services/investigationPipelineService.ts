import type {
  ClaimDossier,
  ClearVerdictStatus,
  EvidenceSource,
  SubmissionMode,
  VerdictType,
} from '../types.ts';
import { analyzeClaimText } from './claimAnalyzer.ts';
import {
  executeMultiQuerySearch,
  extractClaimsAndEntities,
  buildEvidenceAnalysisAndScoring,
  aggregateEvidenceContext,
  classifySourceCredibility,
  sanitizeExternalUrl,
  type SearchResultItem,
} from './ragEngine.ts';
import { queryVectorDocuments, upsertVectorDocuments } from '../db/vectorStore.ts';
import { fetchSafeUrlArticleContext } from './urlExtractorService.ts';
import {
  getGeminiClient,
  applyDenseEmbeddingRerank,
  applyNeuralCrossEncoderAndNLI,
  generateGroundedVerificationWithGemini,
} from './geminiService.ts';

function mapStanceToSourceStatus(
  stance?: 'supports' | 'contradicts' | 'neutral' | 'irrelevant' | 'contextual'
): 'confirmed' | 'refuted' | 'corroborated' | 'unverified' | 'contradicted' {
  if (stance === 'supports') return 'confirmed';
  if (stance === 'contradicts') return 'contradicted';
  return 'unverified';
}

function mapVerdictToClearStatus(verdict: VerdictType): ClearVerdictStatus {
  if (verdict === 'verified_true') return 'REAL';
  if (verdict === 'false') return 'FAKE';
  return 'UNVERIFIED';
}

function buildTruthLensPrompt(
  claimText: string,
  ragEvidenceContextText: string,
  todayFormatted: string,
  normalizedQuery?: string
): string {
  return `
You are TruthLens Verify, an elite evidence-based civic fact-checking engine with access to live Google Search data and retrieved RAG context.
Today's date is: ${todayFormatted}.

Analyze the following user submission (understanding spelling mistakes, grammar mistakes, incomplete sentences, and Kannada/Hindi/English phrasing while NEVER changing the factual meaning or negation):
ORIGINAL INPUT: "${claimText}"
${normalizedQuery && normalizedQuery !== claimText ? `NORMALIZED QUERY UNDERSTANDING: "${normalizedQuery}"` : ''}

RETRIEVED RAG LIVE WEB EVIDENCE CONTEXT:
${ragEvidenceContextText}

STRICT VERDICT & FACT-CHECKING RULES:
TruthLens classifies verified news into ONLY TWO final verified categories, plus a Verification Pending state when evidence is insufficient or conflicting:
1. "verified_true" (clearVerdictStatus: "REAL", Display: "TRUE NEWS"):
   - Issue ONLY when sufficient credible evidence (official government websites, recognized fact-checking organizations, accredited news publications, or established encyclopedias) actively corroborates the important parts of the claim (people, roles, event dates, quantities, locations), OR accurately answers a factual question.
   - NEVER classify as "verified_true" based solely on shared keywords or unreliable secondary blogs if the subject, office-holder, numeric figure, date, location, or negation conflicts with evidence!
2. "false" (clearVerdictStatus: "FAKE", Display: "FALSE NEWS"):
   - Issue ONLY when sufficient credible evidence directly contradicts the important parts of the claim (wrong person/role, wrong date/year/quantity, active scam/hoax, recycled/outdated circular debunked as false, or false negation).
   - NEVER classify news as "false" merely because evidence cannot be found!
3. "unverified" (clearVerdictStatus: "UNVERIFIED", Display: "Verification Pending"):
   - Issue when credible evidence is insufficient, inconclusive, or genuinely conflicting across credible sources. Explain clearly why verification is pending without inventing a verdict.
   - Conversely, NEVER return "unverified" when the retrieved RAG context or live Google Search results already corroborate or contradict the core claim.

ANTI-HALLUCINATION & CITATION GROUNDING RULES (CRITICAL):
- LIVE RETRIEVAL OVER PRE-CUTOFF MEMORY: Today is ${todayFormatted}. Your internal pre-cutoff training memory about current officeholders (Presidents, Prime Ministers, Chief Ministers, Mayors, CEOs), recent state visits, treaties, budgets, train/metro openings, or recent events may be OUTDATED. Whenever the RETRIEVED RAG LIVE WEB EVIDENCE CONTEXT or live Google Search results from ${new Date().getFullYear()} state a person's current office or confirm a recent event, you MUST treat the live retrieved evidence as authoritative truth over stale memory.
- NEVER FABRICATE URLS OR DATES: Only include a "url" in "sources" if that exact http/https URL appeared in the retrieved RAG context or Google Search results. If no verified URL exists for a source, omit "url" (leave empty) rather than guessing or inventing a link.
- EXPLICIT 3-WAY SOURCE SEPARATION: Label each source's "status" strictly as "confirmed" (actively supports core claim), "contradicted" (actively refutes core claim), or "unverified" (neutral/background information that neither confirms nor refutes).
- Respect publication dates, event dates, locations, and contextual differences. Distinguish breaking/recent unconfirmed events from proven falsehoods.
- CONTEXTUAL SEMANTIC & NLI REASONING (CRITICAL):
  * Evaluate exact meaning, tense, modality, negation, actor-patient roles, and exclusive vs non-exclusive quantities rather than keyword overlap.
  * "Is expecting twins" or "announced pregnancy" is NEUTRAL (unverified) for "gave birth to twins"—never treat pregnancy/expectation as confirming birth, and never treat a bare ambiguous single mention ("a baby boy" alone) as contradicting "twins".
  * Specific single-birth reports combining first-child/baby-boy-or-girl/named-baby (e.g., "welcomes first child, baby boy Dev" or "welcome baby boy, name him Dev") or exclusive statements ("only one child", "not twins"), reversed roles, opposite polarity on the same event, or wrong years/quantities MUST be classified as "false" (CONTRADICTION).
  * Sarcasm, irony, unresolved pronouns, or unconfirmed rumors without authoritative resolution must be "unverified" (never rubber-stamped "verified_true").
- MANDATORY EXPLANATION FORMAT FOR "false" (FALSE NEWS) VERDICTS (APPLIES TO ALL NEWS):
  * Whenever the verdict is "false", summaryEn/summaryKn/summaryHi, debunkExplanationEn/debunkExplanationKn/debunkExplanationHi, and spokenAudioScript* MUST explicitly include BOTH:
    (1) WHY the claim is false (identify the exact factual discrepancy: e.g., wrong count/quantity, wrong date/year, wrong person/role, wrong number/amount, or debunked hoax), AND
    (2) WHAT THE TRUE NEWS / VERIFIED FACTS ARE from the retrieved credible resources (cite the retrieved source names, publication dates, and actual verified facts—never invent details not in retrieved evidence).

CONFIDENCE SCORE RULES:
- Calibrated 85-95%: Multiple independent credible sources confirm or contradict.
- Calibrated 65-84%: Credible primary/accredited corroboration or contradiction.
- Calibrated 35-55%: Verification pending due to insufficient or conflicting evidence.
- NEVER hardcode 99%.

Return ONLY a valid JSON object in a \`\`\`json ... \`\`\` code fence with the following structure:
{
  "title": "Clear concise headline of the claim",
  "verdict": "verified_true" | "false" | "unverified",
  "clearVerdictStatus": "REAL" | "FAKE" | "UNVERIFIED",
  "verdictLabel": "TRUE NEWS • Verified by Evidence" | "FALSE NEWS • Contradicted by Evidence" | "Verification Pending • Insufficient or Conflicting Evidence",
  "verdictSubtitle": "Brief evidence-based explanation of the verdict basis",
  "confidenceScore": 89.5,
  "category": "governance" | "space" | "weather" | "health" | "phishing" | "general",
  "sourceEntity": "Name of relevant primary official body, news publication, or fact check desk",
  "summaryEn": "English summary stating verdict, why the claim is false (if false), and the true verified news from retrieved sources",
  "summaryKn": "ಕನ್ನಡ ಸಾರಾಂಶ - ಸುಳ್ಳಾದರೆ ಕಾರಣ ಮತ್ತು ವಿಶ್ವಾಸಾರ್ಹ ಮೂಲಗಳ ನಿಜವಾದ ಸುದ್ದಿಯ ವಿವರ",
  "summaryHi": "हिन्दी सारांश - झूठा होने का कारण और विश्वसनीय स्रोतों से सही खबर का विवरण",
  "debunkExplanationEn": "Comprehensive English explanation covering: (1) Why the claim is true/false/pending, (2) What the true news and verified facts are from the retrieved sources with names and dates, and (3) Evidence comparison",
  "debunkExplanationKn": "ಕನ್ನಡ ವಿವರಣೆ - ಏಕೆ ಸತ್ಯ/ಸುಳ್ಳು ಮತ್ತು ವಿಶ್ವಾಸಾರ್ಹ ಮೂಲಗಳ ಪ್ರಕಾರ ನಿಜವಾದ ಸುದ್ದಿ ಏನು ಎಂಬುದರ ಸ್ಪಷ್ಟ ವಿವರಣೆ",
  "debunkExplanationHi": "हिन्दी विवरण - दावा क्यों सही/गलत है और विश्वसनीय स्रोतों के अनुसार असली खबर क्या है",
  "spokenAudioScriptEn": "Natural English script explaining the verdict, why it is false (if false), and the true news from retrieved resources",
  "spokenAudioScriptKn": "ನೈಸರ್ಗಿಕ ಕನ್ನಡ ಧ್ವನಿ ವಿವರಣೆ",
  "spokenAudioScriptHi": "प्राकृतिक हिन्दी ध्वनि विवरण",
  "whatsappDebunkNoteEn": "Concise factual verification note in English stating verdict, reason, and true facts",
  "whatsappDebunkNoteKn": "ಕನ್ನಡ ಪರಿಶೀಲನಾ ಟಿಪ್ಪಣಿ",
  "whatsappDebunkNoteHi": "हिन्दी सत्यापन नोट",
  "redFlags": ["specific evidence finding or limitation 1", "evidence finding 2"],
  "officialRefId": "TL-VERIFY-XXXX",
  "sources": [
    {
      "name": "Specific source name",
      "category": "Official Government / Fact-Check Bureau / Accredited News",
      "status": "confirmed" | "contradicted" | "unverified",
      "details": "What specific evidence this source provides",
      "url": "exact retrieved https:// URL or omit if unavailable",
      "publicationDate": "Published date from source if available"
    }
  ]
}
`;
}

export async function runInvestigationPipeline(params: {
  rawInputText: string;
  mode: SubmissionMode;
  imageBase64?: string;
  imageName?: string;
  fixedId?: string;
}): Promise<{
  dossier: ClaimDossier;
  extractedText: string;
  searchStatus: 'operational' | 'fallback_archive' | 'error_reported';
}> {
  const { rawInputText, mode, imageBase64, imageName, fixedId } = params;
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  // Step 0: URL article/PDF extraction if applicable
  let extraRetrievedItems: SearchResultItem[] = [];
  let effectiveAnalysisText = rawInputText;
  const ragLimitations: string[] = [];
  let urlExtractionFailed = false;
  const trimmedInput = rawInputText.trim();
  const isUrlInput = mode === 'url' || /^https?:\/\/\S+$/i.test(trimmedInput);

  if (isUrlInput) {
    const urlRes = await fetchSafeUrlArticleContext(trimmedInput);
    if ((urlRes.status === 'html_extracted' || urlRes.status === 'pdf_extracted') && urlRes.context) {
      effectiveAnalysisText = urlRes.context.extractedClaimText;
      extraRetrievedItems = [urlRes.context.articleItem];
      console.log(
        `[TRUTHLENS-URL] (${urlRes.status}) Extracted content for RAG: "${effectiveAnalysisText.slice(0, 100)}"`
      );
    } else {
      urlExtractionFailed = true;
      const reasonMsg = urlRes.reason || 'Could not retrieve or parse readable content from the submitted URL.';
      ragLimitations.push(reasonMsg);
      console.log(`[TRUTHLENS-URL] (${urlRes.status}) URL retrieval failed: ${reasonMsg}`);
    }
  }

  // Step 1: Query preprocessing, claim extraction, and entity NER
  const ragInput = extractClaimsAndEntities(effectiveAnalysisText, mode, imageName);
  console.log(
    `[TRUTHLENS-RAG] Normalized query (${ragInput.detectedLanguage}): "${ragInput.normalizedQuery.slice(0, 120)}"`
  );
  console.log(
    `[TRUTHLENS-RAG] Extracted ${ragInput.extractedClaims.length} atomic factual sub-claims, ` +
      `${ragInput.extractedEntities.organizations.length} orgs, ${ragInput.extractedEntities.dates.length} dates`
  );

  // Step 1.5: Query persistent local vector index
  const isCurrentOrBreaking =
    ragInput.preprocessed.claimMeta?.temporalIntent === 'current_present' ||
    ragInput.preprocessed.claimMeta?.temporalIntent === 'recent_news';
  let vectorHitsCount = 0;

  if (!urlExtractionFailed && effectiveAnalysisText && effectiveAnalysisText.length > 2 && !ragInput.isOcrFailureOrEmpty) {
    const vecQuery = queryVectorDocuments(ragInput.normalizedQuery, {
      topK: 4,
      minSimilarity: 0.42,
      isCurrentOrBreakingClaim: isCurrentOrBreaking,
    });
    if (vecQuery.error) {
      ragLimitations.push(`Vector index notice: ${vecQuery.error}`);
    }
    if (vecQuery.hits.length > 0) {
      vectorHitsCount = vecQuery.hits.length;
      for (const hit of vecQuery.hits) {
        const e = hit.entry;
        extraRetrievedItems.push({
          title: e.title,
          url: e.url,
          snippet: e.text,
          publicationDate: e.publicationDate,
          sourceName: e.sourceName,
          category: e.category,
          isPrimary: e.isPrimary,
          credibilityTier: e.credibilityTier,
          temporalStatus: e.temporalStatus,
        });
      }
      console.log(`[TRUTHLENS-VECTOR] Retrieved ${vecQuery.hits.length} cached vector chunks (${vecQuery.vectorDbStatus})`);
    }
  }

  // Step 2: Live multi-query web search, reranking, NLI cross-encoding, and vector store upsert
  let searchOutput: {
    results: SearchResultItem[];
    searchProviderStatus: 'operational' | 'fallback_archive' | 'error_reported';
    queryCount: number;
    deduplicatedCount: number;
    filteredIrrelevantCount: number;
    queriesRun: string[];
    cragIterations?: number;
    cragTrace?: string[];
    insufficiencyReason?: string;
  } = {
    results: [],
    searchProviderStatus: 'operational',
    queryCount: 1,
    deduplicatedCount: 0,
    filteredIrrelevantCount: 0,
    queriesRun: [],
    cragIterations: 0,
    cragTrace: [],
  };

  if (!urlExtractionFailed && effectiveAnalysisText && effectiveAnalysisText.length > 2 && !ragInput.isOcrFailureOrEmpty) {
    searchOutput = await executeMultiQuerySearch(
      ragInput.extractedClaims,
      ragInput.extractedEntities,
      effectiveAnalysisText,
      ragInput.preprocessed,
      extraRetrievedItems
    );

    let denseEmbeddingsMap = new Map<string, number[]>();
    if (searchOutput.results.length > 0) {
      const reranked = await applyDenseEmbeddingRerank(
        ragInput.preprocessed.normalizedQuery,
        searchOutput.results
      );
      searchOutput.results = reranked.results;
      denseEmbeddingsMap = reranked.denseEmbeddingsMap;
      if (reranked.embeddingError) {
        ragLimitations.push(reranked.embeddingError);
      }

      const nliReranked = await applyNeuralCrossEncoderAndNLI(
        ragInput.preprocessed.normalizedQuery,
        ragInput.preprocessed.semanticFrame,
        searchOutput.results
      );
      searchOutput.results = nliReranked.results;
      if (nliReranked.nliNote) {
        ragLimitations.push(nliReranked.nliNote);
      }

      const vecUpsert = upsertVectorDocuments(searchOutput.results, denseEmbeddingsMap);
      if (!vecUpsert.persisted && vecUpsert.error) {
        ragLimitations.push(`Vector store persistence warning: ${vecUpsert.error}`);
      }
    }

    console.log(
      `[TRUTHLENS-RAG] Live web search executed ${searchOutput.queryCount} queries (${searchOutput.cragIterations || 1} CRAG pass(es)), ` +
        `kept ${searchOutput.results.length} relevant excerpts (${searchOutput.deduplicatedCount} deduplicated, ${searchOutput.filteredIrrelevantCount || 0} irrelevant filtered)`
    );
  } else if (urlExtractionFailed) {
    searchOutput.searchProviderStatus = 'error_reported';
  }

  // Step 3: Build local RAG baseline dossier
  const retrievedTimestamp = new Date().toISOString();
  const liveWebSources: EvidenceSource[] = searchOutput.results.map((r: SearchResultItem) => {
    const safeUrl = sanitizeExternalUrl(r.url);
    const cred = classifySourceCredibility(safeUrl || '', r.sourceName);
    return {
      name: r.sourceName,
      category: r.category,
      status: mapStanceToSourceStatus(r.stance),
      details: r.snippet,
      url: safeUrl,
      timestamp: 'Just verified',
      publicationDate: r.publicationDate || todayFormatted,
      retrievedAt: r.retrievedAt || retrievedTimestamp,
      isPrimary: r.isPrimary,
      credibilityTier: r.credibilityTier,
      credibilityLabel: r.credibilityLabel || cred.categoryLabel,
      accessStatus: safeUrl ? 'accessible' : 'unaccessible',
      nliLabel: r.nliLabel,
      nliConfidence: r.nliConfidence,
      nliReason: r.nliReason,
    };
  });

  const localDossier = analyzeClaimText(
    effectiveAnalysisText || `[Attached Screenshot: ${imageName || 'Evidence'}]`,
    mode,
    imageName,
    liveWebSources.length > 0 ? liveWebSources : undefined,
    searchOutput.results,
    {
      ragLimitations,
      vectorHitsCount,
      cragIterations: searchOutput.cragIterations,
      cragTrace: searchOutput.cragTrace,
      insufficiencyReason: searchOutput.insufficiencyReason,
      irrelevantFilteredCount: searchOutput.filteredIrrelevantCount,
      deduplicatedCount: searchOutput.deduplicatedCount,
      searchQueryCount: searchOutput.queryCount,
    }
  );

  if (urlExtractionFailed) {
    localDossier.verdict = 'unverified';
    localDossier.clearVerdictStatus = 'UNVERIFIED';
    localDossier.verdictLabel = 'Verification Pending • Link Unreadable';
    localDossier.verdictSubtitle =
      ragLimitations[0] || 'Could not retrieve or parse content from the submitted URL.';
    localDossier.verifiedAt = retrievedTimestamp;
    localDossier.summary.en = `VERIFICATION PENDING: ${localDossier.verdictSubtitle} TruthLens does not classify a claim as false merely because a webpage or PDF could not be accessed.`;
    localDossier.debunkExplanation.en = `${localDossier.verdictSubtitle} Please verify the link is publicly reachable or paste the article text directly.`;
    localDossier.sources = [];
    localDossier.evidenceAnalysis = buildEvidenceAnalysisAndScoring(
      rawInputText,
      'unverified',
      [],
      [],
      'error_reported',
      0,
      0,
      {
        extraLimitations: ragLimitations,
        cragIterations: 0,
        cragTrace: ['URL inspection blocked or unavailable before web retrieval'],
        insufficiencyReason: localDossier.verdictSubtitle,
        irrelevantFilteredCount: 0,
      }
    );
  }

  if (rawInputText && localDossier.originalClaim !== rawInputText) {
    localDossier.originalClaim = rawInputText;
  }

  console.log(
    `[TRUTHLENS-ENGINE] Baseline RAG evaluation: ${localDossier.verdict} (${localDossier.clearVerdictStatus}), calibrated score: ${localDossier.confidenceScore}%`
  );

  let finalDossier: ClaimDossier = localDossier;

  // Step 4: Gemini Search-Grounded Synthesis with anti-hallucination guardrails
  const ai = getGeminiClient();
  if (ai && !urlExtractionFailed) {
    try {
      console.log(`[TRUTHLENS-ENGINE] Calling Gemini 4 Hydrogen with Live RAG Context & Google Search Grounding...`);
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
      const timeoutPromise = new Promise<null>((resolve) => {
        timeoutHandle = setTimeout(() => {
          console.log(`[TRUTHLENS-ENGINE] Gemini grounding request exceeded 15s; using retrieved RAG forensic dossier.`);
          ragLimitations.push(
            'External AI synthesis exceeded 15s timeout; verdict reflects direct RAG evidence retrieval.'
          );
          resolve(null);
        }, 15000);
      });

      const ragEvidenceContextText = aggregateEvidenceContext(
        searchOutput.results,
        ragInput.extractedClaims,
        localDossier.sourceEntity,
        ragInput.preprocessed
      );

      const aiCall = (async () => {
        const promptText = buildTruthLensPrompt(
          effectiveAnalysisText || 'Investigate the attached screenshot image',
          ragEvidenceContextText,
          todayFormatted,
          ragInput.normalizedQuery
        );

        const contents: any[] = [];
        if (imageBase64) {
          const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
          contents.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data,
            },
          });
        }
        contents.push({ text: promptText });

        const { geminiRes, notes } = await generateGroundedVerificationWithGemini(contents);
        if (notes.length > 0) ragLimitations.push(...notes);
        if (!geminiRes) return null;

        const candidate = geminiRes.candidates?.[0];
        const groundingMetadata = candidate?.groundingMetadata;
        const groundingChunks = groundingMetadata?.groundingChunks || [];
        const webSearchQueries = groundingMetadata?.webSearchQueries || [];

        console.log(`[TRUTHLENS-ENGINE] Google Search queries run: ${JSON.stringify(webSearchQueries)}`);
        console.log(`[TRUTHLENS-ENGINE] Grounding chunks returned: ${groundingChunks.length}`);

        const rawText = geminiRes.text || '';
        const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, rawText];
        let parsedData: any = {};
        try {
          parsedData = JSON.parse(jsonMatch[1].trim());
        } catch {
          const firstBrace = rawText.indexOf('{');
          const lastBrace = rawText.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            try {
              parsedData = JSON.parse(rawText.substring(firstBrace, lastBrace + 1));
            } catch {
              console.log(`[TRUTHLENS-ENGINE] JSON parse fallback failure on raw output`);
            }
          }
        }

        const parsedVerdictRaw = String(parsedData.verdict || '').toLowerCase();
        const searchSources: EvidenceSource[] = groundingChunks
          .filter((c: any) => sanitizeExternalUrl(c.web?.uri))
          .map((c: any) => {
            const safeUrl = sanitizeExternalUrl(c.web.uri);
            const cred = classifySourceCredibility(safeUrl || '', c.web.title || '');
            return {
              name: c.web.title || 'Live Search Grounded Evidence',
              category: 'Live Google Search Data',
              status:
                parsedVerdictRaw === 'verified_true' || parsedData.clearVerdictStatus === 'REAL'
                  ? 'confirmed'
                  : parsedVerdictRaw === 'false' || parsedData.clearVerdictStatus === 'FAKE'
                  ? 'contradicted'
                  : 'unverified',
              details: `Live citation verified via search index (${c.web.title || safeUrl})`,
              url: safeUrl,
              publicationDate: todayFormatted,
              retrievedAt: new Date().toISOString(),
              isPrimary: cred.isPrimary,
              credibilityTier: cred.credibilityTier,
              credibilityLabel: cred.categoryLabel,
              accessStatus: safeUrl ? 'accessible' : 'unaccessible',
            };
          });

        return {
          parsed: parsedData,
          searchSources,
          webSearchQueries,
        };
      })();

      const result = (await Promise.race([aiCall, timeoutPromise])) as any;
      if (timeoutHandle) clearTimeout(timeoutHandle);

      if (result && result.parsed && (result.parsed.verdict || result.parsed.title)) {
        const { parsed, searchSources, webSearchQueries } = result;
        const sanitizedParsedSources: EvidenceSource[] = (Array.isArray(parsed.sources) ? parsed.sources : [])
          .filter((s: any) => s && typeof s.name === 'string' && typeof s.details === 'string')
          .map((s: any) => {
            const safeUrl = sanitizeExternalUrl(typeof s.url === 'string' ? s.url : undefined);
            const cred = classifySourceCredibility(safeUrl || '', s.name);
            return {
              name: String(s.name).slice(0, 140),
              category: typeof s.category === 'string' ? s.category : cred.categoryLabel,
              status:
                s.status === 'confirmed' ||
                s.status === 'corroborated' ||
                s.status === 'refuted' ||
                s.status === 'contradicted'
                  ? s.status
                  : 'unverified',
              details: String(s.details).slice(0, 600),
              url: safeUrl,
              publicationDate:
                typeof s.publicationDate === 'string' && s.publicationDate.trim()
                  ? s.publicationDate.trim()
                  : undefined,
              retrievedAt: new Date().toISOString(),
              isPrimary: cred.isPrimary,
              credibilityTier: cred.credibilityTier,
              credibilityLabel: cred.categoryLabel,
              accessStatus: safeUrl ? 'accessible' : 'unaccessible',
            };
          });

        const combinedSources: EvidenceSource[] = [
          ...sanitizedParsedSources,
          ...searchSources,
          ...liveWebSources,
        ];

        let resolvedVerdict: VerdictType = localDossier.verdict;
        const llmVerdictRaw = String(parsed.verdict || '').toLowerCase();

        if (llmVerdictRaw === 'verified_true') {
          resolvedVerdict = 'verified_true';
        } else if (llmVerdictRaw === 'false') {
          resolvedVerdict = 'false';
        } else if (llmVerdictRaw === 'misleading') {
          resolvedVerdict = localDossier.verdict === 'false' ? 'false' : 'unverified';
        } else if (
          llmVerdictRaw === 'partly_true' ||
          llmVerdictRaw === 'context_missing' ||
          llmVerdictRaw === 'unverified'
        ) {
          resolvedVerdict = 'unverified';
        }

        const strongSupportSignals = searchOutput.results.filter(
          (r: SearchResultItem) => r.stance === 'supports' && r.credibilityTier !== 'secondary_web'
        );
        const strongContradictSignals = searchOutput.results.filter(
          (r: SearchResultItem) =>
            r.stance === 'contradicts' &&
            (r.credibilityTier !== 'secondary_web' || (r.relevanceScore || 0) >= 0.65)
        );
        const credibleGroundingChunks = searchSources.filter(
          (s: EvidenceSource) => s.credibilityTier !== 'secondary_web'
        );

        let overrideToLocalRag = false;

        // Guard 1
        if (
          resolvedVerdict === 'unverified' &&
          localDossier.verdict !== 'unverified' &&
          (strongSupportSignals.length > 0 || strongContradictSignals.length > 0)
        ) {
          console.log(
            `[TRUTHLENS-RAG] Preventing false UNVERIFIED: credible RAG evidence supports '${localDossier.verdict}'`
          );
          resolvedVerdict = localDossier.verdict;
          overrideToLocalRag = true;
        }

        // Guard 2
        if (
          resolvedVerdict === 'verified_true' &&
          strongContradictSignals.length > 0 &&
          strongSupportSignals.length === 0 &&
          localDossier.verdict !== 'verified_true'
        ) {
          console.log(
            `[TRUTHLENS-RAG] Overriding LLM 'verified_true': RAG detected direct credible contradiction (${localDossier.verdict})`
          );
          resolvedVerdict = localDossier.verdict;
          overrideToLocalRag = true;
        }

        // Guard 3
        if (
          resolvedVerdict === 'verified_true' &&
          strongSupportSignals.length === 0 &&
          credibleGroundingChunks.length === 0 &&
          localDossier.verdict !== 'verified_true' &&
          !imageBase64
        ) {
          console.log(
            `[TRUTHLENS-RAG] Downgrading ungrounded LLM 'verified_true' to Verification Pending ('unverified')`
          );
          resolvedVerdict = 'unverified';
          overrideToLocalRag = true;
        }

        // Guard 4
        if (
          resolvedVerdict === 'verified_true' &&
          (ragInput.preprocessed.claimMeta?.isFuturePrediction ||
            ragInput.preprocessed.claimMeta?.isVagueUnnamedClaim ||
            ragInput.preprocessed.isSarcastic)
        ) {
          resolvedVerdict = 'unverified';
          overrideToLocalRag = true;
        }

        // Guard 5
        if (
          (resolvedVerdict === 'false' || llmVerdictRaw === 'misleading' || llmVerdictRaw === 'partly_true') &&
          localDossier.verdict === 'verified_true' &&
          strongSupportSignals.length >= 1 &&
          strongContradictSignals.length === 0
        ) {
          console.log(
            `[TRUTHLENS-RAG] Guard 5 triggered: overriding LLM '${llmVerdictRaw}' back to 'verified_true' (credible RAG corroboration with 0 contradictions)`
          );
          resolvedVerdict = 'verified_true';
          overrideToLocalRag = true;
        } else if (
          resolvedVerdict === 'false' &&
          localDossier.verdict === 'unverified' &&
          strongContradictSignals.length === 0 &&
          !imageBase64
        ) {
          const hasExternalContradictingSource =
            credibleGroundingChunks.length > 0 ||
            (Array.isArray(parsed.sources) &&
              parsed.sources.some(
                (s: any) =>
                  typeof s?.url === 'string' &&
                  /^https?:\/\//.test(s.url) &&
                  (s.status === 'contradicted' || s.status === 'refuted')
              ));
          if (!hasExternalContradictingSource) {
            console.log(
              `[TRUTHLENS-RAG] Guard 5 triggered: blocking ungrounded LLM 'false' with zero retrieved contradicting URLs -> 'unverified'`
            );
            resolvedVerdict = 'unverified';
            overrideToLocalRag = true;
          }
        }

        const resolvedClearStatus = mapVerdictToClearStatus(resolvedVerdict);
        const safeSources: EvidenceSource[] = overrideToLocalRag
          ? [
              ...localDossier.sources,
              ...searchSources
                .filter(
                  (s: EvidenceSource) =>
                    !localDossier.sources.some((ls) => ls.url && s.url && ls.url === s.url)
                )
                .map((s: EvidenceSource) => ({
                  ...s,
                  status: (resolvedVerdict === 'verified_true'
                    ? 'confirmed'
                    : resolvedVerdict === 'false'
                    ? 'contradicted'
                    : 'unverified') as EvidenceSource['status'],
                })),
            ]
          : combinedSources;

        const evidenceAnalysis = buildEvidenceAnalysisAndScoring(
          parsed.title || localDossier.title,
          resolvedVerdict,
          safeSources,
          searchOutput.results,
          searchOutput.searchProviderStatus,
          searchOutput.queryCount + webSearchQueries.length,
          searchOutput.deduplicatedCount,
          {
            extraLimitations: ragLimitations,
            missingContext: localDossier.evidenceAnalysis?.missingContext,
            hasOutdatedEvidence: searchOutput.results.some((r) => r.temporalStatus === 'outdated'),
            isFuturePrediction: ragInput.preprocessed.claimMeta?.isFuturePrediction,
            isVagueUnnamedClaim: ragInput.preprocessed.claimMeta?.isVagueUnnamedClaim,
            isAllegationOnly: ragInput.preprocessed.claimMeta?.isAllegationOnly,
            irrelevantFilteredCount: searchOutput.filteredIrrelevantCount,
            cragIterations: searchOutput.cragIterations,
            cragTrace: searchOutput.cragTrace,
            insufficiencyReason: searchOutput.insufficiencyReason,
          }
        );

        const verifiedTimestamp = new Date().toISOString();

        finalDossier = {
          id: fixedId || `TL-INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
          title: parsed.title || localDossier.title,
          originalClaim: rawInputText || localDossier.originalClaim,
          verdict: resolvedVerdict,
          verdictLabel: overrideToLocalRag
            ? localDossier.verdictLabel
            : parsed.verdictLabel || localDossier.verdictLabel,
          verdictSubtitle: overrideToLocalRag
            ? localDossier.verdictSubtitle
            : parsed.verdictSubtitle || localDossier.verdictSubtitle,
          confidenceScore: evidenceAnalysis.criteriaScore,
          timeAgo: 'Just verified',
          verifiedAt: verifiedTimestamp,
          category: parsed.category || localDossier.category,
          sourceEntity: parsed.sourceEntity || localDossier.sourceEntity,
          languages: ['en', 'kn', 'hi'],
          clearVerdictStatus: resolvedClearStatus,
          summary: overrideToLocalRag
            ? localDossier.summary
            : {
                en: parsed.summaryEn || localDossier.summary.en,
                kn: parsed.summaryKn || localDossier.summary.kn,
                hi: parsed.summaryHi || localDossier.summary.hi,
              },
          debunkExplanation: overrideToLocalRag
            ? localDossier.debunkExplanation
            : {
                en: parsed.debunkExplanationEn || localDossier.debunkExplanation.en,
                kn: parsed.debunkExplanationKn || localDossier.debunkExplanation.kn,
                hi: parsed.debunkExplanationHi || localDossier.debunkExplanation.hi,
              },
          spokenAudioScript: overrideToLocalRag
            ? localDossier.spokenAudioScript
            : {
                kn: parsed.spokenAudioScriptKn || localDossier.spokenAudioScript.kn,
                hi: parsed.spokenAudioScriptHi || localDossier.spokenAudioScript.hi,
                en: parsed.spokenAudioScriptEn || localDossier.spokenAudioScript.en,
              },
          whatsappDebunkNote: overrideToLocalRag
            ? localDossier.whatsappDebunkNote
            : {
                en: parsed.whatsappDebunkNoteEn || localDossier.whatsappDebunkNote.en,
                kn: parsed.whatsappDebunkNoteKn || localDossier.whatsappDebunkNote.kn,
                hi: parsed.whatsappDebunkNoteHi || localDossier.whatsappDebunkNote.hi,
              },
          sources: safeSources,
          redFlags:
            Array.isArray(parsed.redFlags) && parsed.redFlags.length > 0 && !overrideToLocalRag
              ? parsed.redFlags
              : localDossier.redFlags,
          timeline: localDossier.timeline,
          originVector: localDossier.originVector,
          officialRefId: parsed.officialRefId || localDossier.officialRefId,
          groundingInfo: {
            isGrounded: combinedSources.some((s) => Boolean(sanitizeExternalUrl(s.url))),
            queries: Array.from(
              new Set([...(webSearchQueries || []), ...(searchOutput.queriesRun || [])])
            ).slice(0, 6),
            sources: combinedSources
              .filter((s) => Boolean(sanitizeExternalUrl(s.url)))
              .map((s) => ({ title: s.name, uri: sanitizeExternalUrl(s.url)! })),
          },
          extractedClaims: localDossier.extractedClaims || ragInput.extractedClaims,
          extractedEntities: ragInput.extractedEntities,
          semanticFrame: ragInput.preprocessed.semanticFrame,
          evidenceAnalysis,
          evidenceStrength: evidenceAnalysis.evidenceStrengthLabel,
          submissionMode: mode,
        };
      }
    } catch (geminiError: any) {
      console.log(
        `[TRUTHLENS-ENGINE] Gemini Search Grounding error or timeout: ${geminiError?.message || geminiError}`
      );
      ragLimitations.push(
        'External AI grounding call encountered an error; dossier uses retrieved live web & vector RAG evidence.'
      );
    }
  }

  if (ragLimitations.length > 0 && finalDossier.evidenceAnalysis) {
    finalDossier.evidenceAnalysis.limitationsAndUnresolved = Array.from(
      new Set([...(finalDossier.evidenceAnalysis.limitationsAndUnresolved || []), ...ragLimitations])
    );
  }

  if (fixedId) {
    finalDossier.id = fixedId;
  } else if (!finalDossier.id || finalDossier.id.startsWith('modi-') || finalDossier.id === 'unknown') {
    finalDossier.id = `TL-INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const extractedText =
    ragInput.extractedClaims.map((c) => c.claim).join('\n') || effectiveAnalysisText || rawInputText;

  return {
    dossier: finalDossier,
    extractedText,
    searchStatus: searchOutput.searchProviderStatus,
  };
}
