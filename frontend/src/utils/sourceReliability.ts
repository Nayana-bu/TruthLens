import type { ClaimDossier, EvidenceSource, Language } from '../types';

export interface ReliabilityAxis {
  key: 'official' | 'factcheck' | 'press' | 'consensus' | 'verifiability';
  label: string;
  shortLabel: string;
  score: number; // 0..100
  sourceCount: number;
  sampleSources: string[];
  description: string;
}

export interface ArchiveTierSummary {
  officialCount: number;
  factCheckCount: number;
  accreditedPressCount: number;
  secondaryWebCount: number;
  accessibleLinksCount: number;
}

export interface SourceReliabilityReport {
  overallScore: number; // 0..100
  grade: 'high' | 'moderate' | 'limited' | 'insufficient';
  gradeLabel: string;
  totalSources: number;
  axes: ReliabilityAxis[];
  archives: ArchiveTierSummary;
}

function isValidHttpUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isOfficialSource(src: EvidenceSource): boolean {
  if (src.credibilityTier === 'official_primary' || src.isPrimary) return true;
  const hay = `${src.url || ''} ${src.name || ''} ${src.category || ''}`.toLowerCase();
  return (
    hay.includes('.gov') ||
    hay.includes('.nic.in') ||
    hay.includes('pib.gov') ||
    hay.includes('isro.gov') ||
    hay.includes('rbi.org') ||
    hay.includes('who.int') ||
    hay.includes('official gazette') ||
    hay.includes('ministry')
  );
}

function isFactCheckSource(src: EvidenceSource): boolean {
  if (src.credibilityTier === 'factcheck_org') return true;
  const hay = `${src.url || ''} ${src.name || ''} ${src.category || ''}`.toLowerCase();
  return (
    hay.includes('factcheck') ||
    hay.includes('fact check') ||
    hay.includes('altnews') ||
    hay.includes('boomlive') ||
    hay.includes('vishvasnews') ||
    hay.includes('snopes') ||
    hay.includes('politifact') ||
    hay.includes('wikipedia') ||
    hay.includes('ifcn')
  );
}

function isAccreditedPressSource(src: EvidenceSource): boolean {
  if (src.credibilityTier === 'accredited_press') return true;
  if (isOfficialSource(src) || isFactCheckSource(src)) return false;
  return src.credibilityTier !== 'secondary_web';
}

function getUniqueNames(list: EvidenceSource[], limit = 3): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of list) {
    const clean = (s.name || '').trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
    if (out.length >= limit) break;
  }
  return out;
}

function getLocalizedAxisLabels(lang: Language) {
  if (lang === 'kn') {
    return {
      official: { label: 'ಅಧಿಕೃತ ದಾಖಲೆಗಳು', shortLabel: 'ಅಧಿಕೃತ' },
      factcheck: { label: 'ಸತ್ಯ-ಪರಿಶೀಲನೆ', shortLabel: 'ಫ್ಯಾಕ್ಟ್-ಚೆಕ್' },
      press: { label: 'ಮಾನ್ಯತೆ ಪಡೆದ ಮಾಧ್ಯಮ', shortLabel: 'ಮಾಧ್ಯಮ' },
      consensus: { label: 'ಮೂಲಗಳ ಒಮ್ಮತ', shortLabel: 'ಒಮ್ಮತ' },
      verifiability: { label: 'ಪರಿಶೀಲನಾ ಲಿಂಕ್‌ಗಳು', shortLabel: 'ಪರಿಶೀಲನೆ' },
      grades: {
        high: 'ಉನ್ನತ ವಿಶ್ವಾಸಾರ್ಹತೆ',
        moderate: 'ಮಧ್ಯಮ ವಿಶ್ವಾಸಾರ್ಹತೆ',
        limited: 'ಸೀಮಿತ ವಿಶ್ವಾಸಾರ್ಹತೆ',
        insufficient: 'ಸಾಕಷ್ಟು ದಾಖಲೆಗಳಿಲ್ಲ',
      },
    };
  }
  if (lang === 'hi') {
    return {
      official: { label: 'आधिकारिक अभिलेख', shortLabel: 'आधिकारिक' },
      factcheck: { label: 'तथ्य-जांच अभिलेखागार', shortLabel: 'फैक्ट-चेक' },
      press: { label: 'मान्यता प्राप्त प्रेस', shortLabel: 'प्रेस' },
      consensus: { label: 'स्रोत सहमति', shortLabel: 'सहमति' },
      verifiability: { label: 'सत्यापन और लिंक', shortLabel: 'सत्यापन' },
      grades: {
        high: 'उच्च विश्वसनीयता',
        moderate: 'मध्यम विश्वसनीयता',
        limited: 'सीमित विश्वसनीयता',
        insufficient: 'अपर्याप्त अभिलेख',
      },
    };
  }
  return {
    official: { label: 'Official Registries', shortLabel: 'Official' },
    factcheck: { label: 'Fact-Check Archives', shortLabel: 'Fact-Check' },
    press: { label: 'Accredited Press', shortLabel: 'Press' },
    consensus: { label: 'Source Consensus', shortLabel: 'Consensus' },
    verifiability: { label: 'Citation Integrity', shortLabel: 'Citations' },
    grades: {
      high: 'High Trust',
      moderate: 'Moderate Trust',
      limited: 'Limited Trust',
      insufficient: 'Insufficient Records',
    },
  };
}

export function computeSourceReliability(
  dossier: ClaimDossier,
  lang: Language = 'en'
): SourceReliabilityReport {
  const labels = getLocalizedAxisLabels(lang);
  const sources = Array.isArray(dossier.sources) ? dossier.sources : [];

  const officialSources = sources.filter(isOfficialSource);
  const factCheckSources = sources.filter((s) => !isOfficialSource(s) && isFactCheckSource(s));
  const pressSources = sources.filter(
    (s) => !isOfficialSource(s) && !isFactCheckSource(s) && isAccreditedPressSource(s)
  );
  const secondarySources = sources.filter(
    (s) => !isOfficialSource(s) && !isFactCheckSource(s) && !isAccreditedPressSource(s)
  );

  const accessibleLinksCount = sources.filter(
    (s) => isValidHttpUrl(s.url) && s.accessStatus !== 'unaccessible'
  ).length;
  const datedCount = sources.filter(
    (s) => Boolean((s.publicationDate && s.publicationDate.trim()) || s.retrievedAt)
  ).length;

  // 1. Official Registries score (0-100)
  const officialDecisive = officialSources.filter(
    (s) => s.status === 'confirmed' || s.status === 'corroborated' || s.status === 'refuted' || s.status === 'contradicted'
  ).length;
  const officialScore =
    officialSources.length === 0
      ? 0
      : clampScore(68 + Math.min(20, officialSources.length * 8) + Math.min(12, officialDecisive * 6));

  // 2. Fact-Check & Reference Archives score (0-100)
  const factCheckDecisive = factCheckSources.filter(
    (s) =>
      s.nliLabel === 'ENTAILMENT' ||
      s.nliLabel === 'CONTRADICTION' ||
      s.status === 'confirmed' ||
      s.status === 'contradicted' ||
      s.status === 'refuted'
  ).length;
  const factCheckScore =
    factCheckSources.length === 0
      ? 0
      : clampScore(58 + Math.min(24, factCheckSources.length * 8) + Math.min(18, factCheckDecisive * 9));

  // 3. Accredited Press score (0-100)
  const pressDecisive = pressSources.filter(
    (s) =>
      s.nliLabel === 'ENTAILMENT' ||
      s.nliLabel === 'CONTRADICTION' ||
      s.status === 'confirmed' ||
      s.status === 'contradicted' ||
      s.status === 'refuted'
  ).length;
  const uniquePressCount = getUniqueNames(pressSources, 10).length;
  const pressScore =
    pressSources.length === 0
      ? secondarySources.length > 0
        ? clampScore(25 + Math.min(20, secondarySources.length * 5))
        : 0
      : clampScore(55 + Math.min(27, uniquePressCount * 9) + Math.min(18, pressDecisive * 6));

  // 4. Source Consensus & NLI Clarity (0-100)
  let supportCount = 0;
  let contradictCount = 0;
  let nliConfSum = 0;
  let nliConfCount = 0;

  for (const s of sources) {
    if (s.nliLabel === 'ENTAILMENT' || s.status === 'confirmed' || s.status === 'corroborated') {
      supportCount++;
    } else if (s.nliLabel === 'CONTRADICTION' || s.status === 'contradicted' || s.status === 'refuted') {
      contradictCount++;
    }
    if (typeof s.nliConfidence === 'number' && s.nliConfidence > 0) {
      nliConfSum += s.nliConfidence;
      nliConfCount++;
    }
  }

  let consensusScore = 0;
  if (sources.length > 0) {
    const decisiveTotal = supportCount + contradictCount;
    const dominantRatio =
      decisiveTotal > 0 ? Math.max(supportCount, contradictCount) / decisiveTotal : 0.45;
    const avgNliConf = nliConfCount > 0 ? nliConfSum / nliConfCount : 0.68;
    const conflictPenalty =
      supportCount > 0 && contradictCount > 0
        ? Math.min(35, Math.min(supportCount, contradictCount) * 14)
        : 0;
    const coverageBoost = decisiveTotal > 0 ? Math.min(20, decisiveTotal * 5) : 0;
    consensusScore = clampScore(dominantRatio * 55 + avgNliConf * 25 + coverageBoost - conflictPenalty);
  }

  // 5. Citation & Verifiability Integrity (0-100)
  let verifiabilityScore = 0;
  if (sources.length > 0) {
    const linkRatio = accessibleLinksCount / sources.length;
    const dateRatio = datedCount / sources.length;
    const groundedBoost = dossier.groundingInfo?.isGrounded ? 10 : 0;
    const searchStatusBoost =
      dossier.evidenceAnalysis?.searchProviderStatus === 'operational'
        ? 10
        : dossier.evidenceAnalysis?.searchProviderStatus === 'fallback_archive'
        ? 4
        : 0;
    verifiabilityScore = clampScore(linkRatio * 50 + dateRatio * 30 + groundedBoost + searchStatusBoost);
  }

  // Overall composite Source Reliability Score (weighted average by archive authority)
  let overallScore = 0;
  if (sources.length > 0) {
    const tierScores = sources.map((s) => {
      let base = 52;
      if (isOfficialSource(s)) base = 96;
      else if (isFactCheckSource(s)) base = 88;
      else if (isAccreditedPressSource(s)) base = 82;

      if (isValidHttpUrl(s.url) && s.accessStatus !== 'unaccessible') base += 4;
      if (!s.publicationDate && !s.retrievedAt) base -= 6;
      return Math.max(25, Math.min(100, base));
    });
    const meanTierTrust = tierScores.reduce((acc, v) => acc + v, 0) / tierScores.length;
    const diversityBonus =
      [officialSources.length > 0, factCheckSources.length > 0, pressSources.length > 0].filter(Boolean)
        .length * 4;
    overallScore = clampScore(
      0.52 * meanTierTrust + 0.24 * verifiabilityScore + 0.24 * consensusScore + diversityBonus - 5
    );
  }

  const grade: SourceReliabilityReport['grade'] =
    sources.length === 0
      ? 'insufficient'
      : overallScore >= 75
      ? 'high'
      : overallScore >= 52
      ? 'moderate'
      : 'limited';

  const axes: ReliabilityAxis[] = [
    {
      key: 'official',
      label: labels.official.label,
      shortLabel: labels.official.shortLabel,
      score: officialScore,
      sourceCount: officialSources.length,
      sampleSources: getUniqueNames(officialSources),
      description:
        officialSources.length > 0
          ? `${officialSources.length} primary / government record(s) retrieved`
          : 'No direct government gazette or registry record in retrieved results',
    },
    {
      key: 'factcheck',
      label: labels.factcheck.label,
      shortLabel: labels.factcheck.shortLabel,
      score: factCheckScore,
      sourceCount: factCheckSources.length,
      sampleSources: getUniqueNames(factCheckSources),
      description:
        factCheckSources.length > 0
          ? `${factCheckSources.length} fact-check / reference archive entry(s)`
          : 'No dedicated fact-check or encyclopedia reference entry cited',
    },
    {
      key: 'press',
      label: labels.press.label,
      shortLabel: labels.press.shortLabel,
      score: pressScore,
      sourceCount: pressSources.length,
      sampleSources: getUniqueNames(pressSources.length > 0 ? pressSources : secondarySources),
      description:
        pressSources.length > 0
          ? `${uniquePressCount} accredited news wire(s) & publication(s)`
          : secondarySources.length > 0
          ? `${secondarySources.length} secondary web index link(s) only`
          : 'No news publications retrieved',
    },
    {
      key: 'consensus',
      label: labels.consensus.label,
      shortLabel: labels.consensus.shortLabel,
      score: consensusScore,
      sourceCount: supportCount + contradictCount,
      sampleSources: [],
      description:
        sources.length === 0
          ? 'No evidence records available to measure consensus'
          : `${supportCount} supporting vs ${contradictCount} contradicting record(s)`,
    },
    {
      key: 'verifiability',
      label: labels.verifiability.label,
      shortLabel: labels.verifiability.shortLabel,
      score: verifiabilityScore,
      sourceCount: accessibleLinksCount,
      sampleSources: [],
      description:
        sources.length === 0
          ? 'No verifiable source links or timestamps recorded'
          : `${accessibleLinksCount}/${sources.length} accessible URLs · ${datedCount}/${sources.length} dated records`,
    },
  ];

  return {
    overallScore,
    grade,
    gradeLabel: labels.grades[grade],
    totalSources: sources.length,
    axes,
    archives: {
      officialCount: officialSources.length,
      factCheckCount: factCheckSources.length,
      accreditedPressCount: pressSources.length,
      secondaryWebCount: secondarySources.length,
      accessibleLinksCount,
    },
  };
}
