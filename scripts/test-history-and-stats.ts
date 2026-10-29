import fs from 'fs';
import path from 'path';
import {
  saveInvestigation,
  getInvestigation,
  listInvestigations,
  deleteInvestigation,
  getStatistics,
  type InvestigationRecord,
} from '../src/db/investigationsDb.ts';
import type { ClaimDossier } from '../src/types.ts';

const DB_FILE = path.resolve(process.cwd(), 'data/investigations.json');

function createSampleDossier(id: string, claim: string, verdict: any, clearStatus: any): ClaimDossier {
  return {
    id,
    title: claim,
    originalClaim: claim,
    verdict,
    clearVerdictStatus: clearStatus,
    verdictLabel: clearStatus,
    verdictSubtitle: `Investigation of ${claim}`,
    confidenceScore: 92,
    timeAgo: 'Just now',
    category: 'governance',
    sourceEntity: 'Official Verification',
    languages: ['en', 'kn', 'hi'],
    summary: {
      en: `Verified summary for: ${claim}`,
      kn: `ಪರಿಶೀಲಿಸಿದ ಸಾರಾಂಶ: ${claim}`,
      hi: `सत्यापित सारांश: ${claim}`,
    },
    debunkExplanation: {
      en: `Detailed findings for: ${claim}`,
      kn: `ವಿವರವಾದ ತನಿಖೆ: ${claim}`,
      hi: `विस्तृत निष्कर्ष: ${claim}`,
    },
    spokenAudioScript: {
      en: `Audio script for ${claim}`,
      kn: `ಧ್ವನಿ ಸ್ಕ್ರಿಪ್ಟ್`,
      hi: `ऑडियो स्क्रिप्ट`,
    },
    whatsappDebunkNote: {
      en: `WhatsApp debunk for ${claim}`,
      kn: `ಖಂಡನೆ`,
      hi: `खंडन`,
    },
    sources: [
      {
        name: 'Press Information Bureau (PIB)',
        category: 'Official Gazette',
        status: 'confirmed',
        details: 'Official clarification published in press note.',
        url: 'https://factcheck.pib.gov.in',
      },
    ],
    redFlags: ['No official gazette publication'],
    timeline: [{ time: '2026-10-29', event: 'Claim published', source: 'Viral Channel' }],
    originVector: 'WhatsApp Forward',
  };
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('TruthLens Verify: Running Verification Test Suite');
  console.log('====================================================\n');

  // Backup existing data if any
  const backup = fs.existsSync(DB_FILE) ? fs.readFileSync(DB_FILE, 'utf-8') : '[]';

  try {
    // -------------------------------------------------------------
    // Requirement 7: Test with empty database (0 stats, no mock records)
    // -------------------------------------------------------------
    console.log('[Test 7] Verifying empty database statistics and zero mock records...');
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), 'utf-8');
    const emptyStats = await getStatistics();
    const emptyList = await listInvestigations();

    if (emptyStats.total !== 0) throw new Error(`Expected 0 total in empty stats, got ${emptyStats.total}`);
    if (emptyStats.truePercent !== 0 || emptyStats.fakePercent !== 0) throw new Error('Expected 0% on empty stats');
    if (emptyList.length !== 0) throw new Error(`Expected empty list, got ${emptyList.length} records`);
    console.log('✓ PASS: Empty database correctly reports 0 claims and zero mock records.');

    // -------------------------------------------------------------
    // Requirement 1: Submit claims -> Check they appear in history
    // -------------------------------------------------------------
    console.log('\n[Test 1] Saving real investigations into persistent database...');
    const item1: InvestigationRecord = {
      id: 'TL-TEST-001',
      originalInput: 'India launched Aditya-L1 solar observatory',
      extractedText: 'Aditya-L1 was launched towards Lagrange point L1',
      inputType: 'text',
      verdict: 'verified_true',
      clearVerdictStatus: 'REAL',
      verdictLabel: 'VERIFIED TRUE',
      confidenceScore: 98,
      language: 'en',
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dossier: createSampleDossier('TL-TEST-001', 'India launched Aditya-L1 solar observatory', 'verified_true', 'REAL'),
    };

    const item2: InvestigationRecord = {
      id: 'TL-TEST-002',
      originalInput: 'Government offering free 500GB 5G recharge to all citizens',
      extractedText: 'Free 500GB recharge link circulating on WhatsApp',
      inputType: 'text',
      verdict: 'false',
      clearVerdictStatus: 'FAKE',
      verdictLabel: 'FAKE NEWS',
      confidenceScore: 99,
      language: 'en',
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dossier: createSampleDossier('TL-TEST-002', 'Government offering free 500GB 5G recharge to all citizens', 'false', 'FAKE'),
    };

    const item3: InvestigationRecord = {
      id: 'TL-TEST-003',
      originalInput: 'Old currency notes banned from tomorrow',
      extractedText: 'Circular claims notes invalid immediately',
      inputType: 'ocr',
      verdict: 'misleading',
      clearVerdictStatus: 'MISLEADING',
      verdictLabel: 'MISLEADING',
      confidenceScore: 85,
      language: 'en',
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dossier: createSampleDossier('TL-TEST-003', 'Old currency notes banned from tomorrow', 'misleading', 'MISLEADING'),
    };

    await saveInvestigation(item1);
    await saveInvestigation(item2);
    await saveInvestigation(item3);

    const historyAfterSave = await listInvestigations();
    if (historyAfterSave.length !== 3) throw new Error(`Expected 3 records in history, got ${historyAfterSave.length}`);
    console.log(`✓ PASS: All 3 real investigations saved and appear in history.`);

    // -------------------------------------------------------------
    // Requirement 2: Reload from disk -> Confirm persistence across refresh
    // -------------------------------------------------------------
    console.log('\n[Test 2] Simulating server reload / page refresh to verify persistent storage...');
    const diskContent = fs.readFileSync(DB_FILE, 'utf-8');
    const parsedFromDisk: InvestigationRecord[] = JSON.parse(diskContent);
    if (parsedFromDisk.length !== 3) throw new Error(`Expected 3 items on disk, got ${parsedFromDisk.length}`);
    const foundItem2 = parsedFromDisk.find(r => r.id === 'TL-TEST-002');
    if (!foundItem2 || foundItem2.clearVerdictStatus !== 'FAKE') throw new Error('Data corrupted on disk persistence');
    console.log('✓ PASS: All investigations correctly persisted on disk across restarts.');

    // -------------------------------------------------------------
    // Requirement 3: Open a single saved investigation
    // -------------------------------------------------------------
    console.log('\n[Test 3] Retrieving single investigation by unique ID...');
    const single = await getInvestigation('TL-TEST-001');
    if (!single) throw new Error('Could not retrieve TL-TEST-001');
    if (!single.dossier || single.dossier.sources.length === 0) throw new Error('Dossier or sources missing');
    console.log(`✓ PASS: Full investigation record retrieved with title: "${single.dossier.title}" and ${single.dossier.sources.length} sources.`);

    // -------------------------------------------------------------
    // Requirement 6: Check dashboard statistics calculations
    // -------------------------------------------------------------
    console.log('\n[Test 6] Verifying dashboard statistics calculations...');
    const stats = await getStatistics();
    if (stats.total !== 3) throw new Error(`Expected total 3, got ${stats.total}`);
    if (stats.trueCount !== 1) throw new Error(`Expected 1 true claim, got ${stats.trueCount}`);
    if (stats.fakeCount !== 1) throw new Error(`Expected 1 fake claim, got ${stats.fakeCount}`);
    if (stats.misleadingCount !== 1) throw new Error(`Expected 1 misleading claim, got ${stats.misleadingCount}`);

    // Exact percentages: 1/3 = 33.3%
    if (stats.truePercent !== 33.3) throw new Error(`Expected truePercent 33.3%, got ${stats.truePercent}%`);
    if (stats.fakePercent !== 33.3) throw new Error(`Expected fakePercent 33.3%, got ${stats.fakePercent}%`);
    console.log(`✓ PASS: Statistics accurate: Total=${stats.total}, True=${stats.truePercent}%, Fake=${stats.fakePercent}%, Misleading=${stats.misleadingPercent}%.`);

    // -------------------------------------------------------------
    // Requirement 4: Delete an individual investigation
    // -------------------------------------------------------------
    console.log('\n[Test 4] Deleting individual investigation TL-TEST-002 (Fake recharge)...');
    const deleteResult = await deleteInvestigation('TL-TEST-002');
    if (!deleteResult) throw new Error('deleteInvestigation returned false');

    const historyAfterDelete = await listInvestigations();
    if (historyAfterDelete.length !== 2) throw new Error(`Expected 2 records after deletion, got ${historyAfterDelete.length}`);
    if (historyAfterDelete.some(r => r.id === 'TL-TEST-002')) throw new Error('Deleted item TL-TEST-002 still found in history');
    if (!historyAfterDelete.some(r => r.id === 'TL-TEST-001') || !historyAfterDelete.some(r => r.id === 'TL-TEST-003')) {
      throw new Error('Other records were mistakenly deleted');
    }
    console.log('✓ PASS: Selected record deleted; remaining records preserved intact.');

    // -------------------------------------------------------------
    // Requirement 5: Refresh after deletion -> Confirm permanently removed
    // -------------------------------------------------------------
    console.log('\n[Test 5] Verifying deletion permanence on disk...');
    const diskAfterDelete = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    if (diskAfterDelete.length !== 2) throw new Error('Disk file still contains deleted item');
    if (diskAfterDelete.some((r: any) => r.id === 'TL-TEST-002')) throw new Error('Deleted item TL-TEST-002 found on disk');
    console.log('✓ PASS: Deletion confirmed permanent on disk.');

    // Recalculated stats after delete: 2 records (1 true, 1 misleading) -> 50% each
    const statsAfterDelete = await getStatistics();
    if (statsAfterDelete.total !== 2) throw new Error(`Expected 2 total after deletion, got ${statsAfterDelete.total}`);
    if (statsAfterDelete.truePercent !== 50 || statsAfterDelete.misleadingPercent !== 50) {
      throw new Error(`Expected 50% / 50%, got True=${statsAfterDelete.truePercent}%, Misleading=${statsAfterDelete.misleadingPercent}%`);
    }
    console.log(`✓ PASS: Statistics immediately updated after deletion: Total=${statsAfterDelete.total}, True=${statsAfterDelete.truePercent}%, Fake=${statsAfterDelete.fakePercent}%.`);

    // -------------------------------------------------------------
    // Requirement 8: Failed investigations must not count as verified
    // -------------------------------------------------------------
    console.log('\n[Test 8] Testing that failed investigations are not counted as successful verifications...');
    const failedItem: InvestigationRecord = {
      id: 'TL-TEST-FAIL-001',
      originalInput: 'Network timeout during live search',
      extractedText: '',
      inputType: 'text',
      verdict: 'unverified',
      clearVerdictStatus: 'UNVERIFIED',
      verdictLabel: 'UNVERIFIED',
      confidenceScore: 0,
      language: 'en',
      status: 'failed',
      errorMessage: 'Network timeout during primary search provider inquiry',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dossier: createSampleDossier('TL-TEST-FAIL-001', 'Network timeout during live search', 'unverified', 'UNVERIFIED'),
    };
    await saveInvestigation(failedItem);

    const statsWithFailed = await getStatistics();
    if (statsWithFailed.total !== 2) {
      throw new Error(`Failed investigation counted in verified stats! Expected total=2, got ${statsWithFailed.total}`);
    }
    console.log('✓ PASS: Failed investigations are excluded from verified statistics.');

    // Clean up test items and leave empty database or restore
    await deleteInvestigation('TL-TEST-001');
    await deleteInvestigation('TL-TEST-003');
    await deleteInvestigation('TL-TEST-FAIL-001');

    console.log('\n====================================================');
    console.log('🎉 ALL 8 VERIFICATION TEST REQUIREMENTS PASSED!');
    console.log('====================================================');
  } finally {
    // If backup was empty array, keep clean empty database
    try {
      if (backup && backup !== '[]') {
        fs.writeFileSync(DB_FILE, backup, 'utf-8');
      } else {
        fs.writeFileSync(DB_FILE, '[]', 'utf-8');
      }
    } catch {
      // Ignore
    }
  }
}

runTestSuite().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
