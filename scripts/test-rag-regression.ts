import { analyzeClaimText } from '../src/utils/claimAnalyzer.ts';
import { extractClaimsAndEntities, executeMultiQuerySearch, buildEvidenceAnalysisAndScoring } from '../src/utils/ragEngine.ts';

interface TestCase {
  id: number;
  name: string;
  claim: string;
  mode?: 'text' | 'ocr' | 'url';
  expectedVerdict: string;
  expectedStatus: string;
  mustNotBe: string;
  validate?: (dossier: any) => { ok: boolean; reason?: string };
}

const testCases: TestCase[] = [
  {
    id: 1,
    name: '1. True claim confirmed by official source',
    claim: 'Narendra Modi is the current Prime Minister of India',
    expectedVerdict: 'verified_true',
    expectedStatus: 'REAL',
    mustNotBe: 'false',
    validate: (d) => {
      const hasCalibratedScore = d.confidenceScore >= 75 && d.confidenceScore <= 96;
      const notHardcoded99 = d.confidenceScore !== 99 && d.confidenceScore !== 99.0;
      const hasHighStrength = d.evidenceAnalysis?.evidenceStrength === 'high_corroboration';
      const hasSupportingEvidence = d.evidenceAnalysis?.supportingEvidence?.length > 0;
      if (!hasCalibratedScore) return { ok: false, reason: `Score ${d.confidenceScore}% outside calibrated range (75-96%)` };
      if (!notHardcoded99) return { ok: false, reason: `Score is hardcoded 99%` };
      if (!hasHighStrength) return { ok: false, reason: `Expected high_corroboration evidence strength` };
      if (!hasSupportingEvidence) return { ok: false, reason: `Missing supporting evidence points` };
      return { ok: true };
    },
  },
  {
    id: 2,
    name: '2. False claim directly contradicted by reliable evidence',
    claim: 'Narendra modi is not a prime minister of India and resigned',
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
    name: '3. Recent claim published after model training cutoff (Cyclone Arnab, Oct 28, 2026)',
    claim: 'IMD issues red alert as Severe Cyclone Arnab approaches Odisha coast on October 28, 2026',
    expectedVerdict: 'verified_true',
    expectedStatus: 'REAL',
    mustNotBe: 'false',
    validate: (d) => {
      const mentionsIMD = d.sourceEntity.includes('IMD');
      const hasRecentDate = d.sources.some((s: any) => (s.publicationDate || '').includes('October 28, 2026'));
      if (!mentionsIMD) return { ok: false, reason: `Expected IMD official source entity` };
      if (!hasRecentDate) return { ok: false, reason: `Expected source with October 28, 2026 publication date` };
      return { ok: true };
    },
  },
  {
    id: 4,
    name: '4. Claim with no available evidence (must return UNVERIFIED, never false!)',
    claim: 'A farmer named Gopal in village Belur discovered a stone that glows blue at night',
    expectedVerdict: 'unverified',
    expectedStatus: 'UNVERIFIED',
    mustNotBe: 'false',
    validate: (d) => {
      const isUnverified = d.verdict === 'unverified';
      const hasInsufficientStrength = d.evidenceAnalysis?.evidenceStrength === 'insufficient_data';
      const scoreBounded = d.confidenceScore >= 30 && d.confidenceScore <= 55;
      if (!isUnverified) return { ok: false, reason: `Absence of evidence was falsely labeled as ${d.verdict}` };
      if (!hasInsufficientStrength) return { ok: false, reason: `Expected insufficient_data evidence strength` };
      if (!scoreBounded) return { ok: false, reason: `Score ${d.confidenceScore}% outside unverified bounds (30-55%)` };
      return { ok: true };
    },
  },
  {
    id: 5,
    name: '5. Claim with conflicting sources (must identify conflict and return PARTLY_TRUE)',
    claim: 'Conflicting reports emerge over local train collision with early reports stating 50 dead while official railway bulletin confirms 4 minor injuries',
    expectedVerdict: 'partly_true',
    expectedStatus: 'PARTLY_TRUE',
    mustNotBe: 'verified_true',
    validate: (d) => {
      const hasMixedStrength = d.evidenceAnalysis?.evidenceStrength === 'mixed_evidence';
      const hasBothSides =
        d.evidenceAnalysis?.supportingEvidence?.length > 0 &&
        d.evidenceAnalysis?.contradictingEvidence?.length > 0;
      if (!hasMixedStrength) return { ok: false, reason: `Expected mixed_evidence strength for conflicting sources` };
      if (!hasBothSides) return { ok: false, reason: `Expected both supporting and contradicting evidence breakdown` };
      return { ok: true };
    },
  },
  {
    id: 6,
    name: '6. Misleading claim (recycled circular out of context)',
    claim: 'Karnataka Government orders 3-day statewide emergency holiday for all primary and high schools due to severe cyclone alert',
    expectedVerdict: 'misleading',
    expectedStatus: 'MISLEADING',
    mustNotBe: 'verified_true',
    validate: (d) => {
      const hasContextFlag = d.evidenceAnalysis?.missingContext?.length > 0 || d.redFlags?.length > 0;
      if (!hasContextFlag) return { ok: false, reason: `Expected missing context or red flags indicating out-of-context order` };
      return { ok: true };
    },
  },
  {
    id: 7,
    name: '7. Failed search API request (handled gracefully, never defaults to FALSE)',
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
    name: '8. Screenshot containing multiple factual claims (extracts and verifies each)',
    claim: '1. Govt announces 5000 pension for youth under PM scheme. 2. Free laptop distribution starts tomorrow for all students.',
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

console.log('================================================================');
console.log('       TRUTHLENS VERIFY RAG PIPELINE REGRESSION TEST SUITE      ');
console.log('================================================================');

let passedCount = 0;
let failedCount = 0;

for (const tc of testCases) {
  console.log(`\n----------------------------------------------------------------`);
  console.log(`RUNNING SCENARIO ${tc.id}: ${tc.name}`);
  console.log(`  Input Claim: "${tc.claim.slice(0, 95)}..."`);

  const dossier = analyzeClaimText(tc.claim, tc.mode || 'text');

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
