import { analyzeClaimText } from '../backend/src/services/claimAnalyzer.ts';
import { preprocessQuery, executeMultiQuerySearch, type SearchResultItem } from '../backend/src/services/ragEngine.ts';

interface TestCase {
  id: number;
  name: string;
  claim: string;
  mode?: 'text' | 'ocr' | 'url';
  useLiveRag?: boolean;
  mockSearchResults?: SearchResultItem[];
  expectedVerdict: string;
  expectedStatus: string;
  mustNotBe: string;
  validate?: (dossier: any) => { ok: boolean; reason?: string };
}

const testCases: TestCase[] = [
  {
    id: 1,
    name: '1. True claim confirmed by live retrieved credible sources',
    claim: 'Narendra Modi is the current Prime Minister of India',
    useLiveRag: true,
    expectedVerdict: 'verified_true',
    expectedStatus: 'REAL',
    mustNotBe: 'false',
    validate: (d) => {
      const hasCalibratedScore = d.confidenceScore >= 70 && d.confidenceScore <= 96;
      const notHardcoded99 = d.confidenceScore !== 99 && d.confidenceScore !== 99.0;
      const hasHighStrength = d.evidenceAnalysis?.evidenceStrength === 'high_corroboration';
      const hasSupportingEvidence = d.evidenceAnalysis?.supportingEvidence?.length > 0;
      if (!hasCalibratedScore) return { ok: false, reason: `Score ${d.confidenceScore}% outside calibrated range (70-96%)` };
      if (!notHardcoded99) return { ok: false, reason: `Score is hardcoded 99%` };
      if (!hasHighStrength) return { ok: false, reason: `Expected high_corroboration evidence strength` };
      if (!hasSupportingEvidence) return { ok: false, reason: `Missing supporting evidence points` };
      return { ok: true };
    },
  },
  {
    id: 2,
    name: '2. False claim directly contradicted by live retrieved evidence',
    claim: 'Narendra modi is not a prime minister of India and resigned',
    useLiveRag: true,
    expectedVerdict: 'false',
    expectedStatus: 'FAKE',
    mustNotBe: 'verified_true',
    validate: (d) => {
      const hasContradictionStrength = d.evidenceAnalysis?.evidenceStrength === 'direct_contradiction';
      const hasContradictingEvidence = d.evidenceAnalysis?.contradictingEvidence?.length > 0;
      if (!hasContradictionStrength) return { ok: false, reason: `Expected direct_contradiction evidence strength` };
      if (!hasContradictingEvidence) return { ok: false, reason: `Missing contradicting evidence points` };
      return { ok: true };
    },
  },
  {
    id: 3,
    name: '3. Recent 2026 live news claim grounded via RAG retrieval (Bengaluru Pink Line)',
    claim: 'Pink Line Elevated Stretch Opens: The 7.5-km elevated stretch of the Pink Line between Kalena Agrahara and S.G. Palya was inaugurated on November 13 and opened to passengers on November 14, 2026',
    useLiveRag: true,
    expectedVerdict: 'verified_true',
    expectedStatus: 'REAL',
    mustNotBe: 'false',
    validate: (d) => {
      const hasSources = Array.isArray(d.sources) && d.sources.length >= 1;
      if (!hasSources) return { ok: false, reason: `Expected live retrieved sources` };
      return { ok: true };
    },
  },
  {
    id: 4,
    name: '4. Claim with insufficient evidence (must return Verification Pending, never FALSE!)',
    claim: 'A farmer named Gopal in village Belur discovered a stone that glows blue at night',
    useLiveRag: true,
    expectedVerdict: 'unverified',
    expectedStatus: 'UNVERIFIED',
    mustNotBe: 'false',
    validate: (d) => {
      const isUnverified = d.verdict === 'unverified';
      const hasInsufficientStrength = d.evidenceAnalysis?.evidenceStrength === 'insufficient_data';
      const scoreBounded = d.confidenceScore >= 30 && d.confidenceScore <= 55;
      if (!isUnverified) return { ok: false, reason: `Absence of evidence was falsely labeled as ${d.verdict}` };
      if (!hasInsufficientStrength) return { ok: false, reason: `Expected insufficient_data evidence strength` };
      if (!scoreBounded) return { ok: false, reason: `Score ${d.confidenceScore}% outside pending bounds (30-55%)` };
      return { ok: true };
    },
  },
  {
    id: 5,
    name: '5. Claim with conflicting credible sources (must return Verification Pending & preserve both sides)',
    claim: 'Local train incident near Mysuru resulted in 50 casualties according to initial posts',
    mockSearchResults: [
      {
        title: 'Official Railways Clarification on Mysuru Local Incident',
        url: 'https://indianrailways.gov.in/clarification-mysuru',
        snippet: 'Ministry of Railways confirms 4 minor injuries and refutes social media claims of 50 casualties.',
        publicationDate: 'Nov 2026',
        sourceName: 'Ministry of Railways',
        category: 'Official Government / Primary Registry',
        isPrimary: true,
        credibilityTier: 'official_primary',
        stance: 'contradicts',
        relevanceScore: 0.78,
      },
      {
        title: 'Initial Regional Bulletin Report on Mysuru Train Incident',
        url: 'https://www.deccanherald.com/mysuru-train-initial',
        snippet: 'Early breaking wire cited local eyewitnesses reporting severe disruption near Mysuru junction.',
        publicationDate: 'Nov 2026',
        sourceName: 'Deccan Herald',
        category: 'Accredited News Publication',
        isPrimary: false,
        credibilityTier: 'accredited_press',
        stance: 'supports',
        relevanceScore: 0.72,
      },
    ],
    expectedVerdict: 'unverified',
    expectedStatus: 'UNVERIFIED',
    mustNotBe: 'verified_true',
    validate: (d) => {
      const hasMixedStrength = d.evidenceAnalysis?.evidenceStrength === 'mixed_evidence';
      const hasBothSides =
        d.evidenceAnalysis?.supportingEvidence?.length > 0 &&
        d.evidenceAnalysis?.contradictingEvidence?.length > 0;
      if (!hasMixedStrength) return { ok: false, reason: `Expected mixed_evidence strength for conflicting sources, got ${d.evidenceAnalysis?.evidenceStrength}` };
      if (!hasBothSides) return { ok: false, reason: `Expected both supporting and contradicting evidence breakdown` };
      return { ok: true };
    },
  },
  {
    id: 6,
    name: '6. Debunked recycled circular classified strictly as FALSE NEWS via fact-check evidence',
    claim: 'Karnataka Government orders 3-day statewide emergency holiday for all primary and high schools due to severe cyclone alert',
    mockSearchResults: [
      {
        title: 'Fact Check: Old Karnataka school holiday order circulated out of context is fake',
        url: 'https://factcheck.pib.gov.in/karnataka-holiday-fake',
        snippet: 'Fake alert: No statewide school holiday circular was issued today; this notice is an old recycled circular.',
        publicationDate: 'Nov 2026',
        sourceName: 'PIB Fact Check',
        category: 'Official Govt Fact-Check Bureau (PIB)',
        isPrimary: true,
        credibilityTier: 'factcheck_org',
        stance: 'contradicts',
        relevanceScore: 0.85,
      },
    ],
    expectedVerdict: 'false',
    expectedStatus: 'FAKE',
    mustNotBe: 'verified_true',
    validate: (d) => {
      const hasFlag = d.redFlags?.length > 0;
      if (!hasFlag) return { ok: false, reason: `Expected red flags explaining contradiction` };
      return { ok: true };
    },
  },
  {
    id: 7,
    name: '7. Failed search API request (handled gracefully as Verification Pending, never FALSE)',
    claim: 'Govt announces revised state scholarship scheme [search_failure_simulated]',
    expectedVerdict: 'unverified',
    expectedStatus: 'UNVERIFIED',
    mustNotBe: 'false',
    validate: (d) => {
      const isUnverified = d.verdict === 'unverified';
      const searchStatusReported = d.evidenceAnalysis?.searchProviderStatus === 'error_reported';
      if (!isUnverified) return { ok: false, reason: `Failed search caused invalid verdict: ${d.verdict} (must be unverified)` };
      if (!searchStatusReported) return { ok: false, reason: `Expected searchProviderStatus='error_reported'` };
      return { ok: true };
    },
  },
  {
    id: 8,
    name: '8. Screenshot containing multiple factual claims (extracts sub-claims & evaluates evidence)',
    claim: '1. Govt announces 5000 pension for youth under PM scheme. 2. Free laptop distribution starts tomorrow at free-gift-claim.xyz.',
    mode: 'ocr',
    expectedVerdict: 'false',
    expectedStatus: 'FAKE',
    mustNotBe: 'verified_true',
    validate: (d) => {
      const extractedCount = d.extractedClaims?.length || 0;
      if (extractedCount < 2) return { ok: false, reason: `Expected at least 2 extracted claims, got ${extractedCount}` };
      const hasClaim1 = d.extractedClaims[0].claim.includes('5000 pension');
      const hasClaim2 = d.extractedClaims[1].claim.includes('laptop');
      if (!hasClaim1 || !hasClaim2) return { ok: false, reason: `Extracted claims did not preserve factual sub-points` };
      return { ok: true };
    },
  },
];

async function run() {
  console.log('================================================================');
  console.log('       TRUTHLENS VERIFY RAG PIPELINE REGRESSION TEST SUITE      ');
  console.log('================================================================');

  let passedCount = 0;
  let failedCount = 0;

  for (const tc of testCases) {
    console.log(`\n----------------------------------------------------------------`);
    console.log(`RUNNING SCENARIO ${tc.id}: ${tc.name}`);
    console.log(`  Input Claim: "${tc.claim.slice(0, 95)}..."`);

    let searchItems = tc.mockSearchResults;
    if (tc.useLiveRag) {
      const prep = preprocessQuery(tc.claim);
      const searchOut = await executeMultiQuerySearch(prep.extractedClaims, prep.entities, tc.claim, prep);
      searchItems = searchOut.results;
    }

    const dossier = analyzeClaimText(tc.claim, tc.mode || 'text', undefined, undefined, searchItems);

    const passVerdict = dossier.verdict === tc.expectedVerdict;
    const passStatus = dossier.clearVerdictStatus === tc.expectedStatus;
    const passForbidden = dossier.verdict !== tc.mustNotBe;

    let customCheck: { ok: boolean; reason?: string } = { ok: true, reason: '' };
    if (tc.validate) {
      customCheck = tc.validate(dossier);
    }

    const allPassed = passVerdict && passStatus && passForbidden && customCheck.ok;

    console.log(`  Result Verdict    : ${dossier.verdict} (${dossier.clearVerdictStatus})`);
    console.log(`  Evidence Strength : ${dossier.evidenceAnalysis?.evidenceStrengthLabel || 'N/A'}`);
    console.log(`  Calibrated Score  : ${dossier.confidenceScore}% (no hardcoded 99%)`);
    console.log(`  Extracted Claims  : ${dossier.extractedClaims?.length || 0}`);
    console.log(`  Sources Listed    : ${dossier.sources?.length || 0}`);
    if (dossier.sources?.[0]?.publicationDate) {
      console.log(`  Primary Source Date: ${dossier.sources[0].publicationDate}`);
    }

    if (allPassed) {
      console.log(`  STATUS            : ✅ PASSED`);
      passedCount++;
    } else {
      console.error(`  STATUS            : ❌ FAILED`);
      if (!passVerdict) console.error(`    Expected verdict '${tc.expectedVerdict}', got '${dossier.verdict}'`);
      if (!passStatus) console.error(`    Expected status '${tc.expectedStatus}', got '${dossier.clearVerdictStatus}'`);
      if (!passForbidden) console.error(`    Verdict must NOT be '${tc.mustNotBe}'`);
      if (!customCheck.ok) console.error(`    Validation check failed: ${customCheck.reason}`);
      failedCount++;
    }
  }

  console.log('\n================================================================');
  console.log(`TOTAL SCENARIOS: ${testCases.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log('================================================================');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log('All 8 RAG Regression Scenarios Passed Flawlessly!');
    process.exit(0);
  }
}

run();
