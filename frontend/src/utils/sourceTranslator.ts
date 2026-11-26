import type { EvidenceSource, Language } from '../types.ts';

/**
 * Repository Name Translations (Kannada, Hindi, English)
 */
const REPOSITORY_NAMES: Record<string, { kn: string; hi: string; en: string }> = {
  'PIB Fact Check Unit': {
    kn: 'ಪಿಐಬಿ ಫ್ಯಾಕ್ಟ್ ಚೆಕ್ ಘಟಕ (PIB Fact Check)',
    hi: 'पीआईबी फैक्ट चेक यूनिट (PIB Fact Check)',
    en: 'PIB Fact Check Unit',
  },
  'PIB Fact Check & Civic Archive': {
    kn: 'ಪಿಐಬಿ ಫ್ಯಾಕ್ಟ್ ಚೆಕ್ ಮತ್ತು ನಾಗರಿಕ ದಾಖಲೆ ಭಂಡಾರ',
    hi: 'पीआईबी फैक्ट चेक एवं नागरिक अभिलेखागार',
    en: 'PIB Fact Check & Civic Archive',
  },
  'Dept of Telecommunications (DoT)': {
    kn: 'ದೂರಸಂಪರ್ಕ ಇಲಾಖೆ (DoT ಸೈಬರ್ ಸೆಲ್)',
    hi: 'दूरसंचार विभाग (DoT साइबर सेल)',
    en: 'Dept of Telecommunications (DoT)',
  },
  'National Cyber Crime Reporting Portal (I4C)': {
    kn: 'ರಾಷ್ಟ್ರೀಯ ಸೈಬರ್ ಕ್ರೈಮ್ ರಿಪೋರ್ಟಿಂಗ್ ಪೋರ್ಟಲ್ (I4C)',
    hi: 'राष्ट्रीय साइबर अपराध रिपोर्टिंग पोर्टल (I4C)',
    en: 'National Cyber Crime Reporting Portal (I4C)',
  },
  'Karnataka Dept of School Education': {
    kn: 'ಕರ್ನಾಟಕ ಶಾಲಾ ಶಿಕ್ಷಣ ಮತ್ತು ಸಾಕ್ಷರತಾ ಇಲಾಖೆ',
    hi: 'कर्नाटक स्कूल शिक्षा एवं साक्षरता विभाग',
    en: 'Karnataka Dept of School Education',
  },
  'Karnataka State Gazette Archive': {
    kn: 'ಕರ್ನಾಟಕ ರಾಜ್ಯ ಅಧಿಕೃತ ಗೆಜೆಟ್ ದಾಖಲೆ ಭಂಡಾರ',
    hi: 'कर्नाटक राज्य आधिकारिक राजपत्र अभिलेखागार',
    en: 'Karnataka State Gazette Archive',
  },
  'ISRO Bengaluru HQ': {
    kn: 'ಇಸ್ರೋ ಬೆಂಗಳೂರು ಪ್ರಧಾನ ಕಚೇರಿ (ISRO HQ)',
    hi: 'इसरो बेंगलुरु मुख्यालय (ISRO HQ)',
    en: 'ISRO Bengaluru HQ',
  },
  'Press Information Bureau (Science & Tech)': {
    kn: 'ಪಿಐಬಿ (ವಿಜ್ಞಾನ ಮತ್ತು ತಂತ್ರಜ್ಞಾನ ಬ್ಯೂರೋ)',
    hi: 'पीआईबी (विज्ञान एवं प्रौद्योगिकी ब्यूरो)',
    en: 'Press Information Bureau (Science & Tech)',
  },
  'Reserve Bank of India (RBI)': {
    kn: 'ಭಾರತೀಯ ರಿಸರ್ವ್ ಬ್ಯಾಂಕ್ (ಆರ್‌ಬಿಐ / RBI)',
    hi: 'भारतीय रिजर्व बैंक (आरबीआई / RBI)',
    en: 'Reserve Bank of India (RBI)',
  },
  'Department of School Education & State Board': {
    kn: 'ಶಾಲಾ ಶಿಕ್ಷಣ ಇಲಾಖೆ ಮತ್ತು ರಾಜ್ಯ ಮಂಡಳಿ',
    hi: 'स्कूल शिक्षा विभाग एवं राज्य बोर्ड',
    en: 'Department of School Education & State Board',
  },
  'National Civic Verification Desk': {
    kn: 'ರಾಷ್ಟ್ರೀಯ ನಾಗರಿಕ ಪರಿಶೀಲನಾ ಡೆಸ್ಕ್',
    hi: 'राष्ट्रीय नागरिक सत्यापन डेस्क',
    en: 'National Civic Verification Desk',
  },
  'India Meteorological Department (IMD)': {
    kn: 'ಭಾರತೀಯ ಹವಾಮಾನ ಇಲಾಖೆ (IMD)',
    hi: 'भारत मौसम विज्ञान विभाग (IMD)',
    en: 'India Meteorological Department (IMD)',
  },
  'Ministry of Health & ICMR Central Desk': {
    kn: 'ಕೇಂದ್ರ ಆರೋಗ್ಯ ಸಚಿವಾಲಯ ಮತ್ತು ಐಸಿಎಂಆರ್ (ICMR)',
    hi: 'केंद्रीय स्वास्थ्य मंत्रालय एवं आईसीएमआर (ICMR)',
    en: 'Ministry of Health & ICMR Central Desk',
  },
  'Ministry of Railways & Transport Authority': {
    kn: 'ರೈಲ್ವೆ ಸಚಿವಾಲಯ ಮತ್ತು ಸಾರಿಗೆ ಪ್ರಾಧಿಕಾರ',
    hi: 'रेल मंत्रालय एवं परिवहन प्राधिकरण',
    en: 'Ministry of Railways & Transport Authority',
  },
};

/**
 * Category Translations
 */
const CATEGORY_NAMES: Record<string, { kn: string; hi: string; en: string }> = {
  'Official Government Press Bureau': {
    kn: 'ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಪತ್ರಿಕಾ ಬ್ಯೂರೋ',
    hi: 'आधिकारिक सरकारी प्रेस ब्यूरो',
    en: 'Official Government Press Bureau',
  },
  'Statutory Regulator': {
    kn: 'ಶಾಸನಬದ್ಧ ನಿಯಂತ್ರಕ ಪ್ರಾಧಿಕಾರ',
    hi: 'वैधानिक नियामक प्राधिकरण',
    en: 'Statutory Regulator',
  },
  'Law Enforcement': {
    kn: 'ಕಾನೂನು ಜಾರಿ ಸಂಸ್ಥೆ',
    hi: 'कानून प्रवर्तन एजेंसी',
    en: 'Law Enforcement',
  },
  'State Ministry Portal': {
    kn: 'ರಾಜ್ಯ ಸಚಿವಾಲಯ ಅಧಿಕೃತ ಪೋರ್ಟಲ್',
    hi: 'राज्य मंत्रालय आधिकारिक पोर्टल',
    en: 'State Ministry Portal',
  },
  'Official Gazette Record': {
    kn: 'ಅಧಿಕೃತ ಗೆಜೆಟ್ ದಾಖಲೆ',
    hi: 'आधिकारिक राजपत्र रिकॉर्ड',
    en: 'Official Gazette Record',
  },
  'Space Agency Primary Record': {
    kn: 'ಬಾಹ್ಯಾಕಾಶ ಸಂಸ್ಥೆಯ ಪ್ರಾಥಮಿಕ ದಾಖಲೆ',
    hi: 'अंतरिक्ष एजेंसी प्राथमिक रिकॉर्ड',
    en: 'Space Agency Primary Record',
  },
  'Govt Official Channel': {
    kn: 'ಸರ್ಕಾರದ ಅಧಿಕೃತ ಚಾನೆಲ್',
    hi: 'सरकारी आधिकारिक चैनल',
    en: 'Govt Official Channel',
  },
  'Central Banking Authority': {
    kn: 'ಕೇಂದ್ರೀಯ ಬ್ಯಾಂಕಿಂಗ್ ಪ್ರಾಧಿಕಾರ',
    hi: 'केंद्रीय बैंकिंग प्राधिकरण',
    en: 'Central Banking Authority',
  },
  'Primary Official Desk': {
    kn: 'ಪ್ರಾಥಮಿಕ ಅಧಿಕೃತ ಪರಿಶೀಲನಾ ಡೆಸ್ಕ್',
    hi: 'प्राथमिक आधिकारिक डेस्क',
    en: 'Primary Official Desk',
  },
  'Fact-Checking Bureau': {
    kn: 'ಸತ್ಯಾಸತ್ಯತೆ ಪರಿಶೀಲನಾ ಬ್ಯೂರೋ',
    hi: 'तथ्य-जांच ब्यूरो',
    en: 'Fact-Checking Bureau',
  },
};

/**
 * Corroboration Details Translations
 */
const DETAILS_TRANSLATIONS: Record<string, { kn: string; hi: string; en: string }> = {
  'Advisory Ref #PIBFC-2024-5G: Clarified that Government runs no free recharge schemes.': {
    kn: 'ಸಲಹಾ ಉಲ್ಲೇಖ #PIBFC-2024-5G: ಭಾರತ ಸರ್ಕಾರವು ಯಾವುದೇ ಉಚಿತ 5G ರೀಚಾರ್ಜ್ ಅಥವಾ ಡೇಟಾ ಯೋಜನೆಯನ್ನು ನಡೆಸುತ್ತಿಲ್ಲ ಎಂದು ಅಧಿಕೃತವಾಗಿ ಸ್ಪಷ್ಟಪಡಿಸಿದೆ.',
    hi: 'परामर्श संदर्भ #PIBFC-2024-5G: पुष्टि की गई कि भारत सरकार ऐसी कोई मुफ्त 5G रिचार्ज योजना नहीं चला रही है।',
    en: 'Advisory Ref #PIBFC-2024-5G: Clarified that Government runs no free recharge schemes.',
  },
  'Cyber Cell flagged domain "pmyojana-free-5g.xyz" as malicious credential harvester.': {
    kn: 'ದೂರಸಂಪರ್ಕ ಸೈಬರ್ ಸೆಲ್ "pmyojana-free-5g.xyz" ಡೊಮೇನ್ ಅನ್ನು ಆಧಾರ್ ಮತ್ತು ಬ್ಯಾಂಕಿಂಗ್ ಡೇಟಾ ಕದಿಯುವ ನಕಲಿ ಸೈಟ್ ಎಂದು ದೃಢಪಡಿಸಿದೆ.',
    hi: 'दूरसंचार साइबर सेल ने "pmyojana-free-5g.xyz" डोमेन को आधार और बैंक डेटा चुराने वाला खतरनाक लिंक घोषित किया है।',
    en: 'Cyber Cell flagged domain "pmyojana-free-5g.xyz" as malicious credential harvester.',
  },
  'Blacklisted DNS records and reported registrar for immediate takedown.': {
    kn: 'ಡಿಎನ್ಎಸ್ ದಾಖಲೆಗಳನ್ನು ಕಪ್ಪುಪಟ್ಟಿಗೆ ಸೇರಿಸಲಾಗಿದ್ದು, ನಕಲಿ ಡೊಮೇನ್ ತಕ್ಷಣ ರದ್ದುಗೊಳಿಸಲು ಆದೇಶಿಸಲಾಗಿದೆ.',
    hi: 'डीएनएस रिकॉर्ड को ब्लैकलिस्ट किया गया है और फर्जी डोमेन को तत्काल रद्द करने का आदेश दिया गया है।',
    en: 'Blacklisted DNS records and reported registrar for immediate takedown.',
  },
  'Press Release clarifying normal academic operations across all districts.': {
    kn: 'ಕರ್ನಾಟಕ ಶಿಕ್ಷಣ ಇಲಾಖೆಯ ಪತ್ರಿಕಾ ಪ್ರಕಟಣೆ: ಎಲ್ಲಾ ಜಿಲ್ಲೆಗಳಲ್ಲಿ ಶಾಲೆಗಳು ಎಂದಿನಂತೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿವೆ, ಯಾವುದೇ ರಜೆ ಘೋಷಿಸಿಲ್ಲ ಎಂದು ಖಚಿತಪಡಿಸಿದೆ.',
    hi: 'कर्नाटक शिक्षा विभाग की प्रेस विज्ञप्ति: सभी जिलों में स्कूल सामान्य रूप से संचालित हो रहे हैं, कोई अवकाश घोषित नहीं है।',
    en: 'Press Release clarifying normal academic operations across all districts.',
  },
  'Matched signature hash to Order DK-DC-EDU-2023-772 dated July 23, 2023.': {
    kn: 'ಜುಲೈ 23, 2023 ರ ಹಳೆಯ ಆದೇಶ DK-DC-EDU-2023-772 ರ ಸಹಿ ಮತ್ತು ದಾಖಲೆಯೊಂದಿಗೆ 99.2% ತಾಳೆಯಾಗಿದೆ (ಹಳೆಯ ಪತ್ರ ಮರುಬಳಕೆ).',
    hi: '23 जुलाई 2023 के पुराने आदेश DK-DC-EDU-2023-772 के हस्ताक्षर से 99.2% मिलान हुआ (पुराने परिपत्र का दुरुपयोग)।',
    en: 'Matched signature hash to Order DK-DC-EDU-2023-772 dated July 23, 2023.',
  },
  'Press Release PR-L1-2024 with orbital vector parameters and telemetry data.': {
    kn: 'ಇಸ್ರೋ ಪತ್ರಿಕಾ ಪ್ರಕಟಣೆ PR-L1-2024: ಕಕ್ಷೆಯ ನಿಯತಾಂಕಗಳು ಮತ್ತು ಟೆಲಿಮೆಟ್ರಿ ಡೇಟಾ ಯಶಸ್ವಿಯಾಗಿದೆ ಎಂದು ದೃಢಪಡಿಸಿದೆ.',
    hi: 'इसरो प्रेस विज्ञप्ति PR-L1-2024: कक्षीय टेलीमेट्री और उड़ान आंकड़ों के अनुसार हेलो कक्षा प्रविष्टि पूरी तरह सफल रही।',
    en: 'Press Release PR-L1-2024 with orbital vector parameters and telemetry data.',
  },
  'Union Minister statement regarding solar payload data transmissions.': {
    kn: 'ಸೌರ ಪೇಲೋಡ್ ಡೇಟಾ ಪ್ರಸಾರಕ್ಕೆ ಸಂಬಂಧಿಸಿದಂತೆ ಕೇಂದ್ರ ಸಚಿವರ ಅಧಿಕೃತ ಸಂಸದೀಯ ಪ್ರಕಟಣೆ ಮತ್ತು ದೃಢೀಕರಣ.',
    hi: 'सौर पेलोड डेटा प्रसारण के संबंध में केंद्रीय मंत्री का आधिकारिक संसदीय बयान और पुष्टि।',
    en: 'Union Minister statement regarding solar payload data transmissions.',
  },
  'Press Release 2023-2024/668 explaining Star Series Banknote issuance procedures.': {
    kn: 'ಆರ್‌ಬಿಐ ಪತ್ರಿಕಾ ಪ್ರಕಟಣೆ 2023-2024/668: ಸ್ಟಾರ್ ಸರಣಿಯ ಬ್ಯಾಂಕ್ ನೋಟುಗಳು ನೂರಕ್ಕೆ ನೂರು ಮಾನ್ಯ ಮತ್ತು ಕಾನೂನುಬದ್ಧ ಎಂದು ದೃಢಪಡಿಸಿದೆ.',
    hi: 'आरबीआई प्रेस विज्ञप्ति 2023-2024/668: स्पष्ट किया गया कि स्टार (*) सीरीज नोट पूरी तरह वैध और असली कानूनी मुद्रा हैं।',
    en: 'Press Release 2023-2024/668 explaining Star Series Banknote issuance procedures.',
  },
  'Zero matching notifications or gazettes found in central registry.': {
    kn: 'ಕೇಂದ್ರ ಮತ್ತು ರಾಜ್ಯ ಗೆಜೆಟ್ ರಿಜಿಸ್ಟ್ರಿಯಲ್ಲಿ ಯಾವುದೇ ಹೊಂದಾಣಿಕೆಯ ಅಧಿಸೂಚನೆ ಅಥವಾ ಅಧಿಕೃತ ಆದೇಶಗಳು ಕಂಡುಬಂದಿಲ್ಲ.',
    hi: 'केंद्रीय और राज्य राजपत्र रजिस्ट्री में कोई मेल खाती अधिसूचना या आधिकारिक आदेश नहीं पाया गया।',
    en: 'Zero matching notifications or gazettes found in central registry.',
  },
  'Matched against official dispatch registry and confirmed press briefing.': {
    kn: 'ಅಧಿಕೃತ ರವಾನೆ ದಾಖಲೆಗಳು ಮತ್ತು ದೃಢೀಕೃತ ಪತ್ರಿಕಾ ಪ್ರಕಟಣೆಯೊಂದಿಗೆ ಸಂಪೂರ್ಣವಾಗಿ ತಾಳೆಯಾಗಿದೆ.',
    hi: 'आधिकारिक प्रेषण अभिलेखों और प्रमाणित प्रेस ब्रीफिंग से पूरी तरह मेल खाता है।',
    en: 'Matched against official dispatch registry and confirmed press briefing.',
  },
  'Issued formal debunk advisory classifying this specific claim as unverified disinformation.': {
    kn: 'ಈ ನಿರ್ದಿಷ್ಟ ಸುದ್ದಿಯನ್ನು ಆಧಾರರಹಿತ ವದಂತಿ ಎಂದು ವರ್ಗೀಕರಿಸಿ ಅಧಿಕೃತ ಸ್ಪಷ್ಟೀಕರಣ ನೀಡಲಾಗಿದೆ.',
    hi: 'इस दावे को निराधार अफवाह के रूप में वर्गीकृत करते हुए आधिकारिक एडवाइजरी जारी की गई।',
    en: 'Issued formal debunk advisory classifying this specific claim as unverified disinformation.',
  },
  'Primary verification bulletin confirmed authenticity of published records.': {
    kn: 'ಪ್ರಾಥಮಿಕ ಪರಿಶೀಲನಾ ಬುಲೆಟಿನ್ ಪ್ರಕಟಿತ ದಾಖಲೆಗಳು ಸಂಪೂರ್ಣ ಅಸಲಿ ಮತ್ತು ಅಧಿಕೃತ ಎಂದು ದೃಢಪಡಿಸಿದೆ.',
    hi: 'प्राथमिक सत्यापन बुलेटिन ने पुष्टि की कि प्रकाशित रिकॉर्ड पूरी तरह प्रामाणिक और सच हैं।',
    en: 'Primary verification bulletin confirmed authenticity of published records.',
  },
  'Cross-referenced against verified government releases, gazettes, and official agency communiques.': {
    kn: 'ಪರಿಶೀಲಿಸಿದ ಸರ್ಕಾರಿ ಪ್ರಕಟಣೆಗಳು, ಗೆಜೆಟ್‌ಗಳು ಮತ್ತು ಅಧಿಕೃತ ಇಲಾಖಾ ಸಂವಹನಗಳೊಂದಿಗೆ ಪರಿಶೀಲಿಸಲಾಗಿದೆ.',
    hi: 'सत्यापित सरकारी विज्ञप्तियों, राजपत्रों और आधिकारिक विभागीय घोषणाओं से मिलान किया गया।',
    en: 'Cross-referenced against verified government releases, gazettes, and official agency communiques.',
  },
};

/**
 * Returns translated name for an evidence repository
 */
export function getSourceName(src: EvidenceSource, lang: Language): string {
  if (src.nameTranslations?.[lang]) {
    return src.nameTranslations[lang]!;
  }
  const match = REPOSITORY_NAMES[src.name];
  if (match) {
    return match[lang];
  }
  return src.name;
}

/**
 * Returns translated category for an evidence repository
 */
export function getSourceCategory(src: EvidenceSource, lang: Language): string {
  if (src.categoryTranslations?.[lang]) {
    return src.categoryTranslations[lang]!;
  }
  const match = CATEGORY_NAMES[src.category];
  if (match) {
    return match[lang];
  }
  if (lang === 'kn') {
    return 'ಅಧಿಕೃತ ಪರಿಶೀಲನಾ ದಾಖಲೆ';
  }
  if (lang === 'hi') {
    return 'आधिकारिक सत्यापन रिकॉर्ड';
  }
  return src.category;
}

/**
 * Returns translated status badge label for an evidence source
 */
export function getSourceStatusLabel(srcOrStatus: EvidenceSource | string, lang: Language): string {
  const status = typeof srcOrStatus === 'string' ? srcOrStatus : srcOrStatus?.status || '';
  if (lang === 'kn') {
    switch (status) {
      case 'confirmed':
        return 'ದೃಢೀಕೃತ ದಾಖಲೆ (Verified Record)';
      case 'refuted':
      case 'contradicted':
        return 'ಖಂಡನೆ / ಸುಳ್ಳು (Refuted)';
      case 'no_record':
        return 'ದಾಖಲೆ ಇಲ್ಲ (No Record)';
      case 'corroborated':
        return 'ದೃಢೀಕೃತ ಸಾಕ್ಷ್ಯ (Corroborated)';
      case 'unverified':
        return 'ದೃಢೀಕರಿಸಲಾಗಿಲ್ಲ (Unverified)';
      default:
        return 'ದಾಖಲೆ ಪರಿಶೀಲಿಸಲಾಗಿದೆ';
    }
  }
  if (lang === 'hi') {
    switch (status) {
      case 'confirmed':
        return 'सत्यापित रिकॉर्ड (Verified Record)';
      case 'refuted':
      case 'contradicted':
        return 'खंडन / असत्य (Refuted)';
      case 'no_record':
        return 'कोई रिकॉर्ड नहीं (No Record)';
      case 'corroborated':
        return 'पुष्टीकृत साक्ष्य (Corroborated)';
      case 'unverified':
        return 'अपुष्ट (Unverified)';
      default:
        return 'रिकॉर्ड जांचा गया';
    }
  }
  switch (status) {
    case 'confirmed':
      return 'Verified Record';
    case 'refuted':
    case 'contradicted':
      return 'Refuted by Official Record';
    case 'no_record':
      return 'No Record in Gazette';
    case 'corroborated':
      return 'Corroborated Record';
    case 'unverified':
      return 'Unverified / Insufficient Evidence';
    default:
      return 'Registry Searched';
  }
}

/**
 * Returns translated record corroboration details for an evidence source
 */
export function getSourceDetails(src: EvidenceSource, lang: Language): string {
  if (src.detailsTranslations?.[lang]) {
    return src.detailsTranslations[lang]!;
  }
  const match = DETAILS_TRANSLATIONS[src.details];
  if (match) {
    return match[lang];
  }

  // Dynamic fallback translation based on status & keywords
  if (lang === 'kn') {
    if (src.status === 'confirmed' || src.status === 'corroborated') {
      return `ಅಧಿಕೃತ ಗೆಜೆಟ್ ಮತ್ತು ಪ್ರಕಟಣೆಯ ದಾಖಲೆಗಳ ಪರಿಶೀಲನೆಯಲ್ಲಿ ಈ ಮಾಹಿತಿ ನೈಜವೆಂದು ದೃಢಪಟ್ಟಿದೆ: ${src.details}`;
    } else {
      return `ಅಧಿಕೃತ ಸರ್ಕಾರಿ ದಾಖಲೆಗಳು ಮತ್ತು ಗೆಜೆಟ್ ಆರ್ಕೈವ್‌ನಲ್ಲಿ ಈ ಹೇಳಿಕೆಗೆ ಯಾವುದೇ ಆಧಾರ ಕಂಡುಬಂದಿಲ್ಲ: ${src.details}`;
    }
  }

  if (lang === 'hi') {
    if (src.status === 'confirmed' || src.status === 'corroborated') {
      return `आधिकारिक राजपत्र एवं विभागीय विज्ञप्ति के सत्यापन में यह विवरण सही पाया गया: ${src.details}`;
    } else {
      return `आधिकारिक अभिलेखों एवं राजपत्र रिकॉर्ड में इस दावे का कोई प्रमाण नहीं मिला: ${src.details}`;
    }
  }

  return src.details;
}

/**
 * Returns the Evidentiary Findings section title in the selected language
 */
export function getEvidentiaryFindingsTitle(lang: Language): string {
  if (lang === 'kn') {
    return 'ಸಾಕ್ಷ್ಯಾಧಾರಿತ ಸಂಶೋಧನೆಗಳು (Evidentiary Findings)';
  }
  if (lang === 'hi') {
    return 'साक्ष्य निष्कर्ष एवं तथ्य-जांच (Evidentiary Findings)';
  }
  return 'Evidentiary Findings & Analytical Assessment';
}

/**
 * Returns the Record Corroboration section title in the selected language
 */
export function getRecordCorroborationTitle(count: number, lang: Language): string {
  if (lang === 'kn') {
    return `ಅಧಿಕೃತ ದಾಖಲೆ ದೃಢೀಕರಣ ಮತ್ತು ಸಾಕ್ಷ್ಯಾಧಾರ ಮೂಲಗಳು (${count})`;
  }
  if (lang === 'hi') {
    return `आधिकारिक रिकॉर्ड संपुष्टि एवं साक्ष्य स्रोत (${count})`;
  }
  return `Official Evidence Sources & Record Corroboration (${count})`;
}

/**
 * Returns the Primary Source Action Link text in the selected language
 */
export function getPrimarySourceActionLabel(hasUrl: boolean, srcName: string, lang: Language): string {
  if (lang === 'kn') {
    return hasUrl ? 'ಅಧಿಕೃತ ಸಾಕ್ಷ್ಯಾಧಾರ ದಾಖಲೆ ಪರಿಶೀಲಿಸಿ' : `ಗೂಗಲ್‌ನಲ್ಲಿ "${srcName}" ದಾಖಲೆ ಹುಡುಕಿ`;
  }
  if (lang === 'hi') {
    return hasUrl ? 'प्राथमिक साक्ष्य रिकॉर्ड देखें' : `गूगल पर "${srcName}" रिकॉर्ड खोजें`;
  }
  return hasUrl ? 'Open Primary Evidence Source' : `Search "${srcName}" on Google`;
}
