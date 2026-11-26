import assert from 'node:assert/strict';
import type { ClaimDossier } from '../frontend/src/types.ts';
import {
  normalizeClaimInputText,
  rankSimilarArchivedClaims,
  compareNewClaimWithArchive,
} from '../frontend/src/utils/claimComparator.ts';

function makeArchiveDossier(overrides: Partial<ClaimDossier>): ClaimDossier {
  return {
    id: overrides.id || 'TL-TEST-001',
    title: overrides.title || 'Sample Archived Record',
    originalClaim: overrides.originalClaim || 'Sample archived claim.',
    verdict: overrides.verdict || 'verified_true',
    clearVerdictStatus: overrides.clearVerdictStatus || 'REAL',
    verdictLabel: overrides.verdictLabel || 'TRUE NEWS',
    verdictSubtitle: overrides.verdictSubtitle || 'Verified',
    confidenceScore: overrides.confidenceScore ?? 92,
    timeAgo: '2h ago',
    category: overrides.category || 'general',
    sourceEntity: 'TruthLens Archive',
    languages: ['en'],
    summary: overrides.summary || {
      en: 'Confirmed by official records.',
      kn: '',
      hi: '',
    },
    debunkExplanation: overrides.debunkExplanation || {
      en: 'Confirmed by official records.',
      kn: '',
      hi: '',
    },
    spokenAudioScript: { en: '', kn: '', hi: '' },
    whatsappDebunkNote: { en: '', kn: '', hi: '' },
    sources: overrides.sources || [],
    redFlags: [],
    timeline: [],
    originVector: 'Web Search',
  };
}

function runSuite() {
  let passed = 0;
  const check = (name: string, fn: () => void) => {
    fn();
    passed++;
    console.log(`PASS: ${name}`);
  };

  const archive: ClaimDossier[] = [
    makeArchiveDossier({
      id: 'TL-CHANDRAYAAN-3',
      title: 'ISRO Chandrayaan-3 Lunar South Pole Landing',
      originalClaim: "ISRO's Chandrayaan-3 soft-landed near the lunar south pole in August 2023.",
      verdict: 'verified_true',
      clearVerdictStatus: 'REAL',
      verdictLabel: 'TRUE NEWS',
      category: 'space',
      summary: {
        en: 'Confirmed: ISRO Chandrayaan-3 achieved a soft landing near the lunar south pole on August 23, 2023.',
        kn: '',
        hi: '',
      },
    }),
    makeArchiveDossier({
      id: 'TL-SAMANTHA-TWINS',
      title: 'Actress Samantha Ruth Prabhu Birth Claim',
      originalClaim: 'Actress Samantha Ruth Prabhu gave birth to twins.',
      verdict: 'false',
      clearVerdictStatus: 'FAKE',
      verdictLabel: 'FALSE NEWS',
      category: 'general',
      summary: {
        en: 'False claim. Verified reports state Samantha Ruth Prabhu welcomed her first baby boy named Dev, not twins.',
        kn: '',
        hi: '',
      },
    }),
    makeArchiveDossier({
      id: 'TL-PINK-LINE',
      title: 'Namma Metro Pink Line Elevated Stretch Opening',
      originalClaim:
        'The 7.5-km elevated stretch of the Pink Line between Kalena Agrahara and S.G. Palya was inaugurated on November 13, 2026.',
      verdict: 'verified_true',
      clearVerdictStatus: 'REAL',
      verdictLabel: 'TRUE NEWS',
      category: 'governance',
      summary: {
        en: 'Confirmed by BMRCL and official inauguration notices for November 13, 2026.',
        kn: '',
        hi: '',
      },
    }),
  ];

  check('1. PascalCase normalization splits combined proper names cleanly', () => {
    assert.equal(
      normalizeClaimInputText('Actress SamanthaRuthPrabhu has given birth to twins'),
      'Actress Samantha Ruth Prabhu has given birth to twins'
    );
  });

  check('2. Similarity ranking surfaces closest archived claim first', () => {
    const ranked = rankSimilarArchivedClaims(
      'Chandrayaan-3 touched down on the Moon south pole in 2023',
      archive
    );
    assert.equal(ranked[0].dossier.id, 'TL-CHANDRAYAAN-3');
    assert.ok(ranked[0].similarityScore >= 50, `Expected high similarity, got ${ranked[0].similarityScore}`);
    assert.equal(ranked[0].comparisonPreviewStatus, 'consistent');
  });

  check('3. Paraphrase consistency detected as ENTAILMENT / consistent', () => {
    const res = compareNewClaimWithArchive(
      'Chandrayaan-3 successfully touched down on the lunar south pole in 2023',
      archive[0]
    );
    assert.equal(res.overallStatus, 'consistent');
    assert.equal(res.nliResult.label, 'ENTAILMENT');
    assert.ok(res.sharedTerms.length >= 3);
    assert.equal(
      res.dimensions.find((d) => d.key === 'timeframe')?.status,
      'match'
    );
  });

  check('4. Event year conflict flagged as contradiction with conflicting token highlight', () => {
    const res = compareNewClaimWithArchive(
      'ISRO Chandrayaan-3 soft-landed near the lunar south pole in 2021',
      archive[0]
    );
    assert.equal(res.overallStatus, 'contradictory');
    assert.equal(res.nliResult.label, 'CONTRADICTION');
    assert.equal(
      res.dimensions.find((d) => d.key === 'timeframe')?.status,
      'conflict'
    );
    assert.ok(
      res.newTokens.some((t) => t.kind === 'conflict' && t.text === '2021'),
      'Expected 2021 highlighted as conflict'
    );
    assert.ok(res.archiveVerdictWarning?.includes('TRUE NEWS'));
  });

  check('5. Exclusive cardinality contradiction + PascalCase + finding alignment check', () => {
    const res = compareNewClaimWithArchive(
      'Actress SamanthaRuthPrabhu welcomed her first child, a baby boy named Dev.',
      archive[1]
    );
    assert.equal(res.overallStatus, 'contradictory');
    assert.equal(res.nliResult.label, 'CONTRADICTION');
    assert.equal(
      res.dimensions.find((d) => d.key === 'cardinality')?.status,
      'conflict'
    );
    assert.equal(res.findingAlignment?.label, 'ENTAILMENT');
    assert.ok(res.archiveVerdictWarning?.includes('verified investigation summary'));
  });

  check('6. Matching an archived FALSE NEWS claim flags debunk warning explicitly', () => {
    const res = compareNewClaimWithArchive(
      'Actress SamanthaRuthPrabhu has delivered twins',
      archive[1]
    );
    assert.equal(res.overallStatus, 'consistent');
    assert.ok(res.headline.includes('False Claim'));
    assert.ok(res.archiveVerdictWarning?.includes('FALSE NEWS'));
  });

  check('7. Prospective expectation vs completed birth directional alignment', () => {
    // Expecting NOW conflicts with archived completed birth
    const stillExpecting = compareNewClaimWithArchive(
      'Samantha Ruth Prabhu is expecting twins',
      archive[1]
    );
    assert.equal(stillExpecting.overallStatus, 'contradictory');
    assert.equal(stillExpecting.nliResult.label, 'CONTRADICTION');

    // Completed claim against prospective/proposed archive stays inconclusive (NEUTRAL)
    const prospectiveArchive = makeArchiveDossier({
      id: 'TL-PINK-PLANNED',
      title: 'Pink Line Expected Opening',
      originalClaim: 'The Pink Line elevated stretch is expected to open to passengers next year.',
      verdict: 'verified_true',
      clearVerdictStatus: 'REAL',
    });
    const completedVsPlanned = compareNewClaimWithArchive(
      'The Pink Line elevated stretch was inaugurated and opened to passengers.',
      prospectiveArchive
    );
    assert.equal(completedVsPlanned.overallStatus, 'inconclusive');
    assert.equal(completedVsPlanned.nliResult.label, 'NEUTRAL');
  });

  check('8. Numbered entity distinction (Chandrayaan-1 vs Chandrayaan-3) stays non-entailed', () => {
    const ranked = rankSimilarArchivedClaims(
      'Chandrayaan-1 soft-landed near the lunar south pole in August 2023',
      archive
    );
    const res = compareNewClaimWithArchive(
      'Chandrayaan-1 soft-landed near the lunar south pole in August 2023',
      archive[0]
    );
    assert.equal(ranked[0].dossier.id, 'TL-CHANDRAYAAN-3');
    assert.notEqual(res.overallStatus, 'consistent');
  });

  console.log(`\nAll ${passed} claim comparison tests passed.`);
}

runSuite();
