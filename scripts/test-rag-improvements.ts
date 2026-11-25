import assert from 'node:assert/strict';
import {
  preprocessQuery,
  executeMultiQuerySearch,
  filterAndRerankResults,
  aggregateEvidenceContext,
  evaluateEvidenceForVerdict,
  computeSemanticSimilarity,
  type SearchResultItem,
} from '../src/utils/ragEngine.ts';
import { analyzeClaimText } from '../src/utils/claimAnalyzer.ts';

async function runTests() {
  console.log('====================================================================');
  console.log('     TRUTHLENS RAG IMPROVEMENT & RETRIEVAL ACCURACY TEST SUITE      ');
  console.log('====================================================================\n');

  let passed = 0;
  let failed = 0;

  async function testCase(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   Reason: ${err?.message || err}`);
      failed++;
    }
  }

  // ------------------------------------------------------------------
  // SECTION A: Intelligent Query Understanding & Typo/Grammar Handling
  // ------------------------------------------------------------------
  await testCase('A1. Typo correction preserves original input ("Who is presdent of india?")', () => {
    const prep = preprocessQuery('Who is presdent of india?');
    assert.equal(prep.originalInput, 'Who is presdent of india?');
    assert.equal(prep.normalizedQuery.toLowerCase(), 'who is president of india?');
    assert.equal(prep.isQuestion, true);
    assert.equal(prep.hasNegation, false);
    assert.ok(prep.correctionsApplied.some((c) => c.from === 'presdent' && c.to === 'president'));
  });

  await testCase('A2. Missing preposition & punctuation ("who is the president india")', () => {
    const prep = preprocessQuery('who is the president india');
    assert.equal(prep.normalizedQuery.toLowerCase(), 'who is the president of india');
    assert.equal(prep.isQuestion, true);
    assert.ok(prep.entities.locations.some((l) => l.toLowerCase() === 'india'));
  });

  await testCase('A3. Fragmented keyword query ("india president name")', () => {
    const prep = preprocessQuery('india president name');
    assert.equal(prep.normalizedQuery.toLowerCase(), 'president of india');
    assert.equal(prep.isQuestion, true);
    assert.ok(prep.alternativeQueries.some((q) => q.toLowerCase().includes('president of india')));
  });

  await testCase('A4. Negation NEVER altered during spell correction ("narendr moid is not prim minstr of indai!!!")', () => {
    const prep = preprocessQuery('  narendr   moid is not prim minstr of indai!!!  ');
    assert.equal(prep.hasNegation, true);
    assert.ok(prep.normalizedQuery.toLowerCase().includes('narendra modi is not prime minister of india'));
    assert.ok(prep.entities.people.some((p) => p.toLowerCase().includes('narendra modi')));
  });

  await testCase('A5. Kannada & Hindi characters preserved (Unicode-safe tokenization)', () => {
    const kn = preprocessQuery('ಭಾರತದ ರಾಷ್ಟ್ರಪತಿ ಯಾರು?');
    const hi = preprocessQuery('भारत के राष्ट्रपति कौन हैं?');
    assert.equal(kn.detectedLanguage, 'kn');
    assert.equal(hi.detectedLanguage, 'hi');
    assert.ok(kn.normalizedQuery.includes('ರಾಷ್ಟ್ರಪತಿ'));
    assert.ok(hi.normalizedQuery.includes('राष्ट्रपति'));
    assert.ok(kn.alternativeQueries.some((q) => q === 'President of India'));
    assert.ok(hi.alternativeQueries.some((q) => q === 'President of India'));
  });

  // ------------------------------------------------------------------
  // SECTION B: Relevance Gate, Outdated Tagging & Context Filtering
  // ------------------------------------------------------------------
  await testCase('B1. Hybrid filter rejects irrelevant noise & tags outdated sources', () => {
    const prep = preprocessQuery('Who is presdent of india?');
    const mockRaw: SearchResultItem[] = [
      {
        title: 'Droupadi Murmu - President of India',
        url: 'https://presidentofindia.nic.in/',
        snippet: 'Droupadi Murmu is an Indian politician serving as the 15th and current President of India since July 2022.',
        publicationDate: '2025',
        sourceName: 'Official President of India Portal',
        category: 'Official',
        isPrimary: true,
        credibilityTier: 'official_primary',
      },
      {
        title: 'Best Chocolate Cake Recipe 2019',
        url: 'https://bakingblog.example.com/cake',
        snippet: 'Mix flour, sugar, cocoa powder, and butter in a large bowl and bake for 30 minutes.',
        publicationDate: 'Jan 12, 2019',
        sourceName: 'Baking Blog',
        category: 'Lifestyle',
        isPrimary: false,
        credibilityTier: 'secondary_web',
      },
      {
        title: 'Old 2018 Archive Notice',
        url: 'https://archive.example.com/2018-president-india',
        snippet: 'Archive coverage mentioning president of India ceremonial tour in 2018.',
        publicationDate: 'Mar 5, 2018',
        sourceName: 'Archive Press',
        category: 'News',
        isPrimary: false,
        credibilityTier: 'secondary_web',
      },
    ];

    const filtered = filterAndRerankResults(mockRaw, prep);
    assert.equal(filtered.filteredIrrelevantCount, 1);
    assert.ok(filtered.kept.some((r) => r.url.includes('presidentofindia.nic.in')));
    assert.ok(!filtered.kept.some((r) => r.url.includes('bakingblog')));
    const oldItem = filtered.kept.find((r) => r.url.includes('2018-president-india'));
    assert.equal(oldItem?.temporalStatus, 'outdated');

    const ctx = aggregateEvidenceContext(filtered.kept, prep.extractedClaims, 'President Secretariat', prep);
    assert.ok(ctx.includes('Droupadi Murmu'));
    assert.ok(ctx.includes('[HISTORICAL/OLD:'));
    assert.ok(ctx.length <= 6300);
  });

  await testCase('B2. Keyword-overlap trap rejected ("Rahul Gandhi is President of India" -> FAKE, not REAL)', () => {
    const prep = preprocessQuery('Rahul Gandhi is the President of India');
    const mockRaw: SearchResultItem[] = [
      {
        title: 'Droupadi Murmu - President of India',
        url: 'https://en.wikipedia.org/wiki/President_of_India',
        snippet: 'Droupadi Murmu is the 15th and current President of India since 25 July 2022.',
        publicationDate: '2026',
        sourceName: 'Wikipedia (EN): President of India',
        category: 'Reference',
        isPrimary: false,
        credibilityTier: 'factcheck_org',
      },
    ];
    const filtered = filterAndRerankResults(mockRaw, prep);
    const evalRes = evaluateEvidenceForVerdict(prep, filtered.kept, 'operational');
    assert.equal(evalRes.recommendedVerdict, 'false');

    const dossier = analyzeClaimText('Rahul Gandhi is the President of India', 'text', undefined, undefined, filtered.kept);
    assert.equal(dossier.verdict, 'false');
    assert.equal(dossier.clearVerdictStatus, 'FAKE');
  });

  await testCase('B3. Conflicting evidence handled properly -> Verification Pending (unverified) & preserves both sides', () => {
    const prep = preprocessQuery('RBI revised digital UPI fee limit to 1 percent for merchants');
    const mockConflicting: SearchResultItem[] = [
      {
        title: 'NPCI clarifies no UPI charges for general consumer bank transfers',
        url: 'https://pib.gov.in/npci-clarification',
        snippet: 'PIB Fact Check: NPCI clarified that no fee applies to standard bank-to-bank consumer UPI payments.',
        publicationDate: '2026',
        sourceName: 'PIB Fact Check',
        category: 'Official',
        isPrimary: true,
        credibilityTier: 'factcheck_org',
        stance: 'contradicts',
        relevanceScore: 0.72,
      },
      {
        title: 'NPCI interchange circular covers PPI wallet merchant transactions',
        url: 'https://www.thehindu.com/business/upi-ppi-interchange',
        snippet: 'UPI interchange charges apply strictly to prepaid payment instrument (PPI) wallet merchant transactions above Rs 2,000.',
        publicationDate: '2026',
        sourceName: 'The Hindu',
        category: 'Accredited Press',
        isPrimary: false,
        credibilityTier: 'accredited_press',
        stance: 'supports',
        relevanceScore: 0.70,
      },
    ];
    const evalRes = evaluateEvidenceForVerdict(prep, mockConflicting, 'operational');
    assert.equal(evalRes.recommendedVerdict, 'unverified');
    assert.equal(evalRes.hasConflict, true);
    const ctx = aggregateEvidenceContext(mockConflicting, prep.extractedClaims, 'RBI / NPCI', prep);
    assert.ok(ctx.includes('Polarity: CONTRADICTS'));
    assert.ok(ctx.includes('Polarity: SUPPORTS'));
  });

  // ------------------------------------------------------------------
  // SECTION C: Live End-to-End Retrieval & Verdict Consistency
  // ------------------------------------------------------------------
  const presidentQueries = [
    'Who is president of India?',
    'Who is presdent of india?',
    'who is the president india',
    'india president name',
  ];

  for (const q of presidentQueries) {
    await testCase(`C1. Live retrieval + verdict consistency for "${q}"`, async () => {
      const prep = preprocessQuery(q);
      const search = await executeMultiQuerySearch(prep.extractedClaims, prep.entities, q, prep);
      console.log(`   -> Queries run (${search.queryCount}): ${search.queriesRun.join(' | ')}`);
      console.log(`   -> Kept ${search.results.length} results. Top: "${search.results[0]?.title}" [${search.results[0]?.stance}]`);
      assert.ok(search.results.length >= 1, 'Expected at least 1 relevant live result');
      const combinedSnippets = search.results.map((r) => `${r.title} ${r.snippet}`).join(' ').toLowerCase();
      assert.ok(combinedSnippets.includes('murmu') || combinedSnippets.includes('president of india'), 'Expected President of India / Murmu evidence');

      const sources = search.results.map((r) => ({
        name: r.sourceName,
        category: r.category,
        status: r.stance === 'supports' ? ('confirmed' as const) : r.stance === 'contradicts' ? ('contradicted' as const) : ('corroborated' as const),
        details: r.snippet,
        url: r.url,
        publicationDate: r.publicationDate,
        isPrimary: r.isPrimary,
        credibilityTier: r.credibilityTier,
      }));
      const dossier = analyzeClaimText(q, 'text', undefined, sources, search.results);
      assert.equal(dossier.verdict, 'verified_true', `Expected verified_true for "${q}", got ${dossier.verdict}`);
      assert.equal(dossier.clearVerdictStatus, 'REAL');
    });
  }

  await testCase('C2. Live retrieval + verdict for negated typo false claim ("Narendr modi is not prime minster of indai")', async () => {
    const q = 'Narendr modi is not prime minster of indai';
    const prep = preprocessQuery(q);
    const search = await executeMultiQuerySearch(prep.extractedClaims, prep.entities, q, prep);
    console.log(`   -> Kept ${search.results.length} results. Top stance: ${search.results[0]?.stance}`);
    const dossier = analyzeClaimText(q, 'text', undefined, undefined, search.results);
    assert.equal(dossier.verdict, 'false');
    assert.equal(dossier.clearVerdictStatus, 'FAKE');
  });

  await testCase('C3. Live retrieval + verdict for true space claim ("ISRO Chandrayaan-3 landed near the lunar south pole")', async () => {
    const q = 'ISRO Chandrayaan-3 landed near the lunar south pole';
    const prep = preprocessQuery(q);
    const search = await executeMultiQuerySearch(prep.extractedClaims, prep.entities, q, prep);
    console.log(`   -> Kept ${search.results.length} results. Top: "${search.results[0]?.title}" [${search.results[0]?.stance}]`);
    assert.ok(search.results.length >= 1);
    const dossier = analyzeClaimText(q, 'text', undefined, undefined, search.results);
    assert.equal(dossier.verdict, 'verified_true');
  });

  await testCase('C4. Live insufficient-evidence claim returns UNVERIFIED (never FAKE)', async () => {
    const q = 'A farmer named Raghavendra in village Kalghatgi found a glowing silver meteorite in his well yesterday';
    const prep = preprocessQuery(q);
    const search = await executeMultiQuerySearch(prep.extractedClaims, prep.entities, q, prep);
    const dossier = analyzeClaimText(q, 'text', undefined, undefined, search.results);
    assert.equal(dossier.verdict, 'unverified');
    assert.equal(dossier.clearVerdictStatus, 'UNVERIFIED');
  });

  await testCase('C5. Live Kannada query ("ಭಾರತದ ರಾಷ್ಟ್ರಪತಿ ಯಾರು?") returns REAL with retrieved evidence', async () => {
    const q = 'ಭಾರತದ ರಾಷ್ಟ್ರಪತಿ ಯಾರು?';
    const prep = preprocessQuery(q);
    const search = await executeMultiQuerySearch(prep.extractedClaims, prep.entities, q, prep);
    console.log(`   -> Kannada retrieval kept ${search.results.length} results. Top: "${search.results[0]?.title}"`);
    assert.ok(search.results.length >= 1);
    const dossier = analyzeClaimText(q, 'text', undefined, undefined, search.results);
    assert.equal(dossier.verdict, 'verified_true');
    assert.equal(dossier.clearVerdictStatus, 'REAL');
  });

  await testCase('C6. Negated Kannada & Hindi claims evaluated with live RAG return FAKE (not REAL)', async () => {
    const knQuery = 'ನರೇಂದ್ರ ಮೋದಿ ಭಾರತದ ಪ್ರಧಾನಿ ಅಲ್ಲ';
    const hiQuery = 'नरेंद्र मोदी भारत के प्रधानमंत्री नहीं हैं';
    const knPrep = preprocessQuery(knQuery);
    const hiPrep = preprocessQuery(hiQuery);
    const knSearch = await executeMultiQuerySearch(knPrep.extractedClaims, knPrep.entities, knQuery, knPrep);
    const hiSearch = await executeMultiQuerySearch(hiPrep.extractedClaims, hiPrep.entities, hiQuery, hiPrep);
    const knFalse = analyzeClaimText(knQuery, 'text', undefined, undefined, knSearch.results);
    const hiFalse = analyzeClaimText(hiQuery, 'text', undefined, undefined, hiSearch.results);
    assert.equal(knFalse.verdict, 'false');
    assert.equal(knFalse.clearVerdictStatus, 'FAKE');
    assert.equal(hiFalse.verdict, 'false');
    assert.equal(hiFalse.clearVerdictStatus, 'FAKE');
  });

  await testCase('C7. Live Hindi query ("भारत के राष्ट्रपति कौन हैं?") retrieves evidence & returns REAL', async () => {
    const q = 'भारत के राष्ट्रपति कौन हैं?';
    const prep = preprocessQuery(q);
    const search = await executeMultiQuerySearch(prep.extractedClaims, prep.entities, q, prep);
    console.log(`   -> Hindi retrieval kept ${search.results.length} results. Top: "${search.results[0]?.title}"`);
    assert.ok(search.results.length >= 1);
    const dossier = analyzeClaimText(q, 'text', undefined, undefined, search.results);
    assert.equal(dossier.verdict, 'verified_true');
    assert.equal(dossier.clearVerdictStatus, 'REAL');
  });

  await testCase('C8. Semantic similarity captures meaning across typos & synonyms', () => {
    const simTypo = computeSemanticSimilarity(
      'who is president of india',
      'Droupadi Murmu is the current President of India'
    );
    const simUnrelated = computeSemanticSimilarity(
      'who is president of india',
      'Homemade strawberry jam recipe with sugar and lemon'
    );
    console.log(`   -> Semantic sim (on-topic=${simTypo}, off-topic=${simUnrelated})`);
    assert.ok(simTypo > simUnrelated * 2.5, 'Expected on-topic similarity much higher than off-topic');
  });

  await testCase('C9. Live news topic/headline queries ("pink line of bengaluru namma metro news", "mumbai coastal road opened") retrieve evidence & return REAL', async () => {
    for (const q of ['pink line of bengaluru namma metro news', 'mumbai coastal road opened']) {
      const prep = preprocessQuery(q);
      const search = await executeMultiQuerySearch(prep.extractedClaims, prep.entities, q, prep);
      assert.ok(search.results.length >= 2, `Expected >=2 results for "${q}"`);
      const dossier = analyzeClaimText(q, 'text', undefined, undefined, search.results);
      console.log(`   -> "${q}" => ${dossier.verdict} (${dossier.clearVerdictStatus}), top="${search.results[0]?.title}"`);
      assert.equal(dossier.verdict, 'verified_true', `Expected verified_true for "${q}", got ${dossier.verdict}`);
    }
  });

  await testCase('C10. Numeric/percentage conflict guard prevents false REAL ("RBI kept repo rate unchanged at 6.5 percent" vs 5.25% evidence)', () => {
    const prep = preprocessQuery('RBI kept repo rate unchanged at 6.5 percent');
    const mockRaw: SearchResultItem[] = [
      {
        title: 'Why RBI kept repo rate unchanged at 5.25% despite inflation',
        url: 'https://www.thehindu.com/business/rbi-repo-rate-5-25',
        snippet: 'The RBI Monetary Policy Committee kept the policy repo rate unchanged at 5.25% in its latest review.',
        publicationDate: '2026',
        sourceName: 'The Hindu',
        category: 'Accredited News Publication',
        isPrimary: false,
        credibilityTier: 'accredited_press',
      },
    ];
    const filtered = filterAndRerankResults(mockRaw, prep);
    assert.equal(filtered.kept[0]?.stance, 'contradicts');
    const dossier = analyzeClaimText('RBI kept repo rate unchanged at 6.5 percent', 'text', undefined, undefined, filtered.kept);
    assert.notEqual(dossier.verdict, 'verified_true');
  });

  await testCase('C11. Detailed multi-clause Pink Line news claim verifies REAL while mutated 15-km claim returns FAKE', async () => {
    const trueClaim = 'Pink Line Elevated Stretch Opens: The 7.5-km elevated stretch of the Pink Line between Kalena Agrahara and S.G. Palya was inaugurated on November 13 and opened to passengers on November 14, 2026';
    const prepTrue = preprocessQuery(trueClaim);
    assert.equal(prepTrue.extractedClaims.length, 1, 'Initials S.G. Palya should not split sentence prematurely');
    const searchTrue = await executeMultiQuerySearch(prepTrue.extractedClaims, prepTrue.entities, trueClaim, prepTrue);
    const dossierTrue = analyzeClaimText(trueClaim, 'text', undefined, undefined, searchTrue.results);
    console.log(`   -> True detailed Pink Line => ${dossierTrue.verdict} (${dossierTrue.clearVerdictStatus}, ${dossierTrue.confidenceScore}%)`);
    assert.equal(dossierTrue.verdict, 'verified_true');
    assert.equal(dossierTrue.clearVerdictStatus, 'REAL');

    const falseDistanceClaim = 'Pink Line Elevated Stretch Opens: The 15-km elevated stretch of the Pink Line between Kalena Agrahara and S.G. Palya was inaugurated on November 13 and opened to passengers on November 14, 2026';
    const prepFalse = preprocessQuery(falseDistanceClaim);
    const searchFalse = await executeMultiQuerySearch(prepFalse.extractedClaims, prepFalse.entities, falseDistanceClaim, prepFalse);
    const dossierFalse = analyzeClaimText(falseDistanceClaim, 'text', undefined, undefined, searchFalse.results);
    console.log(`   -> Mutated 15-km Pink Line => ${dossierFalse.verdict} (${dossierFalse.clearVerdictStatus}, ${dossierFalse.confidenceScore}%)`);
    assert.notEqual(dossierFalse.verdict, 'verified_true');
  });

  await testCase('C12. Diverse general TRUE NEWS vs FALSE NEWS vs Verification Pending claims across roles, dates, medals, health hoaxes, and currency', async () => {
    const generalCases: { claim: string; expected: 'REAL' | 'FAKE' | 'UNVERIFIED' }[] = [
      { claim: 'ISRO Chandrayaan-3 successfully landed near the lunar south pole in August 2023', expected: 'REAL' },
      { claim: 'Chandrayaan-3 landed on the Moon in 2021', expected: 'FAKE' },
      { claim: 'Donald Trump is the current President of the United States', expected: 'REAL' },
      { claim: 'Joe Biden is the current President of the United States', expected: 'FAKE' },
      { claim: 'Sundar Pichai is the CEO of Apple', expected: 'FAKE' },
      { claim: 'Neeraj Chopra won silver medal at Paris Olympics 2024', expected: 'REAL' },
      { claim: 'Neeraj Chopra won gold medal at Paris Olympics 2024', expected: 'FAKE' },
      { claim: 'RBI launched 5000 rupee currency note in India', expected: 'FAKE' },
      { claim: 'Drinking hot lemon water cures cancer according to WHO', expected: 'FAKE' },
      { claim: 'WHO declared mpox a public health emergency in 2024', expected: 'REAL' },
      { claim: 'Supreme Court of India upheld abrogation of Article 370', expected: 'REAL' },
      { claim: 'Government giving free 5G smartphone to all students yojana', expected: 'FAKE' },
      { claim: 'A resident in Chikmagalur found a 200-year-old silver crown in his backyard yesterday', expected: 'UNVERIFIED' },
    ];

    for (const c of generalCases) {
      const prep = preprocessQuery(c.claim);
      const search = await executeMultiQuerySearch(prep.extractedClaims, prep.entities, c.claim, prep);
      const dossier = analyzeClaimText(c.claim, 'text', undefined, undefined, search.results);
      console.log(`   -> [${c.expected}] got ${dossier.clearVerdictStatus} (${dossier.confidenceScore}%): "${c.claim.slice(0, 62)}"`);
      assert.equal(dossier.clearVerdictStatus, c.expected, `Expected ${c.expected} for "${c.claim}", got ${dossier.clearVerdictStatus}`);
    }

    // Also verify unrelated debunk guard: "Elon Musk bought Google" must NEVER return REAL or be refuted by unrelated Starlink fact-check
    const muskGoogle = 'Elon Musk bought Google';
    const muskPrep = preprocessQuery(muskGoogle);
    const muskSearch = await executeMultiQuerySearch(muskPrep.extractedClaims, muskPrep.entities, muskGoogle, muskPrep);
    const muskDossier = analyzeClaimText(muskGoogle, 'text', undefined, undefined, muskSearch.results);
    console.log(`   -> [NOT REAL] got ${muskDossier.clearVerdictStatus} (${muskDossier.confidenceScore}%): "${muskGoogle}"`);
    assert.notEqual(muskDossier.clearVerdictStatus, 'REAL', '"Elon Musk bought Google" must never be marked TRUE NEWS');
  });

  await testCase('C13. Multi-sentence foreign-leader diplomatic news preserves proper nouns (Balendra Shah) & distinguishes TRUE vs mutated $5.6B FAKE', async () => {
    const trueClaim = "India-Nepal Ties: India pledged $1.6 billion in flood relief for Nepal during Nepal Prime Minister Balendra Shah's visit to meet Prime Minister Narendra Modi. Leaders also flagged off a direct Ayodhya–Janakpur train link ahead of operations starting November 28";
    const prepTrue = preprocessQuery(trueClaim);
    assert.ok(
      !prepTrue.correctionsApplied.some((c) => c.from === 'Balendra'),
      'Proper noun "Balendra" must never be spell-corrupted'
    );
    assert.ok(prepTrue.entities.people.some((p) => p.includes('Balendra')), 'Should extract Balendra Shah');
    const searchTrue = await executeMultiQuerySearch(prepTrue.extractedClaims, prepTrue.entities, trueClaim, prepTrue);
    const dossierTrue = analyzeClaimText(trueClaim, 'text', undefined, undefined, searchTrue.results);
    console.log(`   -> True India-Nepal => ${dossierTrue.verdict} (${dossierTrue.clearVerdictStatus}, ${dossierTrue.confidenceScore}%)`);
    assert.equal(dossierTrue.clearVerdictStatus, 'REAL');

    const fakeAmountClaim = "India-Nepal Ties: India pledged $5.6 billion in flood relief for Nepal during Nepal Prime Minister Balendra Shah's visit to meet Prime Minister Narendra Modi. Leaders also flagged off a direct Ayodhya–Janakpur train link ahead of operations starting November 28";
    const prepFake = preprocessQuery(fakeAmountClaim);
    const searchFake = await executeMultiQuerySearch(prepFake.extractedClaims, prepFake.entities, fakeAmountClaim, prepFake);
    const dossierFake = analyzeClaimText(fakeAmountClaim, 'text', undefined, undefined, searchFake.results);
    console.log(`   -> Mutated $5.6B India-Nepal => ${dossierFake.verdict} (${dossierFake.clearVerdictStatus}, ${dossierFake.confidenceScore}%)`);
    assert.equal(dossierFake.clearVerdictStatus, 'FAKE');
  });

  console.log('\n====================================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('====================================================================');

  if (failed > 0) process.exit(1);
}

runTests();
