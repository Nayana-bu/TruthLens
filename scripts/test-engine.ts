import { analyzeClaimText } from '../src/utils/claimAnalyzer.ts';

interface TestCase {
  name: string;
  claim: string;
  mode?: 'text' | 'ocr' | 'url';
  expectedVerdict: string;
  expectedStatus: string;
  mustNotBe: string;
}

const testCases: TestCase[] = [
  {
    name: '1. True Claim: Current Prime Minister of India',
    claim: 'Narendra Modi is the current Prime Minister of India',
    expectedVerdict: 'verified_true',
    expectedStatus: 'REAL',
    mustNotBe: 'false',
  },
  {
    name: '2. True Claim: ISRO Moon Exploration',
    claim: 'ISRO completes scheduled Halo Orbit Insertion for Aditya-L1 solar observatory with zero telemetry drift',
    expectedVerdict: 'verified_true',
    expectedStatus: 'REAL',
    mustNotBe: 'false',
  },
  {
    name: '3. False Claim: Modi is not PM',
    claim: 'Narendra modi is not a prime minister of India',
    expectedVerdict: 'false',
    expectedStatus: 'FAKE',
    mustNotBe: 'verified_true',
  },
  {
    name: '4. False Claim: 500GB Phishing Scheme',
    claim: 'Govt announces free 500GB 5G recharge for all citizens under PM Digital Yojana. Click here to claim: pmyojana-free-5g.xyz',
    expectedVerdict: 'false',
    expectedStatus: 'FAKE',
    mustNotBe: 'verified_true',
  },
  {
    name: '5. Misleading Claim: Recycled School Holiday Circular',
    claim: 'Karnataka Government orders 3-day statewide emergency holiday for all primary and high schools due to severe cyclone alert',
    expectedVerdict: 'misleading',
    expectedStatus: 'MISLEADING',
    mustNotBe: 'verified_true',
  },
  {
    name: '6. Unverified Claim: Arbitrary Unknown Event (Never False on Absence of Evidence!)',
    claim: 'A farmer named Gopal in village Belur discovered a stone that glows blue at night',
    expectedVerdict: 'unverified',
    expectedStatus: 'UNVERIFIED',
    mustNotBe: 'false',
  },
  {
    name: '7. Unverified Claim: Unreadable Screenshot / OCR Failure (Never False!)',
    claim: '[Screenshot attached: blurry_camera_photo.jpg]',
    mode: 'ocr',
    expectedVerdict: 'unverified',
    expectedStatus: 'UNVERIFIED',
    mustNotBe: 'false',
  },
];

console.log('=============================================================');
console.log('       TRUTHLENS VERIFICATION ENGINE TEST SUITE              ');
console.log('=============================================================');

let passedCount = 0;
let failedCount = 0;

for (const tc of testCases) {
  const dossier = analyzeClaimText(tc.claim, tc.mode || 'text');
  const passVerdict = dossier.verdict === tc.expectedVerdict;
  const passStatus = dossier.clearVerdictStatus === tc.expectedStatus;
  const passForbidden = dossier.verdict !== tc.mustNotBe;

  const passed = passVerdict && passStatus && passForbidden;

  console.log(`\nTEST: ${tc.name}`);
  console.log(`  Input Claim : "${tc.claim}"`);
  console.log(`  Result      : verdict="${dossier.verdict}", status="${dossier.clearVerdictStatus}", score=${dossier.confidenceScore}%`);
  console.log(`  Expected    : verdict="${tc.expectedVerdict}", status="${tc.expectedStatus}"`);
  console.log(`  Check       : must NOT be "${tc.mustNotBe}" => ${passForbidden ? 'OK' : 'VIOLATION'}`);

  if (passed) {
    console.log(`  Status      : ✅ PASSED`);
    passedCount++;
  } else {
    console.error(`  Status      : ❌ FAILED`);
    failedCount++;
  }
}

console.log('\n=============================================================');
console.log(`TOTAL TESTS: ${testCases.length} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
console.log('=============================================================');

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('All verification engine tests passed successfully!');
  process.exit(0);
}
