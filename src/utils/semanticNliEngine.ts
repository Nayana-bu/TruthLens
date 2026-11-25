import type { NLILabel, SemanticFrame } from '../types.ts';

export interface NLIPairResult {
  label: NLILabel;
  confidence: number;
  crossRelevanceScore: number;
  reason: string;
  claimFrame: SemanticFrame;
  evidenceFrame: SemanticFrame;
  structuralLock?: boolean;
}

export interface SemanticFrameAnalysis {
  frame: SemanticFrame;
  isAmbiguous: boolean;
  ambiguousReason?: string;
}

const FRAME_STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'as', 'into',
  'about', 'that', 'this', 'these', 'those', 'it', 'its', 'they', 'their',
  'her', 'his', 'our', 'your', 'she', 'he', 'we', 'you', 'and', 'or', 'but',
  'if', 'then', 'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would',
  'can', 'could', 'may', 'might', 'shall', 'should', 'must', 'who', 'what',
  'when', 'where', 'why', 'how', 'which', 'today', 'yesterday', 'tomorrow',
  'recently', 'just', 'now', 'currently', 'official', 'officially', 'report',
  'reports', 'news', 'breaking', 'claim', 'claims', 'source', 'sources',
]);

// Canonical semantic event patterns ordered from most specific / prospective to general completed actions
const EVENT_DEFINITIONS: {
  eventType: string;
  defaultAction: string;
  pattern: RegExp;
  inherentModality?: SemanticFrame['modality'];
}[] = [
  {
    eventType: 'pregnancy_expectation',
    defaultAction: 'expecting_pregnancy',
    pattern:
      /\b(?:is\s+expecting|are\s+expecting|expecting\s+(?:twins|triplets|a\s+baby|a\s+child|their\s+first|her\s+first|babies)|pregnant|pregnancy|announced\s+(?:her\s+|his\s+|their\s+)?pregnancy|due\s+to\s+give\s+birth|awaiting\s+(?:the\s+)?birth|baby\s+on\s+the\s+way)\b/i,
  },
  {
    eventType: 'birth_delivery',
    defaultAction: 'gave_birth',
    pattern:
      /\b(?:gave\s+birth|give\s+birth|given\s+birth|delivered\s+(?:twins|triplets|a\s+baby|a\s+child|twin\s+babies|baby|boy|girl|newborn)|welcom(?:e|ed|es)\s+(?:twins|triplets|a\s+baby|(?:her|his|their)?\s*first\s+(?:child|baby|son|daughter)|(?:a\s+)?baby\s+(?:boy|girl)|a\s+newborn|a\s+boy|a\s+girl|twin\s+babies|babies)|blessed\s+with\s+(?:twins|triplets|(?:a\s+)?baby\s+(?:boy|girl)|(?:a\s+)?child|a\s+son|a\s+daughter)|names?\s+first\s+baby\s+(?:boy|girl)|became\s+parents?\s+of|newborn\s+(?:twins|triplets|baby|son|daughter)|born\s+to)\b/i,
  },
  {
    eventType: 'marriage_union',
    defaultAction: 'married',
    pattern: /\b(?:got\s+married|married|tied\s+the\s+knot|wed|wedding\s+took\s+place|exchanged\s+vows)\b/i,
  },
  {
    eventType: 'death_passing',
    defaultAction: 'died',
    pattern: /\b(?:passed\s+away|died|dead|demise|assassinated|killed|succumbed|deceased)\b/i,
  },
  {
    eventType: 'retirement_resignation',
    defaultAction: 'retired_or_resigned',
    pattern: /\b(?:retired|retiring|retirement|resigned|resigning|resignation|stepped\s+down|stepping\s+down|left\s+office|quit\s+as)\b/i,
  },
  {
    eventType: 'acquisition_merger',
    defaultAction: 'acquired',
    pattern: /\b(?:acquired|acquires|acquire|acquisition\s+of|bought|buys|buy|purchased|purchases|took\s+over|takeover\s+of|merged\s+with)\b/i,
  },
  {
    eventType: 'lawsuit_conflict',
    defaultAction: 'sued_or_charged',
    pattern: /\b(?:sued|sues|filed\s+(?:a\s+)?lawsuit|arrested|detained|indicted|convicted|sentenced|charged\s+with)\b/i,
  },
  {
    eventType: 'sports_victory_award',
    defaultAction: 'won_or_defeated',
    pattern: /\b(?:won|wins|clinched|captured|secured|defeated|beat|beats|outplayed|gold\s+medal|silver\s+medal|bronze\s+medal|championship|trophy)\b/i,
  },
  {
    eventType: 'space_mission',
    defaultAction: 'space_operation',
    pattern: /\b(?:soft-landed|soft\s+landing|landed|touched\s+down|touchdown|orbited|halo\s+orbit|launched\s+(?:into|towards)|spacecraft|lunar\s+south\s+pole)\b/i,
  },
  {
    eventType: 'transit_opening',
    defaultAction: 'opened_or_inaugurated',
    pattern: /\b(?:inaugurated|opened\s+to\s+(?:passengers|public|traffic)|opened\s+on|flagged\s+off|commissioned|became\s+operational|began\s+operations|commenced\s+operations|elevated\s+stretch\s+opens)\b/i,
  },
  {
    eventType: 'legal_ruling',
    defaultAction: 'legal_ruling',
    pattern: /\b(?:upheld|struck\s+down|ruled|verdict|quashed|abolished|banned|prohibited|legal\s+tender)\b/i,
  },
  {
    eventType: 'medical_cure_effect',
    defaultAction: 'medical_effect',
    pattern: /\b(?:cures|cure|cured|treats|prevents|heals|kills\s+(?:cancer|virus)|effective\s+against|causes)\b/i,
  },
  {
    eventType: 'appointment_tenure',
    defaultAction: 'holds_role',
    pattern: /\b(?:president|prime\s+minister|chief\s+minister|ceo|chief\s+executive\s+officer|governor|appointed|sworn\s+in|took\s+office|incumbent)\b/i,
  },
  {
    eventType: 'policy_announcement',
    defaultAction: 'announced_policy',
    pattern: /\b(?:announced|pledged|declared|issued|launched|approved|introduced|rolled\s+out|unveiled)\b/i,
  },
];

// Canonical synonym mapping so paraphrases ("bought" ~ "acquired", "delivered" ~ "gave birth", "touched down" ~ "landed") align
const ACTION_SYNONYM_GROUPS: Record<string, string[]> = {
  birth_delivery: ['gave birth', 'given birth', 'delivered', 'welcomed', 'welcomes', 'welcome', 'blessed with', 'newborn', 'born', 'became parents'],
  pregnancy_expectation: ['expecting', 'pregnant', 'pregnancy', 'due to give birth', 'baby on the way'],
  acquisition_merger: ['bought', 'acquired', 'purchased', 'took over', 'acquisition', 'buyout'],
  space_mission: ['landed', 'soft-landed', 'touched down', 'touchdown', 'orbited', 'launched'],
  transit_opening: ['inaugurated', 'opened', 'flagged off', 'commissioned', 'operational', 'began operations'],
  sports_victory_award: ['won', 'clinched', 'captured', 'secured', 'defeated', 'beat', 'medal'],
  retirement_resignation: ['retired', 'resigned', 'stepped down', 'left office'],
  appointment_tenure: ['president', 'prime minister', 'chief minister', 'ceo', 'incumbent', 'appointed', 'sworn in'],
  legal_ruling: ['upheld', 'ruled', 'struck down', 'banned', 'abolished', 'legal tender'],
  medical_cure_effect: ['cures', 'cure', 'treats', 'heals', 'prevents', 'effective against'],
  policy_announcement: ['announced', 'pledged', 'declared', 'launched', 'approved', 'rolled out'],
};

const PARAPHRASE_CONCEPT_MAP: Record<string, string> = {
  // Birth / family
  delivered: 'birth',
  newborn: 'baby',
  babies: 'baby',
  twins: 'twin',
  // Business
  acquired: 'buy',
  acquisition: 'buy',
  purchased: 'buy',
  bought: 'buy',
  firm: 'company',
  corporation: 'company',
  venture: 'startup',
  // Space
  touchdown: 'land',
  touched: 'land',
  'soft-landed': 'land',
  lunar: 'moon',
  spacecraft: 'mission',
  probe: 'mission',
  // Transit
  inaugurated: 'open',
  commissioned: 'open',
  operational: 'open',
  corridor: 'stretch',
  metro: 'rail',
  // Politics / tenure
  incumbent: 'current',
  present: 'current',
  head: 'leader',
  stepped: 'resign',
  quit: 'resign',
  // Outcomes
  clinched: 'win',
  captured: 'win',
  secured: 'win',
  vanquished: 'defeat',
  beat: 'defeat',
  triumphed: 'win',
  // Legal / policy
  abrogation: 'repeal',
  abrogated: 'repeal',
  revocation: 'repeal',
  revoked: 'repeal',
  repealed: 'repeal',
  upheld: 'uphold',
  upholds: 'uphold',
  // Falsity / negation
  debunked: 'false',
  refuted: 'false',
  fabricated: 'false',
  baseless: 'false',
  untrue: 'false',
  hoax: 'false',
};

function tokenizeNormalized(text: string): string[] {
  return (text.toLowerCase().match(/\d+(?:\.\d+)?|[\p{L}\p{M}]+(?:-[\p{L}\p{M}\p{N}]+)*/gu) || [])
    .map((t) => t.replace(/^-+|-+$/g, ''))
    .filter((t) => t.length > 0);
}

function canonicalConceptToken(tok: string): string {
  const lower = tok.toLowerCase();
  if (PARAPHRASE_CONCEPT_MAP[lower]) return PARAPHRASE_CONCEPT_MAP[lower];
  if (lower.endsWith('ing') && lower.length > 5) return lower.slice(0, -3);
  if (lower.endsWith('ed') && lower.length > 4) return lower.slice(0, -2);
  if (lower.endsWith('s') && lower.length > 4 && !lower.endsWith('ss')) return lower.slice(0, -1);
  return lower;
}

const PRONOUN_OR_GENERIC = /^(?:they|he|she|it|we|you|i|someone|somebody|anyone|anybody|everyone|everybody|nobody|people|this|that|these|those|there|here)$/i;

function extractActorAndTarget(text: string): { actor?: string; target?: string } {
  const clean = text.replace(/\s+/g, ' ').trim();
  const cleanActor = (raw?: string) => {
    let val = raw?.trim();
    if (!val) return undefined;
    val = val.replace(/^(?:Actress|Actor|Singer|Director|Cricketer|Politician)\s+(?=[A-Z])/i, '').trim();
    if (!val || PRONOUN_OR_GENERIC.test(val)) return undefined;
    return val;
  };

  // Passive transitive pattern: "<Target> was/were <verb> by <Actor>"
  const passiveMatch = clean.match(
    /^([A-Z0-9][A-Za-z0-9.&'\s-]{1,40}?)\s+(?:was|were|has\s+been|had\s+been)\s+(?:acquired|bought|purchased|defeated|beaten|sued|replaced|appointed|criticized|banned)\s+by\s+([A-Z0-9][A-Za-z0-9.&'\s-]{1,40}?)(?:[.,;!?]|\s+(?:in|on|at|for|to|after|before)\b|$)/
  );
  if (passiveMatch) {
    return {
      actor: cleanActor(passiveMatch[2]),
      target: cleanActor(passiveMatch[1]),
    };
  }

  // Active transitive pattern: "<Actor> <verb> <Target>"
  const activeTransitive = clean.match(
    /^([A-Z0-9][A-Za-z0-9.&'\s-]{1,55}?)\s+(?:has\s+|have\s+|had\s+|did\s+not\s+|not\s+|unanimously\s+)?(?:acquired|acquires|bought|buys|purchased|took\s+over|defeated|beat|sued|sues|replaced|appointed|banned|married|wed|pledged|launched|landed|inaugurated|opened|welcom(?:e|es|ed)|blessed\s+with|delivered|upheld|upholds|struck\s+down|quashed|abolished|given\s+birth\s+to|gave\s+birth\s+to)\s+(?:the\s+|a\s+|an\s+|her\s+|his\s+|their\s+)?([A-Za-z0-9.&'\s-]{2,45}?)(?:[.,;:!?]|\s+(?:in|on|at|for|during|ahead|after|before|between)\b|$)/i
  );
  if (activeTransitive) {
    return {
      actor: cleanActor(activeTransitive[1]),
      target: cleanActor(activeTransitive[2]),
    };
  }

  // Intransitive / copula pattern: "<Actor> is/are/was/expecting/announced/retired ..."
  const intransitiveMatch = clean.match(
    /^(?:Actually,\s+|Reportedly,\s+|Breaking:\s+)?([A-Z][A-Za-z0-9.&'\s-]{1,38}?)\s+(?:is|are|was|were|has|have|had|announced|retired|resigned|died|passed\s+away|won|lost|expected|is\s+expecting)\b/
  );
  if (intransitiveMatch) {
    return { actor: cleanActor(intransitiveMatch[1]) };
  }

  // Fallback: first proper capitalized entity only when text has a predicate/verb (skip pure header labels like "Hospital bulletin")
  if (/\b(?:is|are|was|were|has|have|had|gave|given|delivered|welcomed|welcomes|welcome|blessed|announced|expecting|acquired|bought|won|lost|landed|opened|inaugurated|banned|died|retired|resigned)\b/i.test(clean)) {
    const capMatches = Array.from(clean.matchAll(/\b([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\b/g)).map((m) => m[1]);
    const nonActorHeadings = /^(?:Hospital|Official|Breaking|Update|Bulletin|Report|Statement|Press|News|Daily|Today|Sources|According|Medical|Actress|Actor)$/i;
    const validActor = capMatches.find((m) => !nonActorHeadings.test(m.split(/\s+/)[0]) && !PRONOUN_OR_GENERIC.test(m));
    if (validActor) return { actor: validActor };
  }
  return {};
}

function extractCardinality(text: string): { cardinality?: number; isExclusiveCardinality?: boolean } {
  const lower = text.toLowerCase();

  // Explicit single-child exclusivity markers (e.g., "only one child", "single baby", "singleton", "not twins")
  if (
    /\b(?:only\s+one|just\s+one|exactly\s+one|sole\s+(?:child|baby|son|daughter)|single\s+(?:baby|child|infant|boy|girl)|singleton|one\s+(?:baby|child)\s+only|not\s+twins|did\s+not\s+have\s+twins|single\s+delivery)\b/i.test(
      lower
    )
  ) {
    return { cardinality: 1, isExclusiveCardinality: true };
  }

  if (/\b(?:triplets|three\s+(?:babies|children|infants))\b/i.test(lower)) {
    return { cardinality: 3, isExclusiveCardinality: true };
  }

  if (/\b(?:twins|twin\s+babies|twin\s+(?:boys|girls|children)|two\s+(?:babies|children|infants|kids))\b/i.test(lower)) {
    return { cardinality: 2, isExclusiveCardinality: true };
  }

  if (/\b(?:quadruplets|four\s+(?:babies|children))\b/i.test(lower)) {
    return { cardinality: 4, isExclusiveCardinality: true };
  }

  // Specific single-newborn announcements (combined first-child + gender/name OR singular naming like "name him Dev", "First Baby Boy", "Baby Boy - Dev")
  const hasFirstChild = /\bfirst\s+(?:child|baby)\b/i.test(lower);
  const hasBabyGender = /\bbaby\s+(?:boy|girl)\b/i.test(lower);
  const hasFirstBabyGender = /\bfirst(?:born)?\s+(?:baby\s+)?(?:boy|girl|son|daughter)\b/i.test(lower);
  const hasSingularBabyNaming =
    /\b(?:baby\s+(?:boy|girl)|son|daughter)\b[^.;!?]{0,45}\b(?:name\s+(?:him|her)|named\s+[a-z]{2,}|his\s+name|her\s+name)\b/i.test(lower) ||
    /\b(?:baby\s+(?:boy|girl))\s*(?:[-–,:]\s*[A-Z][a-z]{2,}|[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?\b)/i.test(text);
  if ((hasFirstChild && hasBabyGender) || hasFirstBabyGender || (hasBabyGender && hasSingularBabyNaming)) {
    return { cardinality: 1, isExclusiveCardinality: true };
  }

  // Non-exclusive singular birth/child phrases (ambiguous partial mention without second singular cue or baby's name)
  if (
    /\b(?:(?:a\s+)?baby\s+(?:boy|girl)|(?:her|his|their)?\s*first\s+(?:child|baby)|a\s+(?:baby|newborn|son|daughter|child))\b/i.test(
      lower
    )
  ) {
    return { cardinality: 1, isExclusiveCardinality: false };
  }

  // General explicit exclusive quantity: "only 3", "exactly 5", "at most 2"
  const exclusiveNum = lower.match(/\b(?:only|exactly|solely|exclusively)\s+(\d+)\b/);
  if (exclusiveNum) {
    return { cardinality: Number(exclusiveNum[1]), isExclusiveCardinality: true };
  }

  return {};
}

function detectSarcasmOrIrony(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (/\/s\b|\bsarcasm\b|\bjk\b/i.test(lower)) return true;
  if (
    /\b(?:yeah\s+right|oh\s+sure|sure,\s*because|as\s+if\s+that|totally\s+(?:cures|legit|real|true|happened|works)|what\s+a\s+surprise|obviously\s+totally|1000%\s+guaranteed|magic\s+miracle\s+cure)\b/i.test(
      lower
    )
  ) {
    return true;
  }
  if (/^(?:sure|totally|obviously|oh\s+great),?\s+.*\b(?:cures\s+everything|flat\s+earth|made\s+of\s+cheese|aliens\s+built)\b/i.test(lower)) {
    return true;
  }
  return false;
}

/**
 * Extracts a structured Semantic Event Frame from any sentence or claim.
 */
export function extractSemanticFrame(text: string): SemanticFrame {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  const lower = clean.toLowerCase();

  // 1. Polarity & negated elements (strip idiomatic non-negation bounds like "no later than", "not only")
  const lowerForNegation = lower
    .replace(/\bno\s+(?:later|earlier|sooner|more|less|fewer|longer)\s+than\b/g, 'within_bound')
    .replace(/\b(?:no\s+doubt|no\s+wonder|not\s+only|not\s+just)\b/g, 'idiom_positive');

  const negatedMatches = Array.from(
    lowerForNegation.matchAll(
      /\b(?:not|no|never|neither|nor|without|doesn't|does\s+not|don't|do\s+not|didn't|did\s+not|won't|will\s+not|can't|cannot|couldn't|isn't|is\s+not|aren't|are\s+not|wasn't|was\s+not|weren't|were\s+not|hasn't|has\s+not|haven't|have\s+not|hadn't|had\s+not|denied|refuted|never\s+happened|no\s+evidence|no\s+such|false|fake|hoax|debunked)\b(?:\s+[a-z0-9'-]+){0,3}/g
    )
  ).map((m) => m[0].trim());

  const polarity: SemanticFrame['polarity'] = negatedMatches.length > 0 ? 'negative' : 'affirmative';

  // 2. Event Type & Canonical Action
  let eventType: string | undefined;
  let action: string | undefined;
  for (const def of EVENT_DEFINITIONS) {
    if (def.pattern.test(lower)) {
      eventType = def.eventType;
      action = def.defaultAction;
      break;
    }
  }

  // 3. Modality & Tense
  const isSarcastic = detectSarcasmOrIrony(clean);
  const isQuestion =
    /^(?:who|what|when|where|which|is|are|was|were|did|does|do|can|could|will|would|has|have)\b/i.test(lower) ||
    /\?\s*$/.test(clean);
  const isRumor =
    /\b(?:rumour|rumor|rumoured|rumored|alleged|allegedly|unconfirmed|reportedly|people\s+are\s+saying|gossip|speculated|hearsay|unverified\s+claim)\b/i.test(
      lower
    ) && !/\b(?:debunk|fact[- ]check|refute|false|denied)\b/i.test(lower);
  const isFuturePrediction =
    /\b(?:will\s+(?:replace|become|exceed|overtake|destroy|collapse|win|crash)|forecast\s+to|predicted\s+to|by\s+20(?:2[7-9]|3\d|4\d|5\d))\b/i.test(
      lower
    );
  const isAnnouncementProposal =
    /\b(?:announced\s+(?:her\s+|his\s+|their\s+)?pregnancy|announced\s+plans|proposed|slated\s+to|planned\s+to|set\s+to\s+open|to\s+be\s+launched|to\s+open\s+by)\b/i.test(
      lower
    );
  const isProspectiveExpectation =
    eventType === 'pregnancy_expectation' ||
    (/\b(?:is\s+expecting|are\s+expecting|expecting|pregnant|due\s+in|expected\s+to|likely\s+to|targets?|hopes\s+to|preparing\s+to|about\s+to)\b/i.test(
      lower
    ) &&
      eventType !== 'birth_delivery');

  const isCompletedPastVerb =
    eventType === 'birth_delivery' ||
    /\b(?:gave\s+birth|delivered|welcomed|inaugurated|opened|landed|soft-landed|touched\s+down|won|lost|died|passed\s+away|retired|resigned|acquired|bought|purchased|upheld|abolished|elected|married|pledged|flagged\s+off|ended|began|started)\b/i.test(
      lower
    );
  const isFutureCue = /\b(?:will\s+|next\s+(?:year|month|week)|soon|upcoming|in\s+20(?:2[7-9]|3\d))\b/i.test(lower);

  let modality: SemanticFrame['modality'] = 'completed_fact';
  if (isSarcastic) modality = 'sarcasm_or_irony';
  else if (isQuestion) modality = 'question';
  else if (isRumor) modality = 'rumor_allegation';
  else if (isAnnouncementProposal) modality = 'announcement_proposal';
  else if (isProspectiveExpectation) modality = 'prospective_expectation';
  else if (isFuturePrediction) modality = 'future_prediction';
  else if (isCompletedPastVerb) modality = 'completed_fact';
  else if (/\b(?:is|are|continues|remains|serves\s+as|currently|incumbent)\b/i.test(lower)) modality = 'ongoing_state';

  let tense: SemanticFrame['tense'] = 'unknown';
  if (isCompletedPastVerb || /\b(?:was|were|did|had|ago|last\s+(?:week|month|year)|in\s+(?:19\d{2}|20[01]\d|202[0-6]))\b/i.test(lower)) {
    tense = 'past';
  } else if (isFuturePrediction || isFutureCue || isProspectiveExpectation) {
    tense = isProspectiveExpectation && /\b(?:is|are)\s+expecting\b/i.test(lower) ? 'present' : 'future';
  } else if (/\b(?:is|are|currently|continues|remains|today|now)\b/i.test(lower)) {
    tense = 'present';
  }

  // 4. Actor & Target roles
  const { actor, target } = extractActorAndTarget(clean);

  // 5. Cardinality
  const { cardinality, isExclusiveCardinality } = extractCardinality(clean);

  // 6. Timeframe & Location
  const timeframeMatch =
    clean.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s+\d{4})?\b/i) ||
    clean.match(/\b(19\d{2}|20[0-3]\d)\b/) ||
    clean.match(/\b(today|yesterday|tomorrow|last\s+month|last\s+year|next\s+month|next\s+year)\b/i);
  const locationMatch = clean.match(
    /\b(?:India|Karnataka|Bengaluru|Bangalore|Delhi|New\s+Delhi|Mumbai|Chennai|Hyderabad|Nepal|Paris|United\s+States|USA|US|Moon|London)\b/i
  );

  return {
    actor,
    action,
    eventType,
    target,
    modality,
    tense,
    polarity,
    cardinality,
    isExclusiveCardinality,
    location: locationMatch?.[0],
    timeframe: timeframeMatch?.[0],
    negatedElements: negatedMatches.length > 0 ? negatedMatches : undefined,
  };
}

/**
 * Checks whether a claim is ambiguous/underspecified (e.g., anonymous pronouns without named subject,
 * vague unnamed placeholder, or missing event predicate).
 */
export function analyzeSemanticFrameWithAmbiguity(text: string): SemanticFrameAnalysis {
  const frame = extractSemanticFrame(text);
  const clean = (text || '').trim();
  const lower = clean.toLowerCase();
  const tokens = tokenizeNormalized(clean).filter((t) => !FRAME_STOPWORDS.has(t));

  const startsWithUnboundPronoun = /^(?:they|he|she|it|someone|somebody|people)\b/i.test(clean);
  const usesVaguePlaceholder = /\b(?:famous|popular|well-known|senior|top|some|a\s+certain)\s+(?:actor|actress|cricketer|politician|leader|minister|celebrity|company)\b/i.test(
    lower
  );
  const isTooVague = tokens.length <= 2 && !frame.actor && !frame.eventType;

  if (startsWithUnboundPronoun && !frame.actor) {
    return {
      frame,
      isAmbiguous: true,
      ambiguousReason: 'Claim relies on an unresolved pronoun without naming the person, organization, or event.',
    };
  }
  if (usesVaguePlaceholder && !frame.actor) {
    return {
      frame,
      isAmbiguous: true,
      ambiguousReason: 'Claim uses an unnamed generic placeholder rather than a verifiable named entity.',
    };
  }
  if (isTooVague) {
    return {
      frame,
      isAmbiguous: true,
      ambiguousReason: 'Statement is too brief or underspecified to form a complete verifiable proposition.',
    };
  }

  return { frame, isAmbiguous: false };
}

function getCoreEntityTokens(text: string): string[] {
  return Array.from(
    new Set(
      tokenizeNormalized(text).filter(
        (t) =>
          !FRAME_STOPWORDS.has(t) &&
          t.length >= 3 &&
          !/^(?:not|never|no|false|fake|hoax|true|real|only|just|one|two|three|first|second|baby|child|children|twin|twins|boy|girl|pregnant|pregnancy|expecting|gave|birth|delivered|welcomed|announced|confirmed|report|statement)$/i.test(
            t
          )
      )
    )
  );
}

function extractSentences(text: string): string[] {
  const parts = (text || '')
    .split(/(?<=[.!?])\s+|\n+|;\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 6);
  return parts.length > 0 ? parts : [(text || '').trim()];
}

function namesMatch(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const aToks = tokenizeNormalized(a).filter((t) => !FRAME_STOPWORDS.has(t) && t.length >= 2);
  const bToks = tokenizeNormalized(b).filter((t) => !FRAME_STOPWORDS.has(t) && t.length >= 2);
  if (aToks.length === 0 || bToks.length === 0) return false;
  return aToks.some((at) => bToks.some((bt) => bt === at || (at.length >= 4 && bt.startsWith(at)) || (bt.length >= 4 && at.startsWith(bt))));
}

function isOpenWhLookupQuestion(text: string): boolean {
  const lower = (text || '').trim().toLowerCase();
  return /^(?:who|what|when|where|which|name)\b/i.test(lower) || /\b(?:who\s+is|what\s+is)\b/i.test(lower);
}

/**
 * Classifies a single (Claim, Evidence Sentence) pair into ENTAILMENT, CONTRADICTION, or NEUTRAL.
 */
function classifySingleSentenceNLI(
  claimText: string,
  claimFrame: SemanticFrame,
  evidenceSentence: string,
  options?: { isAuthoritative?: boolean; isFactCheck?: boolean; crossLingualQuery?: string }
): NLIPairResult {
  const evFrame = extractSemanticFrame(evidenceSentence);
  const claimLower = claimText.toLowerCase();
  const evLower = evidenceSentence.toLowerCase();
  const isFactCheck = Boolean(options?.isFactCheck) || /\b(?:fact[- ]check|pib fact check|debunk|hoax|fake claim|misleading claim)\b/i.test(evLower);

  // 0. Check Sarcasm / Ambiguous / Unverified Question Claim Gates
  if (claimFrame.modality === 'sarcasm_or_irony') {
    if (isFactCheck || evFrame.polarity === 'negative') {
      const claimEnts = getCoreEntityTokens(claimText);
      const evEnts = getCoreEntityTokens(evidenceSentence);
      const overlap = claimEnts.filter((t) => evEnts.includes(t));
      if (overlap.length >= 1) {
        return {
          label: 'CONTRADICTION',
          confidence: 0.78,
          crossRelevanceScore: 0.68,
          reason: 'Claim uses sarcastic/ironic framing around an assertion contradicted by evidence.',
          claimFrame,
          evidenceFrame: evFrame,
          structuralLock: true,
        };
      }
    }
    return {
      label: 'NEUTRAL',
      confidence: 0.9,
      crossRelevanceScore: 0.25,
      reason: 'Claim uses sarcasm or irony and cannot be taken as a literal entailed fact.',
      claimFrame,
      evidenceFrame: evFrame,
      structuralLock: true,
    };
  }

  // If both claim and evidence are pure rumors/unconfirmed whispers, never verify or refute
  if (claimFrame.modality === 'rumor_allegation' && evFrame.modality === 'rumor_allegation') {
    return {
      label: 'NEUTRAL',
      confidence: 0.86,
      crossRelevanceScore: 0.42,
      reason: 'Both claim and source cite unconfirmed rumors without independent verification.',
      claimFrame,
      evidenceFrame: evFrame,
      structuralLock: true,
    };
  }

  // Open WH lookup questions ("Who is President of India") don't assert a boolean proposition
  if (isOpenWhLookupQuestion(claimText)) {
    const queryAnchor = options?.crossLingualQuery || claimText;
    const qToks = tokenizeNormalized(queryAnchor).filter((t) => !FRAME_STOPWORDS.has(t) && t.length >= 3);
    const eToks = new Set(tokenizeNormalized(evidenceSentence));
    const hits = qToks.filter((t) => eToks.has(t)).length;
    if (hits >= Math.min(2, qToks.length)) {
      return {
        label: 'ENTAILMENT',
        confidence: 0.78,
        crossRelevanceScore: 0.78,
        reason: 'Evidence directly addresses the factual lookup query.',
        claimFrame,
        evidenceFrame: evFrame,
      };
    }
    return {
      label: 'NEUTRAL',
      confidence: 0.65,
      crossRelevanceScore: 0.35,
      reason: 'Evidence does not directly answer the lookup question.',
      claimFrame,
      evidenceFrame: evFrame,
    };
  }

  // 1. Actor / Subject Alignment Check
  if (claimFrame.actor && evFrame.actor) {
    const sameActor = namesMatch(claimFrame.actor, evFrame.actor);
    const swappedActorTarget =
      claimFrame.target &&
      evFrame.target &&
      namesMatch(claimFrame.actor, evFrame.target) &&
      namesMatch(claimFrame.target, evFrame.actor);

    if (swappedActorTarget && claimFrame.eventType === evFrame.eventType) {
      return {
        label: 'CONTRADICTION',
        confidence: 0.92,
        crossRelevanceScore: 0.84,
        reason: `Subject/object roles are reversed ("${evFrame.actor}" vs "${claimFrame.actor}").`,
        claimFrame,
        evidenceFrame: evFrame,
        structuralLock: true,
      };
    }

    if (!sameActor && !evLower.includes(claimFrame.actor.toLowerCase())) {
      // Check if cross-lingual query matches instead before rejecting actor
      const hasActorInText = tokenizeNormalized(claimFrame.actor)
        .filter((t) => !FRAME_STOPWORDS.has(t) && t.length >= 3)
        .some((t) => evLower.includes(t));
      if (!hasActorInText) {
        return {
          label: 'NEUTRAL',
          confidence: 0.85,
          crossRelevanceScore: 0.2,
          reason: `Evidence discusses a different subject ("${evFrame.actor}") than the claim ("${claimFrame.actor}").`,
          claimFrame,
          evidenceFrame: evFrame,
        };
      }
    }
  }

  // 1b. Numbered/Versioned Entity Series Guard (e.g., Chandrayaan-3 vs Chandrayaan-1/Chandrayaan-2, Aditya-L1 vs Aditya-L2)
  const claimSeriesMatches = Array.from(claimLower.matchAll(/\b([a-z]{4,})-([a-z]?\d+[a-z]?)\b/g));
  if (claimSeriesMatches.length > 0) {
    for (const m of claimSeriesMatches) {
      const seriesBase = m[1];
      const fullClaimId = m[0];
      if (!evLower.includes(fullClaimId)) {
        const evSeriesRegex = new RegExp(`\\b${seriesBase}-([a-z]?\\d+[a-z]?)\\b`, 'g');
        const evSeriesMatches = Array.from(evLower.matchAll(evSeriesRegex)).map((em) => em[0]);
        if (evSeriesMatches.length > 0) {
          return {
            label: 'NEUTRAL',
            confidence: 0.9,
            crossRelevanceScore: 0.28,
            reason: `Evidence discusses "${evSeriesMatches[0]}" rather than "${fullClaimId}".`,
            claimFrame,
            evidenceFrame: evFrame,
            structuralLock: true,
          };
        }
      }
    }
  }

  // Check topical token overlap (including canonical paraphrase concepts)
  const claimConceptSource = options?.crossLingualQuery || claimText;
  const claimConceptTokens = Array.from(
    new Set(tokenizeNormalized(claimConceptSource).filter((t) => !FRAME_STOPWORDS.has(t) && t.length >= 3).map(canonicalConceptToken))
  );
  const evConceptTokens = new Set(
    tokenizeNormalized(evidenceSentence).filter((t) => !FRAME_STOPWORDS.has(t) && t.length >= 3).map(canonicalConceptToken)
  );
  const sharedConceptHits = claimConceptTokens.filter((ct) => evConceptTokens.has(ct)).length;
  const conceptRatio = claimConceptTokens.length > 0 ? sharedConceptHits / claimConceptTokens.length : 0;

  if (sharedConceptHits === 0 && !(claimFrame.eventType && claimFrame.eventType === evFrame.eventType && claimFrame.actor && evLower.includes(claimFrame.actor.toLowerCase()))) {
    return {
      label: 'NEUTRAL',
      confidence: 0.82,
      crossRelevanceScore: 0.18,
      reason: 'Insufficient shared semantic entities or concepts between claim and evidence.',
      claimFrame,
      evidenceFrame: evFrame,
    };
  }

  // 2. Pregnancy vs Birth / Prospective vs Completed Event Compatibility
  if (
    claimFrame.eventType === 'birth_delivery' &&
    evFrame.eventType === 'pregnancy_expectation'
  ) {
    const msg =
      evFrame.modality === 'announcement_proposal'
        ? 'Evidence reports a pregnancy announcement rather than a completed birth.'
        : 'Evidence states the subject is expecting/pregnant rather than having given birth.';
    return {
      label: 'NEUTRAL',
      confidence: 0.94,
      crossRelevanceScore: 0.58,
      reason: msg,
      claimFrame,
      evidenceFrame: evFrame,
      structuralLock: true,
    };
  }

  if (
    claimFrame.eventType === 'pregnancy_expectation' &&
    evFrame.eventType === 'birth_delivery'
  ) {
    return {
      label: 'CONTRADICTION',
      confidence: 0.88,
      crossRelevanceScore: 0.72,
      reason: 'Claim describes current pregnancy/expectation, whereas evidence reports birth has already occurred.',
      claimFrame,
      evidenceFrame: evFrame,
      structuralLock: true,
    };
  }

  if (
    claimFrame.modality === 'completed_fact' &&
    (evFrame.modality === 'prospective_expectation' || evFrame.modality === 'announcement_proposal' || evFrame.modality === 'future_prediction')
  ) {
    return {
      label: 'NEUTRAL',
      confidence: 0.89,
      crossRelevanceScore: 0.52,
      reason: 'Claim asserts a completed event, while evidence only describes an expectation, proposal, or future target.',
      claimFrame,
      evidenceFrame: evFrame,
      structuralLock: true,
    };
  }

  if (
    (claimFrame.modality === 'future_prediction' || claimFrame.modality === 'prospective_expectation') &&
    evFrame.modality === 'prospective_expectation'
  ) {
    return {
      label: 'NEUTRAL',
      confidence: 0.82,
      crossRelevanceScore: 0.55,
      reason: 'Both claim and evidence discuss an unconfirmed future expectation rather than an established fact.',
      claimFrame,
      evidenceFrame: evFrame,
      structuralLock: true,
    };
  }

  // 3. Cardinality & Exclusivity Reasoning (e.g., twins vs only one child vs a baby boy)
  if (claimFrame.cardinality !== undefined && evFrame.cardinality !== undefined) {
    if (claimFrame.cardinality !== evFrame.cardinality) {
      if (evFrame.isExclusiveCardinality) {
        const countReason =
          claimFrame.cardinality === 2 && evFrame.cardinality === 1
            ? 'Claim asserts twins (2), whereas credible evidence confirms a single newborn (1).'
            : `Evidence states an exclusive count (${evFrame.cardinality}) that contradicts the claimed count (${claimFrame.cardinality}).`;
        return {
          label: 'CONTRADICTION',
          confidence: 0.95,
          crossRelevanceScore: 0.88,
          reason: countReason,
          claimFrame,
          evidenceFrame: evFrame,
          structuralLock: true,
        };
      }
      // Non-exclusive count (e.g., "a baby boy" or "first child" when claim is "twins") -> NEUTRAL!
      return {
        label: 'NEUTRAL',
        confidence: 0.91,
        crossRelevanceScore: 0.62,
        reason: `Evidence mentions ${evFrame.cardinality} child/item without exclusivity and therefore neither confirms nor refutes ${claimFrame.cardinality}.`,
        claimFrame,
        evidenceFrame: evFrame,
        structuralLock: true,
      };
    }
  }

  // Explicit "not twins" against twins claim
  if (claimFrame.cardinality === 2 && /\bnot\s+twins\b|\bno\s+twins\b/i.test(evLower)) {
    return {
      label: 'CONTRADICTION',
      confidence: 0.95,
      crossRelevanceScore: 0.88,
      reason: 'Evidence explicitly denies twins.',
      claimFrame,
      evidenceFrame: evFrame,
      structuralLock: true,
    };
  }

  // 4. Explicit Fact-Check Debunk Language
  if (
    /\b(?:is\s+fake|is\s+false|claim\s+is\s+fake|false\s+claim|viral\s+scam|hoax|debunked|fabricated|baseless|untrue|no\s+scientific\s+basis|no\s+such\s+(?:scheme|order|circular)|not\s+legal\s+tender)\b/i.test(
      evLower
    ) &&
    sharedConceptHits >= 1
  ) {
    return {
      label: 'CONTRADICTION',
      confidence: 0.92,
      crossRelevanceScore: 0.88,
      reason: 'Evidence contains an explicit fact-check refutation matching the claim topic.',
      claimFrame,
      evidenceFrame: evFrame,
    };
  }

  // 5. Polarity / Negation Reasoning (scoped to core event/role predicate, with double-negation agreement support)
  const sameEventOrHighConcept =
    (claimFrame.eventType && evFrame.eventType && claimFrame.eventType === evFrame.eventType) ||
    conceptRatio >= 0.45 ||
    sharedConceptHits >= 3;

  const negationScopesPredicate = (() => {
    if (claimFrame.polarity === evFrame.polarity) return false;
    if (evFrame.polarity === 'negative' && claimFrame.eventType === 'appointment_tenure') {
      return /\b(?:not|no\s+longer|never|isn't|is\s+not|aren't|are\s+not|resigned|stepped\s+down|removed|dismissed|succeeded\s+by)\b[^.;!?]{0,40}\b(?:president|prime\s+minister|chief\s+minister|ceo|governor|office|post)\b|\b(?:president|prime\s+minister|chief\s+minister|ceo|governor)\b[^.;!?]{0,25}\b(?:not|no\s+longer|resigned|stepped\s+down)\b/i.test(
        evLower
      );
    }
    if (evFrame.polarity === 'negative' && claimFrame.polarity === 'affirmative') {
      // Strip incidental auxiliary negations unrelated to whether the main event occurred (e.g., "not built to withstand", "not clear")
      const cleanedEv = evLower.replace(
        /\b(?:was|were|is|are|had|have)?\s*not\s+(?:built|designed|intended|meant|equipped|expected|able|limited|related|clear|known|confirmed|surprising|unusual|yet)\b/g,
        'aux_clause'
      );
      if (
        cleanedEv !== evLower &&
        !/\b(?:not|no|never|neither|nor|without|didn't|did\s+not|wasn't|was\s+not|isn't|is\s+not|hasn't|has\s+not|denied|refuted|false|fake|hoax|debunked)\b/.test(
          cleanedEv
        )
      ) {
        return false;
      }
    }
    return true;
  })();

  const isOverviewOrEditionPage =
    /\b(?:list\s+of|national\s+(?:cricket|football|hockey)\s+team|history\s+of)\b/i.test(evLower) ||
    /\b(19\d{2}|20[0-3]\d)\s+(?:men's|women's|icc|fifa|olympic|world\s+cup)\b/i.test(evLower);

  const sameTargetIfPresent = (() => {
    if (!claimFrame.target) return true;
    const strictEntityTargetEvents = new Set(['acquisition_merger', 'sports_victory_award', 'lawsuit_conflict', 'marriage_union']);
    if (
      strictEntityTargetEvents.has(claimFrame.eventType || '') &&
      evFrame.target &&
      !namesMatch(claimFrame.target, evFrame.target)
    ) {
      return false;
    }
    const targetTokens = tokenizeNormalized(claimFrame.target).filter((t) => !FRAME_STOPWORDS.has(t) && t.length >= 2);
    if (targetTokens.length === 0) return true;
    return targetTokens.some((t) => evLower.includes(t) || evConceptTokens.has(canonicalConceptToken(t)));
  })();

  if (sameEventOrHighConcept && negationScopesPredicate && sameTargetIfPresent && !isOverviewOrEditionPage) {
    if (claimFrame.polarity !== evFrame.polarity) {
      return {
        label: 'CONTRADICTION',
        confidence: 0.89,
        crossRelevanceScore: 0.84,
        reason: `Polarity conflict on matching event/topic (claim is ${claimFrame.polarity}, evidence is ${evFrame.polarity}).`,
        claimFrame,
        evidenceFrame: evFrame,
      };
    }
  }

  // 6. Timeline / Year Contradiction for Completed Facts (skip multi-year overviews & different tournament editions)
  const claimYears = Array.from(claimLower.matchAll(/\b(19\d{2}|20[0-3]\d)\b/g)).map((m) => m[1]);
  const evYears = Array.from(evLower.replace(/\bas\s+of\s+(?:19\d{2}|20[0-3]\d)\b/g, '').matchAll(/\b(19\d{2}|20[0-3]\d)\b/g)).map(
    (m) => m[1]
  );
  if (
    claimFrame.modality === 'completed_fact' &&
    evFrame.modality === 'completed_fact' &&
    claimYears.length > 0 &&
    evYears.length > 0 &&
    sameEventOrHighConcept &&
    sameTargetIfPresent &&
    !isOverviewOrEditionPage &&
    !claimYears.some((y) => evYears.includes(y))
  ) {
    return {
      label: 'CONTRADICTION',
      confidence: 0.87,
      crossRelevanceScore: 0.8,
      reason: `Event year conflict: claim states ${claimYears.join('/')} while evidence states ${evYears.join('/')}.`,
      claimFrame,
      evidenceFrame: evFrame,
    };
  }

  // 7. Semantic Event + Paraphrase Entailment
  const sameActorOrNoConflict =
    !claimFrame.actor ||
    !evFrame.actor ||
    namesMatch(claimFrame.actor, evFrame.actor) ||
    tokenizeNormalized(claimFrame.actor).some((t) => t.length >= 3 && evLower.includes(t));

  const sameCardinalityIfSpecified =
    claimFrame.cardinality === undefined ||
    evFrame.cardinality === undefined ||
    claimFrame.cardinality === evFrame.cardinality;

  const sameYearIfSpecified =
    claimYears.length === 0 || evYears.length === 0 || claimYears.some((y) => evYears.includes(y));

  // If claim states a completed event and evidence has same eventType + actor + compatible modality + cardinality
  const eventTypesAligned =
    Boolean(claimFrame.eventType && evFrame.eventType && claimFrame.eventType === evFrame.eventType);

  const synonymAligned =
    claimFrame.eventType &&
    ACTION_SYNONYM_GROUPS[claimFrame.eventType]?.some((phrase) => evLower.includes(phrase));

  const claimMentionsGovernment = /\b(?:government|govt|ministry|cabinet)\b/i.test(claimLower);
  const evMentionsGovernment = /\b(?:government|govt|ministry|cabinet|centre|union|state|official)\b/i.test(evLower);
  const hasInstitutionMatch = !claimMentionsGovernment || evMentionsGovernment;

  const predicateAligned = claimFrame.eventType
    ? Boolean((eventTypesAligned || synonymAligned) && sharedConceptHits >= 2 && conceptRatio >= 0.42)
    : conceptRatio >= 0.6 && sharedConceptHits >= 2;

  if (
    predicateAligned &&
    hasInstitutionMatch &&
    sameActorOrNoConflict &&
    sameTargetIfPresent &&
    sameCardinalityIfSpecified &&
    sameYearIfSpecified &&
    claimFrame.polarity === evFrame.polarity &&
    (claimFrame.modality === 'completed_fact' || claimFrame.modality === 'question' || claimFrame.modality === 'ongoing_state' || claimFrame.modality === 'rumor_allegation') &&
    (evFrame.modality === 'completed_fact' || evFrame.modality === 'ongoing_state')
  ) {
    // Require explicit year match when claim demands a specific year on a completed event
    if (claimYears.length > 0 && claimFrame.modality === 'completed_fact' && evYears.length === 0 && !eventTypesAligned) {
      return {
        label: 'NEUTRAL',
        confidence: 0.72,
        crossRelevanceScore: 0.62,
        reason: 'Evidence matches topic semantically but omits the specific event year required by the claim.',
        claimFrame,
        evidenceFrame: evFrame,
      };
    }

    // Require matching cardinality when claim explicitly commits to twins/triplets
    if (claimFrame.cardinality !== undefined && claimFrame.isExclusiveCardinality && evFrame.cardinality === undefined) {
      return {
        label: 'NEUTRAL',
        confidence: 0.76,
        crossRelevanceScore: 0.58,
        reason: `Evidence matches event type but does not confirm the claimed quantity (${claimFrame.cardinality}).`,
        claimFrame,
        evidenceFrame: evFrame,
      };
    }

    const conf = Number(Math.min(0.95, 0.72 + conceptRatio * 0.2 + (eventTypesAligned ? 0.08 : 0)).toFixed(2));
    const rel = Number(Math.min(0.96, 0.65 + conceptRatio * 0.25 + (eventTypesAligned ? 0.08 : 0)).toFixed(2));
    return {
      label: 'ENTAILMENT',
      confidence: conf,
      crossRelevanceScore: rel,
      reason: eventTypesAligned
        ? `Semantic event (${claimFrame.eventType}), actor, modality, polarity, and constraints match.`
        : 'Paraphrase and core factual concepts align with matching polarity and modality.',
      claimFrame,
      evidenceFrame: evFrame,
    };
  }

  return {
    label: 'NEUTRAL',
    confidence: 0.74,
    crossRelevanceScore: Number(Math.min(0.75, 0.22 + conceptRatio * 0.5).toFixed(2)),
    reason: 'Evidence shares partial context without directly entailing or contradicting all core claim assertions.',
    claimFrame,
    evidenceFrame: evFrame,
  };
}

/**
 * Classifies a (Claim, Multi-Sentence Evidence Passage) pair using sentence-level NLI aggregation
 * and returns the strongest decisive ENTAILMENT or CONTRADICTION (preferring structural safety locks
 * and explicit contradictions over incidental sentence overlaps).
 */
export function classifyPairNLI(
  claimText: string,
  evidenceText: string,
  options?: { isAuthoritative?: boolean; isFactCheck?: boolean; crossLingualQuery?: string }
): NLIPairResult {
  const claimFrame = extractSemanticFrame(claimText);
  const sentences = extractSentences(evidenceText);

  let bestResult: NLIPairResult | null = null;

  // Evaluate both individual sentences and the full passage (for cross-sentence context)
  const candidates = sentences.length > 1 ? [...sentences, evidenceText] : sentences;

  for (const sent of candidates) {
    const res = classifySingleSentenceNLI(claimText, claimFrame, sent, options);
    if (!bestResult) {
      bestResult = res;
      continue;
    }

    // Priority:
    // 1. Structural CONTRADICTION beats everything
    // 2. Structural NEUTRAL lock (e.g., pregnancy vs birth, different numbered entity) beats loose overlap
    // 3. Explicit CONTRADICTION beats ENTAILMENT unless bestResult is already a high-confidence ENTAILMENT and the contradiction is an unlocked incidental clause
    // 4. ENTAILMENT beats non-locked NEUTRAL
    const isStrongPriorEntailment = bestResult.label === 'ENTAILMENT' && bestResult.confidence >= 0.85;
    const contradictionIsLockedOrDirect =
      Boolean(res.structuralLock) ||
      /\b(?:explicit fact-check|contradicts|denied|refutes|exclusive count|year conflict|roles are reversed)\b/i.test(res.reason);
    if (
      res.label === 'CONTRADICTION' &&
      (!isStrongPriorEntailment || contradictionIsLockedOrDirect) &&
      (bestResult.label !== 'CONTRADICTION' || res.confidence > bestResult.confidence)
    ) {
      bestResult = res;
    } else if (res.label === 'ENTAILMENT' && bestResult.label === 'NEUTRAL' && !bestResult.structuralLock) {
      bestResult = res;
    } else if (
      res.label === 'ENTAILMENT' &&
      bestResult.label === 'NEUTRAL' &&
      bestResult.structuralLock &&
      claimFrame.modality !== 'sarcasm_or_irony' &&
      res.claimFrame.eventType === res.evidenceFrame.eventType
    ) {
      // Allow a later sentence with an exact matching completed event (e.g. "Samantha gave birth" after earlier pregnancy sentence) to supersede a prior sentence's lock
      bestResult = res;
    } else if (res.label === 'ENTAILMENT' && bestResult.label === 'ENTAILMENT' && res.confidence > bestResult.confidence) {
      bestResult = res;
    } else if (res.structuralLock && res.label === 'NEUTRAL' && bestResult.label === 'NEUTRAL' && res.confidence > bestResult.confidence) {
      bestResult = res;
    }
  }

  return (
    bestResult || {
      label: 'NEUTRAL',
      confidence: 0.6,
      crossRelevanceScore: 0.25,
      reason: 'No conclusive entailment or contradiction detected.',
      claimFrame,
      evidenceFrame: extractSemanticFrame(evidenceText),
    }
  );
}
