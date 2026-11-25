import assert from 'node:assert/strict';
import {
  extractClaimsAndEntities,
  executeMultiQuerySearch,
  sanitizeExternalUrl,
} from '../src/utils/ragEngine.ts';
import { analyzeClaimText } from '../src/utils/claimAnalyzer.ts';
import {
  computeHybridProjectionVector,
  cosineSimilarityVector,
} from '../src/utils/vectorStore.ts';
import type { ClearVerdictStatus, Language } from '../src/types.ts';

type EvalClass = 'REAL' | 'FAKE' | 'UNVERIFIED';

interface EvalCase {
  id: string;
  claim: string;
  category: string;
  language: Language;
  expectedVerdict: EvalClass;
  /** True when the claim asserts an established verifiable public fact or well-known debunked claim */
  expectPublicEvidence: boolean;
  /** Optional assertion checks */
  minSubClaims?: number;
  maxNotes?: string;
}

const EVAL_DATASET: EvalCase[] = [
  // 1. Politics & Government
  {
    id: 'POL-01',
    claim: 'Who is presdent of india',
    category: 'politics_governance',
    language: 'en',
    expectedVerdict: 'REAL',
    expectPublicEvidence: true,
  },
  {
    id: 'POL-02',
    claim: 'Siddaramaiah is the current Chief Minister of Karnataka',
    category: 'politics_governance',
    language: 'en',
    expectedVerdict: 'FAKE',
    expectPublicEvidence: true,
  },
  {
    id: 'POL-03',
    claim: 'Narendra Modi is not Prime Minister of India',
    category: 'politics_governance',
    language: 'en',
    expectedVerdict: 'FAKE',
    expectPublicEvidence: true,
  },
  {
    id: 'POL-04',
    claim: 'Supreme Court of India upheld abrogation of Article 370',
    category: 'politics_governance',
    language: 'en',
    expectedVerdict: 'REAL',
    expectPublicEvidence: true,
  },

  // 2. National & International News
  {
    id: 'INT-01',
    claim: 'Donald Trump is the current President of the United States',
    category: 'national_international',
    language: 'en',
    expectedVerdict: 'REAL',
    expectPublicEvidence: true,
  },
  {
    id: 'INT-02',
    claim: 'Joe Biden is the current President of the United States',
    category: 'national_international',
    language: 'en',
    expectedVerdict: 'FAKE',
    expectPublicEvidence: true,
  },
  {
    id: 'INT-03',
    claim: 'Elon Musk bought Google',
    category: 'national_international',
    language: 'en',
    expectedVerdict: 'UNVERIFIED',
    expectPublicEvidence: false,
  },
  {
    id: 'INT-04',
    claim:
      "India-Nepal Ties: India pledged $1.6 billion in flood relief for Nepal during Nepal Prime Minister Balendra Shah's visit to meet Prime Minister Narendra Modi. Leaders also flagged off a direct Ayodhya–Janakpur train link ahead of operations starting November 28",
    category: 'national_international',
    language: 'en',
    expectedVerdict: 'REAL',
    expectPublicEvidence: true,
    minSubClaims: 2,
  },
  {
    id: 'INT-05',
    claim:
      "India-Nepal Ties: India pledged $5.6 billion in flood relief for Nepal during Nepal Prime Minister Balendra Shah's visit to meet Prime Minister Narendra Modi. Leaders also flagged off a direct Ayodhya–Janakpur train link ahead of operations starting November 28",
    category: 'national_international',
    language: 'en',
    expectedVerdict: 'FAKE',
    expectPublicEvidence: true,
    minSubClaims: 2,
  },

  // 3. Sports
  {
    id: 'SPT-01',
    claim: 'Neeraj Chopra won silver medal at Paris Olympics 2024',
    category: 'sports',
    language: 'en',
    expectedVerdict: 'REAL',
    expectPublicEvidence: true,
  },
  {
    id: 'SPT-02',
    claim: 'Neeraj Chopra won gold medal at Paris Olympics 2024',
    category: 'sports',
    language: 'en',
    expectedVerdict: 'FAKE',
    expectPublicEvidence: true,
  },
  {
    id: 'SPT-03',
    claim: 'Virat Kohli retired from Test cricket in 2024',
    category: 'sports',
    language: 'en',
    expectedVerdict: 'FAKE',
    expectPublicEvidence: true,
  },

  // 4. Science & Technology
  {
    id: 'SCI-01',
    claim: 'isro chandrayan 3 landd on moon south pole',
    category: 'science_tech',
    language: 'en',
    expectedVerdict: 'REAL',
    expectPublicEvidence: true,
  },
  {
    id: 'SCI-02',
    claim: 'Chandrayaan-3 landed on the Moon in 2021',
    category: 'science_tech',
    language: 'en',
    expectedVerdict: 'FAKE',
    expectPublicEvidence: true,
  },
  {
    id: 'SCI-03',
    claim: 'Sundar Pichai is the CEO of Apple',
    category: 'science_tech',
    language: 'en',
    expectedVerdict: 'FAKE',
    expectPublicEvidence: true,
  },
  {
    id: 'SCI-04',
    claim: 'AI will replace 90 percent of human jobs by 2030',
    category: 'science_tech',
    language: 'en',
    expectedVerdict: 'UNVERIFIED',
    expectPublicEvidence: false,
  },

  // 5. Business & Economy
  {
    id: 'BIZ-01',
    claim: 'RBI launched 5000 rupee currency note in India',
    category: 'business_economy',
    language: 'en',
    expectedVerdict: 'FAKE',
    expectPublicEvidence: true,
  },
  {
    id: 'BIZ-02',
    claim: 'RBI kept repo rate unchanged at 6.5 percent in 2026',
    category: 'business_economy',
    language: 'en',
    expectedVerdict: 'UNVERIFIED',
    expectPublicEvidence: true,
  },

  // 6. Health & Medicine
  {
    id: 'HLT-01',
    claim: 'WHO declared mpox a public health emergency in 2024',
    category: 'health_medicine',
    language: 'en',
    expectedVerdict: 'REAL',
    expectPublicEvidence: true,
  },
  {
    id: 'HLT-02',
    claim: 'Drinking hot lemon water cures cancer according to WHO',
    category: 'health_medicine',
    language: 'en',
    expectedVerdict: 'FAKE',
    expectPublicEvidence: true,
  },

  // 7. Historical Events
  {
    id: 'HIS-01',
    claim: 'World War II ended in 1945',
    category: 'historical',
    language: 'en',
    expectedVerdict: 'REAL',
    expectPublicEvidence: true,
  },
  {
    id: 'HIS-02',
    claim: 'World War II ended in 1950',
    category: 'historical',
    language: 'en',
    expectedVerdict: 'FAKE',
    expectPublicEvidence: true,
  },

  // 8. Local & Regional News
  {
    id: 'REG-01',
    claim: 'pink line of bengaluru namma metro news',
    category: 'regional_local',
    language: 'en',
    expectedVerdict: 'REAL',
    expectPublicEvidence: true,
  },
  {
    id: 'REG-02',
    claim:
      'Pink Line Elevated Stretch Opens: The 7.5-km elevated stretch of the Pink Line between Kalena Agrahara and S.G. Palya was inaugurated on November 13 and opened to passengers on November 14, 2026',
    category: 'regional_local',
    language: 'en',
    expectedVerdict: 'REAL',
    expectPublicEvidence: true,
  },
  {
    id: 'REG-03',
    claim:
      'Pink Line Elevated Stretch Opens: The 15-km elevated stretch of the Pink Line between Kalena Agrahara and S.G. Palya opened on November 14, 2026',
    category: 'regional_local',
    language: 'en',
    expectedVerdict: 'FAKE',
    expectPublicEvidence: true,
  },
  {
    id: 'REG-04',
    claim: 'A resident in Chikmagalur found a 200-year-old silver crown in a coffee estate',
    category: 'regional_local',
    language: 'en',
    expectedVerdict: 'UNVERIFIED',
    expectPublicEvidence: false,
  },

  // 9. Government Schemes, Education & Informal Multi-Condition Claims
  {
    id: 'SCH-01',
    claim: 'Government giving free 5G smartphone to all students yojana',
    category: 'govt_schemes',
    language: 'en',
    expectedVerdict: 'FAKE',
    expectPublicEvidence: true,
  },
  {
    id: 'SCH-02',
    claim: 'The government announced a new scheme providing free internet to every student from December',
    category: 'education',
    language: 'en',
    expectedVerdict: 'UNVERIFIED',
    expectPublicEvidence: false,
    minSubClaims: 4,
  },
  {
    id: 'SCH-03',
    claim: 'bro is it true govrnment anouncedd free laptops for all college students??',
    category: 'education',
    language: 'en',
    expectedVerdict: 'FAKE',
    expectPublicEvidence: true,
  },

  // 10. Crime & Public Safety / Entertainment Vague Claim
  {
    id: 'CRM-01',
    claim: 'Police arrested famous actor in drug case',
    category: 'crime_safety',
    language: 'en',
    expectedVerdict: 'UNVERIFIED',
    expectPublicEvidence: false,
  },

  // 11. Weather & Natural Disasters
  {
    id: 'WTH-01',
    claim: 'Cyclone Dana made landfall in Odisha in October 2024',
    category: 'weather_disasters',
    language: 'en',
    expectedVerdict: 'REAL',
    expectPublicEvidence: true,
  },

  // 12. Multilingual (Kannada & Hindi)
  {
    id: 'KN-01',
    claim: 'ಭಾರತದ ರಾಷ್ಟ್ರಪತಿ ಯಾರು?',
    category: 'multilingual_kn',
    language: 'kn',
    expectedVerdict: 'REAL',
    expectPublicEvidence: true,
  },
  {
    id: 'KN-02',
    claim: 'ನರೇಂದ್ರ ಮೋದಿ ಭಾರತದ ಪ್ರಧಾನಮಂತ್ರಿ ಅಲ್ಲ',
    category: 'multilingual_kn',
    language: 'kn',
    expectedVerdict: 'FAKE',
    expectPublicEvidence: true,
  },
  {
    id: 'HI-01',
    claim: 'भारत के राष्ट्रपति कौन हैं?',
    category: 'multilingual_hi',
    language: 'hi',
    expectedVerdict: 'REAL',
    expectPublicEvidence: true,
  },
  {
    id: 'HI-02',
    claim: 'नरेंद्र मोदी भारत के प्रधानमंत्री नहीं हैं',
    category: 'multilingual_hi',
    language: 'hi',
    expectedVerdict: 'FAKE',
    expectPublicEvidence: true,
  },

  // 13. Additional Officeholder, Sports, Outdated Circular & Breaking Unconfirmed Coverage
  {
    id: 'POL-05',
    claim: 'Droupadi Murmu is the current President of India',
    category: 'politics_governance',
    language: 'en',
    expectedVerdict: 'REAL',
    expectPublicEvidence: true,
  },
  {
    id: 'SPT-04',
    claim: 'India won the ICC T20 World Cup 2024',
    category: 'sports',
    language: 'en',
    expectedVerdict: 'REAL',
    expectPublicEvidence: true,
  },
  {
    id: 'OUT-01',
    claim: 'Reserve Bank of India announced Rs 2000 currency note will stop being legal tender immediately tomorrow via WhatsApp circular',
    category: 'business_economy',
    language: 'en',
    expectedVerdict: 'FAKE',
    expectPublicEvidence: true,
  },
  {
    id: 'REC-01',
    claim: 'Local municipal ward committee in Belagavi approved a new footbridge over drainage canal yesterday morning',
    category: 'regional_local',
    language: 'en',
    expectedVerdict: 'UNVERIFIED',
    expectPublicEvidence: false,
  },
  {
    id: 'REC-02',
    claim: 'Emergency shutdown of all banks in Mysuru next Monday due to secret server upgrade',
    category: 'business_economy',
    language: 'en',
    expectedVerdict: 'UNVERIFIED',
    expectPublicEvidence: false,
  },
];

async function runBenchmark() {
  console.log('====================================================================');
  console.log('     TRUTHLENS QUANTITATIVE RAG EVALUATION BENCHMARK');
  console.log(`     Total Evaluation Claims: ${EVAL_DATASET.length}`);
  console.log('====================================================================\n');

  // Sanity check hybrid vector projection
  const vQuery = computeHybridProjectionVector('President of India Droupadi Murmu');
  const vMatch = computeHybridProjectionVector('Droupadi Murmu serves as the President of India');
  const vOff = computeHybridProjectionVector('Odisha cyclone warning coastal rainfall');
  assert(
    cosineSimilarityVector(vQuery, vMatch) > cosineSimilarityVector(vQuery, vOff),
    'Vector projection similarity must rank topical match higher than unrelated doc'
  );

  let exactMatches = 0;
  let retrievalRecallHits = 0;
  let retrievalExpectTotal = 0;
  let totalKeptDocs = 0;
  let totalDecisiveOrTopicalKeptDocs = 0;
  let totalTop3RelScore = 0;
  let top3RelCount = 0;
  let credibleSourceCovered = 0;

  let falseGroundTruthCount = 0;
  let falsePositiveCount = 0; // non-REAL falsely marked REAL
  let trueGroundTruthCount = 0;
  let falseNegativeCount = 0; // REAL falsely marked FAKE
  let decidableCount = 0;
  let decisiveCorrectCount = 0;

  let unverifiedGroundTruthCount = 0;
  let unverifiedExactCount = 0;
  let unverifiedNonRealSafeCount = 0;
  let totalCitationsChecked = 0;
  let validCitationsCount = 0;
  let totalCragPasses = 0;

  const classes: EvalClass[] = ['REAL', 'FAKE', 'UNVERIFIED'];
  const confusion: Record<EvalClass, Record<EvalClass, number>> = {
    REAL: { REAL: 0, FAKE: 0, UNVERIFIED: 0 },
    FAKE: { REAL: 0, FAKE: 0, UNVERIFIED: 0 },
    UNVERIFIED: { REAL: 0, FAKE: 0, UNVERIFIED: 0 },
  };

  const categoryStats: Record<string, { total: number; correct: number }> = {};
  const languageStats: Record<Language, { total: number; correct: number }> = {
    en: { total: 0, correct: 0 },
    kn: { total: 0, correct: 0 },
    hi: { total: 0, correct: 0 },
  };

  const failures: string[] = [];

  for (const tc of EVAL_DATASET) {
    const prep = extractClaimsAndEntities(tc.claim, 'text');
    if (tc.minSubClaims) {
      assert(
        prep.extractedClaims.length >= tc.minSubClaims,
        `Expected >= ${tc.minSubClaims} sub-claims for "${tc.id}", got ${prep.extractedClaims.length}`
      );
    }

    const searchRes = await executeMultiQuerySearch(
      prep.extractedClaims,
      prep.extractedEntities,
      tc.claim,
      prep.preprocessed
    );
    totalCragPasses += searchRes.cragIterations || 1;

    const dossier = analyzeClaimText(
      tc.claim,
      'text',
      undefined,
      undefined,
      searchRes.results,
      {
        cragIterations: searchRes.cragIterations,
        cragTrace: searchRes.cragTrace,
        insufficiencyReason: searchRes.insufficiencyReason,
        irrelevantFilteredCount: searchRes.filteredIrrelevantCount,
        deduplicatedCount: searchRes.deduplicatedCount,
        searchQueryCount: searchRes.queryCount,
      }
    );

    const rawGot: ClearVerdictStatus = dossier.clearVerdictStatus;
    const got: EvalClass = rawGot === 'REAL' || rawGot === 'FAKE' ? rawGot : 'UNVERIFIED';
    confusion[tc.expectedVerdict][got] = (confusion[tc.expectedVerdict][got] || 0) + 1;

    const isCorrect =
      tc.expectedVerdict === 'FAKE'
        ? got === 'FAKE'
        : tc.expectedVerdict === 'REAL'
        ? got === 'REAL'
        : got !== 'REAL'; // For UNVERIFIED test cases, must never falsely confirm as REAL

    // Exact match vs strict check
    const exactMatch = got === tc.expectedVerdict;
    if (exactMatch) exactMatches++;

    // Citation correctness (real http/https URL + non-empty publication/retrieval date)
    for (const src of dossier.sources) {
      totalCitationsChecked++;
      const hasValidUrl = Boolean(sanitizeExternalUrl(src.url));
      const hasDate = Boolean((src.publicationDate && src.publicationDate.trim()) || src.retrievedAt);
      if (hasValidUrl && hasDate) {
        validCitationsCount++;
      }
    }

    // Category & Language tracking
    categoryStats[tc.category] = categoryStats[tc.category] || { total: 0, correct: 0 };
    categoryStats[tc.category].total++;
    if (exactMatch) categoryStats[tc.category].correct++;

    languageStats[tc.language].total++;
    if (exactMatch) languageStats[tc.language].correct++;

    // Retrieval metrics
    if (tc.expectPublicEvidence) {
      retrievalExpectTotal++;
      if (searchRes.results.length > 0) retrievalRecallHits++;
      if (searchRes.results.some((r) => r.credibilityTier !== 'secondary_web')) {
        credibleSourceCovered++;
      }
    }

    totalKeptDocs += searchRes.results.length;
    totalDecisiveOrTopicalKeptDocs += searchRes.results.filter(
      (r) => (r.relevanceScore || 0) >= 0.25
    ).length;

    const top3 = searchRes.results.slice(0, 3);
    for (const r of top3) {
      if (typeof r.relevanceScore === 'number') {
        totalTop3RelScore += r.relevanceScore;
        top3RelCount++;
      }
    }

    // FPR / FNR / Insufficient-evidence / Coverage tracking
    if (tc.expectedVerdict === 'REAL') {
      trueGroundTruthCount++;
      decidableCount++;
      if (got === 'FAKE') falseNegativeCount++;
      if (got === 'REAL') decisiveCorrectCount++;
    } else if (tc.expectedVerdict === 'FAKE') {
      falseGroundTruthCount++;
      decidableCount++;
      if (got === 'REAL') falsePositiveCount++;
      if (got === 'FAKE') decisiveCorrectCount++;
    } else {
      unverifiedGroundTruthCount++;
      falseGroundTruthCount++;
      if (got === 'UNVERIFIED') unverifiedExactCount++;
      if (got !== 'REAL') unverifiedNonRealSafeCount++;
      if (got === 'REAL') falsePositiveCount++;
    }

    const mark = exactMatch ? 'PASS' : isCorrect ? 'WARN' : 'FAIL';
    console.log(
      `[${mark}] ${tc.id.padEnd(7)} | Expected: ${tc.expectedVerdict.padEnd(10)} | Got: ${got.padEnd(10)} (${dossier.confidenceScore}%) | CRAG: ${searchRes.cragIterations || 1} | Kept: ${searchRes.results.length} | "${tc.claim.slice(0, 48)}"`
    );

    if (!exactMatch) {
      failures.push(`${tc.id}: expected ${tc.expectedVerdict}, got ${got} ("${tc.claim.slice(0, 60)}")`);
    }
  }

  const retrievalRecall = retrievalExpectTotal > 0 ? (retrievalRecallHits / retrievalExpectTotal) * 100 : 0;
  const retrievalPrecision = totalKeptDocs > 0 ? (totalDecisiveOrTopicalKeptDocs / totalKeptDocs) * 100 : 0;
  const avgEvidenceRel = top3RelCount > 0 ? (totalTop3RelScore / top3RelCount) * 100 : 0;
  const sourceCoverage = retrievalExpectTotal > 0 ? (credibleSourceCovered / retrievalExpectTotal) * 100 : 0;
  const citationCorrectness = totalCitationsChecked > 0 ? (validCitationsCount / totalCitationsChecked) * 100 : 0;
  const insufficientEvidenceExactRate = unverifiedGroundTruthCount > 0 ? (unverifiedExactCount / unverifiedGroundTruthCount) * 100 : 0;
  const insufficientEvidenceNonRealRate = unverifiedGroundTruthCount > 0 ? (unverifiedNonRealSafeCount / unverifiedGroundTruthCount) * 100 : 0;
  const avgCragPasses = EVAL_DATASET.length > 0 ? totalCragPasses / EVAL_DATASET.length : 0;
  const verdictAccuracy = (exactMatches / EVAL_DATASET.length) * 100;
  const fpr = falseGroundTruthCount > 0 ? (falsePositiveCount / falseGroundTruthCount) * 100 : 0;
  const fnr = trueGroundTruthCount > 0 ? (falseNegativeCount / trueGroundTruthCount) * 100 : 0;
  const verificationCoverage = decidableCount > 0 ? (decisiveCorrectCount / decidableCount) * 100 : 0;

  // Per-class & Macro Precision / Recall / F1
  const perClassMetrics: Record<EvalClass, { precision: number; recall: number; f1: number; support: number }> = {
    REAL: { precision: 0, recall: 0, f1: 0, support: 0 },
    FAKE: { precision: 0, recall: 0, f1: 0, support: 0 },
    UNVERIFIED: { precision: 0, recall: 0, f1: 0, support: 0 },
  };

  for (const cls of classes) {
    const tp = confusion[cls][cls];
    const fp = classes.filter((c) => c !== cls).reduce((acc, c) => acc + confusion[c][cls], 0);
    const fn = classes.filter((c) => c !== cls).reduce((acc, c) => acc + confusion[cls][c], 0);
    const support = classes.reduce((acc, c) => acc + confusion[cls][c], 0);
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    perClassMetrics[cls] = { precision, recall, f1, support };
  }

  const macroPrecision = (classes.reduce((acc, c) => acc + perClassMetrics[c].precision, 0) / classes.length) * 100;
  const macroRecall = (classes.reduce((acc, c) => acc + perClassMetrics[c].recall, 0) / classes.length) * 100;
  const macroF1 = (classes.reduce((acc, c) => acc + perClassMetrics[c].f1, 0) / classes.length) * 100;

  console.log('\n====================================================================');
  console.log(`METRICS SUMMARY (Evaluated on ${EVAL_DATASET.length} Multi-Domain Benchmark Cases; Real-World Accuracy Varies)`);
  console.log('====================================================================');
  console.log(`Retrieval Recall (evidence found):      ${retrievalRecall.toFixed(1)}% (${retrievalRecallHits}/${retrievalExpectTotal})`);
  console.log(`Retrieval Precision (relevant kept):    ${retrievalPrecision.toFixed(1)}% (${totalDecisiveOrTopicalKeptDocs}/${totalKeptDocs})`);
  console.log(`Mean Top-3 Evidence Relevance:          ${avgEvidenceRel.toFixed(1)}%`);
  console.log(`Credible Source Coverage:               ${sourceCoverage.toFixed(1)}% (${credibleSourceCovered}/${retrievalExpectTotal})`);
  console.log(`Citation Correctness (Valid URL+Date):  ${citationCorrectness.toFixed(1)}% (${validCitationsCount}/${totalCitationsChecked})`);
  console.log(`Avg Corrective RAG (CRAG) Passes:       ${avgCragPasses.toFixed(2)}`);
  console.log(`Verdict Accuracy (Exact Match):         ${verdictAccuracy.toFixed(1)}% (${exactMatches}/${EVAL_DATASET.length})`);
  console.log(`Macro Precision / Recall / F1:          ${macroPrecision.toFixed(1)}% / ${macroRecall.toFixed(1)}% / ${macroF1.toFixed(1)}%`);
  console.log(`Insufficient-Evidence Exact Detection:  ${insufficientEvidenceExactRate.toFixed(1)}% (${unverifiedExactCount}/${unverifiedGroundTruthCount}); Non-REAL Guard: ${insufficientEvidenceNonRealRate.toFixed(1)}%`);
  console.log(`Decisive Verification Coverage:         ${verificationCoverage.toFixed(1)}% (${decisiveCorrectCount}/${decidableCount})`);
  console.log(`False Positive Rate (non-TRUE->REAL):   ${fpr.toFixed(1)}% (${falsePositiveCount}/${falseGroundTruthCount})`);
  console.log(`False Negative Rate (TRUE->FAKE):       ${fnr.toFixed(1)}% (${falseNegativeCount}/${trueGroundTruthCount})`);

  console.log('\nPer-Class Precision / Recall / F1:');
  for (const cls of classes) {
    const m = perClassMetrics[cls];
    console.log(
      `  - ${cls.padEnd(11)} (n=${String(m.support).padEnd(2)}): P=${(m.precision * 100).toFixed(1)}% | R=${(m.recall * 100).toFixed(1)}% | F1=${(m.f1 * 100).toFixed(1)}%`
    );
  }

  console.log('\nCategory Breakdown:');
  for (const [cat, stat] of Object.entries(categoryStats)) {
    console.log(`  - ${cat.padEnd(22)}: ${stat.correct}/${stat.total} (${((stat.correct / stat.total) * 100).toFixed(0)}%)`);
  }

  console.log('\nLanguage Breakdown:');
  for (const [lang, stat] of Object.entries(languageStats)) {
    console.log(`  - ${lang.toUpperCase().padEnd(22)}: ${stat.correct}/${stat.total} (${((stat.correct / stat.total) * 100).toFixed(0)}%)`);
  }

  if (failures.length > 0) {
    console.log('\nMismatches to inspect:');
    for (const f of failures) console.log(`  * ${f}`);
  }

  assert.equal(falsePositiveCount, 0, 'False Positive Rate (non-TRUE marked REAL) must be 0%');
  assert.equal(falseNegativeCount, 0, 'False Negative Rate (TRUE marked FAKE) must be 0%');
  assert(citationCorrectness >= 95, `Expected citation correctness >= 95%, got ${citationCorrectness.toFixed(1)}%`);
  assert(verdictAccuracy >= 85, `Expected benchmark verdict accuracy >= 85%, got ${verdictAccuracy.toFixed(1)}%`);
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
