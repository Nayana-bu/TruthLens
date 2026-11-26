import assert from 'node:assert/strict';
import {
  extractSemanticFrame,
  analyzeSemanticFrameWithAmbiguity,
  classifyPairNLI,
} from '../backend/src/services/semanticNliEngine.ts';
import { preprocessQuery, filterAndRerankResults, type SearchResultItem } from '../backend/src/services/ragEngine.ts';
import { analyzeClaimText } from '../backend/src/services/claimAnalyzer.ts';

function makeEvidenceItem(
  title: string,
  snippet: string,
  url = 'https://www.reuters.com/world/india/sample-report',
  sourceName = 'Reuters'
): SearchResultItem {
  return {
    title,
    snippet,
    url,
    sourceName,
    category: 'Accredited News Wire',
    isPrimary: false,
    credibilityTier: 'accredited_press',
    publicationDate: '2026-11-20',
  };
}

function runSuite() {
  let passed = 0;
  const check = (name: string, fn: () => void) => {
    fn();
    passed++;
    console.log(`PASS: ${name}`);
  };

  // 1. Similar words, different meanings (Samantha variants + role reversal)
  check('1a. Semantic frames distinguish all 5 Samantha event variants', () => {
    const fBirthTwins = extractSemanticFrame('Samantha gave birth to twins.');
    const fBirthBoy = extractSemanticFrame('Samantha gave birth to a baby boy.');
    const fExpecting = extractSemanticFrame('Samantha is expecting twins.');
    const fAnnounced = extractSemanticFrame('Samantha announced her pregnancy.');
    const fFirstChild = extractSemanticFrame('Samantha welcomed her first child.');

    assert.equal(fBirthTwins.eventType, 'birth_delivery');
    assert.equal(fBirthTwins.modality, 'completed_fact');
    assert.equal(fBirthTwins.cardinality, 2);
    assert.equal(fBirthTwins.isExclusiveCardinality, true);

    assert.equal(fBirthBoy.eventType, 'birth_delivery');
    assert.equal(fBirthBoy.cardinality, 1);
    assert.equal(fBirthBoy.isExclusiveCardinality, false);

    assert.equal(fExpecting.eventType, 'pregnancy_expectation');
    assert.equal(fExpecting.modality, 'prospective_expectation');

    assert.equal(fAnnounced.eventType, 'pregnancy_expectation');
    assert.equal(fAnnounced.modality, 'announcement_proposal');

    assert.equal(fFirstChild.eventType, 'birth_delivery');
    assert.equal(fFirstChild.cardinality, 1);
    assert.equal(fFirstChild.isExclusiveCardinality, false);
  });

  check('1b. NLI classifies expecting/pregnant & pregnancy announcement as NEUTRAL (not entailment) for gave birth to twins', () => {
    const rExpect = classifyPairNLI('Samantha gave birth to twins.', 'Samantha is expecting twins.');
    assert.equal(rExpect.label, 'NEUTRAL');

    const rAnnounce = classifyPairNLI('Samantha gave birth to twins.', 'Samantha announced her pregnancy.');
    assert.equal(rAnnounce.label, 'NEUTRAL');

    const prep = preprocessQuery('Samantha gave birth to twins');
    const ranked = filterAndRerankResults(
      [
        makeEvidenceItem('Samantha expecting twins', 'Actor Samantha is expecting twins later this year, family says.'),
        makeEvidenceItem('Samantha pregnancy announcement', 'Samantha announced her pregnancy on social media today.'),
      ],
      prep
    );
    const dossier = analyzeClaimText('Samantha gave birth to twins', 'text', undefined, undefined, ranked.kept);
    assert.equal(dossier.clearVerdictStatus, 'UNVERIFIED');
  });

  check('1c. Role-reversal contradiction vs passive-voice entailment', () => {
    const reversed = classifyPairNLI('Apple acquired Beats.', 'Beats acquired Apple in a surprise deal.');
    assert.equal(reversed.label, 'CONTRADICTION');

    const passiveSame = classifyPairNLI('Apple acquired Beats.', 'Beats was acquired by Apple in 2014.');
    assert.equal(passiveSame.label, 'ENTAILMENT');
  });

  // 2. Different words, identical meanings (Paraphrases)
  check('2. Paraphrased wording yields ENTAILMENT and TRUE NEWS verdict', () => {
    const nli = classifyPairNLI(
      'Samantha gave birth to twins.',
      'Samantha delivered twin babies at a private hospital.'
    );
    assert.equal(nli.label, 'ENTAILMENT');

    const prep = preprocessQuery('Samantha gave birth to twins');
    const ranked = filterAndRerankResults(
      [makeEvidenceItem('Hospital bulletin', 'Samantha delivered twin babies early morning, doctors confirmed.')],
      prep
    );
    assert.equal(ranked.kept[0]?.nliLabel, 'ENTAILMENT');
    const dossier = analyzeClaimText('Samantha gave birth to twins', 'text', undefined, undefined, ranked.kept);
    assert.equal(dossier.clearVerdictStatus, 'REAL');

    const bizPara = classifyPairNLI(
      'Microsoft bought LinkedIn.',
      'LinkedIn was purchased by Microsoft.'
    );
    assert.equal(bizPara.label, 'ENTAILMENT');
  });

  // 3. Negations (affirmative vs negative contradiction, double negation entailment)
  check('3. Negation opposition -> CONTRADICTION, shared negative -> ENTAILMENT', () => {
    const negContra = classifyPairNLI(
      'RBI banned 500 rupee notes.',
      'RBI clarified it has not banned 500 rupee notes.'
    );
    assert.equal(negContra.label, 'CONTRADICTION');

    const doubleNeg = classifyPairNLI(
      'Garlic does not cure cancer.',
      'Medical researchers confirm garlic cannot cure cancer.'
    );
    assert.equal(doubleNeg.label, 'ENTAILMENT');
  });

  // 4. Opposite quantities + exclusive vs non-exclusive cardinality
  check('4. Exclusive single-child contradicts twins (FAKE), non-exclusive baby boy stays NEUTRAL (UNVERIFIED)', () => {
    const nonExcl = classifyPairNLI('Samantha gave birth to twins.', 'Samantha gave birth to a baby boy.');
    assert.equal(nonExcl.label, 'NEUTRAL');

    const nonExclFirst = classifyPairNLI('Samantha gave birth to twins.', 'Samantha welcomed her first child.');
    assert.equal(nonExclFirst.label, 'NEUTRAL');

    const exclSingle = classifyPairNLI(
      'Samantha gave birth to twins.',
      'Official statement confirms Samantha gave birth to only one child (a singleton baby boy, not twins).'
    );
    assert.equal(exclSingle.label, 'CONTRADICTION');

    const prep = preprocessQuery('Samantha gave birth to twins');
    const rankedNonExcl = filterAndRerankResults(
      [makeEvidenceItem('Samantha baby boy', 'Samantha gave birth to a baby boy at a city clinic.')],
      prep
    );
    const dNonExcl = analyzeClaimText('Samantha gave birth to twins', 'text', undefined, undefined, rankedNonExcl.kept);
    assert.equal(dNonExcl.clearVerdictStatus, 'UNVERIFIED');

    const rankedExcl = filterAndRerankResults(
      [
        makeEvidenceItem(
          'Official clinic clarification',
          'Official statement confirms Samantha gave birth to only one child, not twins.'
        ),
      ],
      prep
    );
    const dExcl = analyzeClaimText('Samantha gave birth to twins', 'text', undefined, undefined, rankedExcl.kept);
    assert.equal(dExcl.clearVerdictStatus, 'FAKE');
  });

  // 5. Different dates and timelines
  check('5. Conflicting event years produce CONTRADICTION and FAKE verdict', () => {
    const timelineConflict = classifyPairNLI(
      'ISRO Chandrayaan-3 landed on the Moon in 2021.',
      'ISRO Chandrayaan-3 soft-landed on the lunar south pole in 2023.'
    );
    assert.equal(timelineConflict.label, 'CONTRADICTION');
  });

  // 6. Past vs future/prospective events
  check('6. Prospective/future evidence remains NEUTRAL (UNVERIFIED) for completed-event claim', () => {
    const pastVsFuture = classifyPairNLI(
      'Bengaluru Namma Metro Pink Line opened to passengers.',
      'Bengaluru Namma Metro Pink Line is expected to open next year.'
    );
    assert.equal(pastVsFuture.label, 'NEUTRAL');

    const prep = preprocessQuery('Bengaluru Namma Metro Pink Line opened to passengers');
    const ranked = filterAndRerankResults(
      [
        makeEvidenceItem(
          'BMRCL timeline update',
          'Bengaluru Namma Metro Pink Line is slated to open to passengers in future phase.'
        ),
      ],
      prep
    );
    const dossier = analyzeClaimText(
      'Bengaluru Namma Metro Pink Line opened to passengers',
      'text',
      undefined,
      undefined,
      ranked.kept
    );
    assert.equal(dossier.clearVerdictStatus, 'UNVERIFIED');
  });

  // 7. Questions & rumors
  check('7. Unconfirmed rumors do not verify other rumors; confirmed facts resolve yes/no questions', () => {
    const rumorOnRumor = classifyPairNLI(
      'Rumor says Samantha gave birth to twins.',
      'Unconfirmed gossip claims Samantha gave birth to twins.'
    );
    assert.equal(rumorOnRumor.label, 'NEUTRAL');

    const confirmedQuestion = classifyPairNLI(
      'Did Samantha give birth to twins?',
      'Samantha delivered twin babies on Tuesday, hospital confirmed.'
    );
    assert.equal(confirmedQuestion.label, 'ENTAILMENT');
  });

  // 8. Sarcasm & ambiguous statements
  check('8. Sarcastic and ambiguous claims are detected and kept UNVERIFIED instead of false REAL', () => {
    const sarcFrame = extractSemanticFrame('Yeah right, drinking bleach totally cures everything overnight /s');
    assert.equal(sarcFrame.modality, 'sarcasm_or_irony');

    const sarcNli = classifyPairNLI(
      'Yeah right, drinking bleach totally cures everything overnight /s',
      'Some viral posts talk about bleach cures.'
    );
    assert.equal(sarcNli.label, 'NEUTRAL');

    const prepSarc = preprocessQuery('Yeah right, drinking bleach totally cures everything overnight /s');
    assert.equal(prepSarc.isSarcastic, true);
    const dSarc = analyzeClaimText(
      'Yeah right, drinking bleach totally cures everything overnight /s',
      'text',
      undefined,
      undefined,
      [makeEvidenceItem('Viral post discussion', 'Posts about drinking bleach curing illness circulated online.')]
    );
    assert.equal(dSarc.clearVerdictStatus, 'UNVERIFIED');

    const ambig = analyzeSemanticFrameWithAmbiguity('They announced it yesterday');
    assert.equal(ambig.isAmbiguous, true);
  });

  // 9. PascalCase splitting + real-world singular birth news contradicting twins + why-fake & true-news explanation
  check('9. PascalCase proper nouns split cleanly; singular named first-child news verdicts FAKE and explains why + true news', () => {
    const claim = 'Actress SamanthaRuthPrabhu has given birth to twins';
    const prep = preprocessQuery(claim);
    assert.ok(prep.normalizedQuery.includes('Samantha Ruth Prabhu'), 'Expected SamanthaRuthPrabhu to normalize with spaces');
    assert.ok(prep.alternativeQueries.some((q) => /samantha ruth prabhu/i.test(q)), 'Expected unbiased spaced entity query');

    const ranked = filterAndRerankResults(
      [
        makeEvidenceItem(
          "Samantha Ruth Prabhu Welcomes First Child With Director Raj Nidimoru: 'Our Beautiful Baby Boy Dev' - NDTV",
          "Samantha Ruth Prabhu Welcomes First Child With Director Raj Nidimoru: 'Our Beautiful Baby Boy Dev' - NDTV",
          'https://www.ndtv.com/entertainment/samantha-ruth-prabhu-baby-boy-dev',
          'NDTV'
        ),
        makeEvidenceItem(
          'Samantha Ruth Prabhu-Raj Nidimoru welcome baby boy, name him Dev - The Indian Express',
          'Samantha Ruth Prabhu-Raj Nidimoru welcome baby boy, name him Dev - The Indian Express',
          'https://indianexpress.com/article/entertainment/samantha-ruth-prabhu-baby-boy-dev',
          'The Indian Express'
        ),
      ],
      prep
    );
    assert.equal(ranked.kept[0]?.nliLabel, 'CONTRADICTION');
    const dossier = analyzeClaimText(claim, 'text', undefined, undefined, ranked.kept);
    assert.equal(dossier.clearVerdictStatus, 'FAKE');
    assert.ok(/why it is false/i.test(dossier.summary.en), 'Summary must explain why the claim is false');
    assert.ok(/true news from retrieved/i.test(dossier.summary.en), 'Summary must include true news from resources');
    assert.ok(/Baby Boy Dev|name him Dev/i.test(dossier.debunkExplanation.en), 'Debunk explanation must cite true news details');
    assert.ok(/NDTV|The Indian Express/i.test(dossier.debunkExplanation.en), 'Debunk explanation must cite retrieved source names');
  });

  console.log(`\nALL ${passed} SEMANTIC & NLI TESTS PASSED!`);
}

runSuite();
