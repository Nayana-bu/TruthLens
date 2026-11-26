import { analyzeClaimText } from '../backend/src/services/claimAnalyzer.ts';
import { preprocessQuery, executeMultiQuerySearch, type SearchResultItem } from '../backend/src/services/ragEngine.ts';

interface TestCase {
  name: string;
  claim: string;
  mode?: 'text' | 'ocr' | 'url';
  useLiveRag?: boolean;
  mockSearchResults?: SearchResultItem[];
  expectedVerdict: string;
  expectedStatus: string;
  mustNotBe: string;
}

const testCases: TestCase[] = [
  {
    name: '1. True Claim (Live RAG): Current Prime Minister of India',
    claim: 'Narendra Modi is the current Prime Minister of India',
    useLiveRag: true,
    expectedVerdict: 'verified_true',
    expectedStatus: 'REAL',
    mustNotBe: 'false',
  },
  {
    name: '2. True Claim (Live RAG): ISRO Aditya-L1 Solar Observatory',
    claim: 'ISRO completes scheduled Halo Orbit Insertion for Aditya-L1 solar observatory',
    useLiveRag: true,
    expectedVerdict: 'verified_true',
    expectedStatus: 'REAL',
    mustNotBe: 'false',
  },
  {
    name: '3. False Claim (Live RAG): Modi is not PM',
    claim: 'Narendra modi is not a prime minister of India',
    useLiveRag: true,
    expectedVerdict: 'false',
    expectedStatus: 'FAKE',
    mustNotBe: 'verified_true',
  },
  {
    name: '4. False Claim: 500GB Phishing Scheme (.xyz lure)',
    claim: 'Govt announces free 500GB 5G recharge for all citizens under PM Digital Yojana. Click here to claim: pmyojana-free-5g.xyz',
    expectedVerdict: 'false',
    expectedStatus: 'FAKE',
    mustNotBe: 'verified_true',
  },
  {
    name: '5. False Claim (Evidence-Grounded): Debunked Recycled School Holiday Circular',
    claim: 'Karnataka Government orders 3-day statewide emergency holiday for all primary and high schools due to severe cyclone alert',
    mockSearchResults: [
      {
        title: 'Fact Check: Viral Karnataka school holiday circular is fake and recycled from 2019',
        url: 'https://factcheck.pib.gov.in/karnataka-holiday-fake',
        snippet: 'PIB Fact Check clarifies no 3-day emergency school holiday has been ordered; the viral notice is fake and recycled from an old circular.',
        publicationDate: 'Nov 2026',
        sourceName: 'PIB Fact Check',
        category: 'Official Govt Fact-Check Bureau (PIB)',
        isPrimary: true,
        credibilityTier: 'factcheck_org',
        stance: 'contradicts',
        relevanceScore: 0.88,
      },
    ],
    expectedVerdict: 'false',
    expectedStatus: 'FAKE',
    mustNotBe: 'verified_true',
  },
  {
    name: '6. Verification Pending: Arbitrary Unknown Event (Never False on Absence of Evidence!)',
    claim: 'A farmer named Gopal in village Belur discovered a stone that glows blue at night',
    useLiveRag: true,
    expectedVerdict: 'unverified',
    expectedStatus: 'UNVERIFIED',
    mustNotBe: 'false',
  },
  {
    name: '7. Verification Pending: Unreadable Screenshot / OCR Failure (Never False!)',
    claim: '[Screenshot attached: blurry_camera_photo.jpg]',
    mode: 'ocr',
    expectedVerdict: 'unverified',
    expectedStatus: 'UNVERIFIED',
    mustNotBe: 'false',
  },
  {
    name: '8. Verification Pending: No Hardcoded Offline Shortcut When Retrieval Was Not Run',
    claim: 'Narendra Modi is the current Prime Minister of India',
    useLiveRag: false,
    expectedVerdict: 'unverified',
    expectedStatus: 'UNVERIFIED',
    mustNotBe: 'verified_true',
  },
];

async function run() {
  console.log('=============================================================');
  console.log('       TRUTHLENS VERIFICATION ENGINE TEST SUITE              ');
  console.log('=============================================================');

  let passedCount = 0;
  let failedCount = 0;

  for (const tc of testCases) {
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
}

run();
