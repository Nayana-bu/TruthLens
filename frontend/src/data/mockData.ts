import { ClaimDossier, CommunitySubmission, Language, VerifiedAuthority } from '../types';

export const INITIAL_DOSSIERS: ClaimDossier[] = [
  {
    id: 'dossier-narendra-modi-pm',
    title: 'Narendra modi is not a prime minister of India',
    originalClaim: 'Narendra modi is not a prime minister of India',
    verdict: 'false',
    verdictLabel: 'FAKE NEWS',
    verdictSubtitle: 'Official cross-examination confirms this claim is entirely fabricated. No gazette record, press release, or ministry order exists to corroborate this viral message.',
    confidenceScore: 99.8,
    timeAgo: 'Verified 2 minutes ago',
    category: 'governance',
    sourceEntity: 'National Civic Verification Desk',
    languages: ['en', 'kn', 'hi'],
    summary: {
      en: 'Multiple official sources confirm that Narendra Modi is the current Prime Minister of India. The claim circulated on social media is false and appears to be a fabricated political message. No credible evidence supports this claim.',
      kn: 'ನರೇಂದ್ರ ಮೋದಿಯವರು ಭಾರತದ ಪ್ರಧಾನ ಮಂತ್ರಿ ಅಲ್ಲ ಎಂಬ ಸಾಮಾಜಿಕ ಜಾಲತಾಣದ ಸುದ್ದಿ ಸಂಪೂರ್ಣ ಸುಳ್ಳು. ಭಾರತದ ಅಧಿಕೃತ ಗೆಜೆಟ್ ದಾಖಲೆಗಳು ನರೇಂದ್ರ ಮೋದಿಯವರು ಭಾರತದ ಪ್ರಸ್ತುತ ಪ್ರಧಾನ ಮಂತ್ರಿಯಾಗಿದ್ದಾರೆ ಎಂಬುದನ್ನು ದೃಢಪಡಿಸುತ್ತವೆ.',
      hi: 'सोशल मीडिया पर प्रसारित यह दावा कि नरेंद्र मोदी भारत के प्रधानमंत्री नहीं हैं, पूरी तरह फर्जी और भ्रामक है। भारत का राजपत्र पुष्टि करता है कि नरेंद्र मोदी वर्तमान प्रधानमंत्री हैं।'
    },
    debunkExplanation: {
      en: 'Official cross-examination confirms this claim is entirely fabricated. No gazette record, press release, or ministry order exists to corroborate this viral message.',
      kn: 'ಅಧಿಕೃತ ದಾಖಲೆಗಳ ಪರಿಶೀಲನೆಯಲ್ಲಿ ಈ ಹೇಳಿಕೆ ಸಂಪೂರ್ಣ ಕಾಲ್ಪನಿಕ ಮತ್ತು ಸುಳ್ಳು ಎಂದು ದೃಢಪಟ್ಟಿದೆ. ಯಾವುದೇ ಗೆಜೆಟ್ ದಾಖಲೆ ಅಥವಾ ಸಚಿವಾಲಯದ ಆದೇಶವು ಈ ವೈರಲ್ ಸಂದೇಶವನ್ನು ಬೆಂಬಲಿಸುವುದಿಲ್ಲ.',
      hi: 'आधिकारिक जांच से पुष्टि होती है कि यह दावा पूरी तरह मनगढ़ंत है। कोई भी गजट रिकॉर्ड, प्रेस विज्ञप्ति या मंत्रालय का आदेश इस वायरल संदेश का समर्थन नहीं करता है।'
    },
    clearVerdictStatus: 'FAKE',
    spokenAudioScript: {
      en: 'Official cross-examination confirms this claim is entirely fabricated. Multiple official sources confirm that Narendra Modi is the current Prime Minister of India. No credible evidence supports this claim.',
      kn: 'ಎಚ್ಚರಿಕೆ! ನರೇಂದ್ರ ಮೋದಿಯವರು ಭಾರತದ ಪ್ರಧಾನ ಮಂತ್ರಿ ಅಲ್ಲ ಎಂಬ ಸುದ್ದಿ ಸಂಪೂರ್ಣ ಸುಳ್ಳಾಗಿದೆ. ಅಧಿಕೃತ ಗೆಜೆಟ್ ದಾಖಲೆಗಳ ಪ್ರಕಾರ ನರೇಂದ್ರ ಮೋದಿಯವರು ಭಾರತದ ಪ್ರಸ್ತುತ ಪ್ರಧಾನಿಯಾಗಿದ್ದಾರೆ. ಈ ನಕಲಿ ಸಂದೇಶವನ್ನು ಯಾರೂ ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.',
      hi: 'सावधान! यह दावा कि नरेंद्र मोदी भारत के प्रधानमंत्री नहीं हैं, पूरी तरह फर्जी है। आधिकारिक सरकारी रिकॉर्ड के अनुसार नरेंद्र मोदी ही भारत के वर्तमान प्रधानमंत्री हैं। इस झूठे संदेश पर विश्वास न करें।'
    },
    whatsappDebunkNote: {
      en: '🚨 *TRUTHLENS FACT CHECK ALERT* 🚨\n\n❌ *VERDICT: FAKE NEWS / ಸುಳ್ಳು ಸುದ್ದಿ*\n\n*Claim:* "Narendra modi is not a prime minister of India"\n*Fact:* Official government records confirm Narendra Modi is the incumbent Prime Minister of India. This circulating forward is fabricated.\n\n_Ref: TruthLens Civic Verification Unit_',
      kn: '🚨 *ಟ್ರೂತ್‌ಲೆನ್ಸ್ ಫ್ಯಾಕ್ಟ್ ಚೆಕ್ ಎಚ್ಚರಿಕೆ* 🚨\n\n❌ *ತೀರ್ಪು: ಸಂಪೂರ್ಣ ಸುಳ್ಳು ಸುದ್ದಿ*\n\n*ವೈರಲ್ ಸುದ್ದಿ:* "ನರೇಂದ್ರ ಮೋದಿ ಭಾರತದ ಪ್ರಧಾನಿ ಅಲ್ಲ"\n*ಸತ್ಯ:* ನರೇಂದ್ರ ಮೋದಿಯವರು ಭಾರತದ ಪ್ರಸ್ತುತ ಅಧಿಕೃತ ಪ್ರಧಾನ ಮಂತ್ರಿ. ಸುಳ್ಳು ವದಂತಿಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳಬೇಡಿ.',
      hi: '🚨 *ट्रूथलेन्स फैक्ट चेक चेतावनी* 🚨\n\n❌ *निष्कर्ष: पूरी तरह फर्जी*\n\n*दावा:* नरेंद्र मोदी भारत के प्रधानमंत्री नहीं हैं\n*सच्चाई:* सरकारी रिकॉर्ड पुष्टि करते हैं कि नरेंद्र मोदी भारत के मौजूदा प्रधानमंत्री हैं।'
    },
    sources: [
      {
        name: 'National Civic Verification Desk',
        category: 'Government Clarification',
        status: 'refuted',
        details: 'Primary official desk. No matching notifications found in central registry.',
        url: 'https://factcheck.pib.gov.in/',
        timestamp: 'Verified 2 minutes ago'
      },
      {
        name: 'PIB Fact Check & Civic Archive',
        category: 'Government Clarification',
        status: 'refuted',
        details: 'Flagged as unverified viral forward circulating across community channels.',
        url: 'https://factcheck.pib.gov.in/',
        timestamp: 'Verified today'
      },
      {
        name: 'Google Search Fact-Check Index',
        category: 'Searched Registry',
        status: 'confirmed',
        details: 'Live web search queries show this claim is false across trusted sources.',
        url: 'https://www.google.com/search?q=Narendra+modi+is+not+a+prime+minister+of+India+fact+check',
        timestamp: 'Real-time'
      }
    ],
    redFlags: [
      'No official gazette notification supports this claim',
      'No press release or ministry order found',
      'Inconsistent font and missing government format',
      'Viral image appears to be edited'
    ],
    timeline: [
      { time: '10:00 AM', event: 'First detected spreading across social media handles', source: 'Crowd Sensor' },
      { time: '10:45 AM', event: 'Official portals cross-referenced against Cabinet registry', source: 'Central Registry' },
      { time: '11:15 AM', event: 'TruthLens publishes verified debunk dossier', source: 'TruthLens Engine' }
    ],
    originVector: 'Social Media Viral Posts & Edited Screenshots',
    officialRefId: 'TL-GOV-PM-2024-001',
    groundingInfo: {
      isGrounded: true,
      queries: ['Narendra Modi prime minister of India official status', 'PM India PIB Fact Check'],
      sources: [
        { title: 'PIB Fact Check Desk', uri: 'https://factcheck.pib.gov.in' },
        { title: 'Official Portal of Prime Minister of India', uri: 'https://www.pmindia.gov.in' }
      ]
    }
  },
  {
    id: 'dossier-500gb-free-data',
    title: 'Viral 500GB Free Data Scheme Link',
    originalClaim: 'Govt announces free 500GB 5G recharge for all citizens under PM Digital Yojana. Click here to claim: pmyojana-free-5g.xyz',
    verdict: 'false',
    verdictLabel: 'False • Phishing Scheme',
    verdictSubtitle: 'Circulating link mimics Dept of Telecom domains to gather biometric data and Aadhaar OTPs.',
    confidenceScore: 99.4,
    timeAgo: 'Debunked 2h ago',
    category: 'phishing',
    sourceEntity: 'Telecom Cyber Cell',
    languages: ['en', 'hi'],
    summary: {
      en: 'Circulating link mimics Dept of Telecom domains to gather biometric data and Aadhaar OTPs.',
      kn: 'ದೂರಸಂಪರ್ಕ ಇಲಾಖೆಯ ಹೆಸರಿನಲ್ಲಿ ಬಯೋಮೆಟ್ರಿಕ್ ಡೇಟಾ ಮತ್ತು ಆಧಾರ್ ಒಟಿಪಿ ಕದಿಯಲು ಹರಡುತ್ತಿರುವ ನಕಲಿ ಲಿಂಕ್.',
      hi: 'दूरसंचार विभाग के नाम से फर्जी लिंक फैलाकर बायोमेट्रिक डेटा और आधार ओटीपी चुराने का प्रयास किया जा रहा है।'
    },
    debunkExplanation: {
      en: 'The Ministry of Communications and PIB Fact Check have clarified that the Government of India is running no such free 5G data scheme. The domain "pmyojana-free-5g.xyz" is an unverified phishing site hosted on offshore servers designed to steal Aadhaar OTPs and banking credentials.',
      kn: 'ಸಂವಹನ ಸಚಿವಾಲಯ (DoT) ಮತ್ತು ಪಿಐಬಿ (PIB) ಫ್ಯಾಕ್ಟ್ ಚೆಕ್ ಸ್ಪಷ್ಟಪಡಿಸಿದ್ದು, ಭಾರತ ಸರ್ಕಾರವು ಯಾವುದೇ ಉಚಿತ 500GB 5G ಡೇಟಾ ಯೋಜನೆಯನ್ನು ಘೋಷಿಸಿಲ್ಲ. "pmyojana-free-5g.xyz" ಎಂಬ ಡೊಮೇನ್ ವಿದೇಶಿ ಸರ್ವರ್‌ಗಳಲ್ಲಿ ನೋಂದಾಯಿಸಲ್ಪಟ್ಟ ನಕಲಿ ಫಿಶಿಂಗ್ ಸೈಟ್ ಆಗಿದ್ದು, ಇದು ನಾಗರಿಕರ ಆಧಾರ್ ಒಟಿಪಿ ಮತ್ತು ಬ್ಯಾಂಕಿಂಗ್ ರಹಸ್ಯಗಳನ್ನು ಕದಿಯಲು ಹರಡಲಾದ ಸೈಬರ್ ವಂಚನೆಯಾಗಿದೆ ಎಂದು ಸಾಕ್ಷ್ಯಾಧಾರಗಳ ಸಮೇತ ದೃಢಪಟ್ಟಿದೆ.',
      hi: 'संचार मंत्रालय (DoT) और पीआईबी (PIB) फैक्ट चेक ने आधिकारिक रूप से स्पष्ट किया है कि भारत सरकार द्वारा कोई भी मुफ्त 500GB 5G डेटा योजना नहीं चलाई जा रही है। "pmyojana-free-5g.xyz" डोमेन एक अनधिकृत फ़िशिंग वेबसाइट है जिसे नागरिकों के आधार ओटीपी और बैंकिंग क्रेडेंशियल चुराने के लिए बनाया गया है।'
    },
    clearVerdictStatus: 'FAKE',
    spokenAudioScript: {
      kn: 'ಗಮನಿಸಿ! ಇದು ಸಂಪೂರ್ಣ ಸುಳ್ಳು ಮತ್ತು ಅಪಾಯಕಾರಿ ನಕಲಿ ಸಂದೇಶ. ಭಾರತ ಸರ್ಕಾರ ಅಥವಾ ದೂರಸಂಪರ್ಕ ಇಲಾಖೆ ಇಂತಹ ಯಾವುದೇ ಉಚಿತ 5G ರೀಚಾರ್ಜ್ ಅಥವಾ ಡೇಟಾ ಯೋಜನೆಯನ್ನು ಘೋಷಿಸಿಲ್ಲ. ಈ ಲಿಂಕ್ ಅನ್ನು ಕ್ಲಿಕ್ ಮಾಡಬೇಡಿ, ಇದು ನಿಮ್ಮ ಆಧಾರ್ ಒಟಿಪಿ ಮತ್ತು ಬ್ಯಾಂಕ್ ಖಾತೆಯಿಂದ ಹಣ ಕದಿಯಲು ಹರಡಿರುವ ಸೈಬರ್ ವಂಚನೆಯಾಗಿದೆ.',
      hi: 'सावधान! यह दावा सौ प्रतिशत फर्जी और साइबर धोखाधड़ी है। भारत सरकार या दूरसंचार मंत्रालय ने ऐसी कोई मुफ्त 5G डाटा योजना घोषित नहीं की है। इस लिंक पर बिल्कुल क्लिक न करें, यह आपके बैंक खाते से पैसे चुराने और ओटीपी लेने का खतरनाक जाल है।',
      en: 'Alert! This claim is completely FAKE and a dangerous cyber scam. The Government of India and Ministry of Telecom have confirmed no such free 5G data scheme exists. Do not click this link or share your Aadhaar OTP.'
    },
    whatsappDebunkNote: {
      en: '🚨 *TRUTHLENS FACT CHECK ALERT* 🚨\n\n❌ *VERDICT: FAKE & DANGEROUS PHISHING SCAM*\n\n*Viral Claim:* "Govt giving free 500GB 5G data under PM Yojana"\n*Fact:* PIB Fact Check and Dept of Telecom confirm NO such scheme exists. The link asks for Aadhaar OTP to drain bank accounts. Do NOT click or forward!\n\n_Official Ref: PIB-DoT-Cyber-2024-9182_',
      kn: '🚨 *ಟ್ರೂತ್‌ಲೆನ್ಸ್ ಫ್ಯಾಕ್ಟ್ ಚೆಕ್ ಎಚ್ಚರಿಕೆ* 🚨\n\n❌ *ತೀರ್ಪು: ನಕಲಿ ಮತ್ತು ಅಪಾಯಕಾರಿ ವಂಚನೆ*\n\n*ವೈರಲ್ ಸಂದೇಶ:* "ಪಿಎಂ ಡಿಜಿಟಲ್ ಯೋಜನೆಯಡಿ ಉಚಿತ 500GB 5G ಡೇಟಾ"\n*ಸತ್ಯ:* ಕೇಂದ್ರ ಸರ್ಕಾರ ಅಥವಾ ಟೆಲಿಕಾಂ ಇಲಾಖೆ ಇಂತಹ ಯಾವುದೇ ಯೋಜನೆಯನ್ನು ಆರಂಭಿಸಿಲ್ಲ. ನಿಮ್ಮ ಆಧಾರ್ ಒಟಿಪಿ ನೀಡಬೇಡಿ!',
      hi: '🚨 *ट्रूथलेन्स फैक्ट चेक चेतावनी* 🚨\n\n❌ *निष्कर्ष: पूरी तरह फर्जी और साइबर धोखाधड़ी*\n\n*वायरल दावा:* "पीएम योजना के तहत सभी को 500GB 5G फ्री डेटा"\n*हकीकत:* पीआईबी फैक्ट चेक ने स्पष्ट किया है कि सरकार ऐसी कोई योजना नहीं चला रही है। यह बैंक खाली करने वाला लिंक है।'
    },
    sources: [
      {
        name: 'PIB Fact Check Unit',
        category: 'Official Government Press Bureau',
        status: 'refuted',
        details: 'Advisory Ref #PIBFC-2024-5G: Clarified that Government runs no free recharge schemes.',
        url: 'https://pib.gov.in/factcheck',
        timestamp: 'Today at 08:30 AM'
      },
      {
        name: 'Dept of Telecommunications (DoT)',
        category: 'Statutory Regulator',
        status: 'refuted',
        details: 'Cyber Cell flagged domain "pmyojana-free-5g.xyz" as malicious credential harvester.',
        timestamp: 'Today at 09:15 AM'
      },
      {
        name: 'National Cyber Crime Reporting Portal (I4C)',
        category: 'Law Enforcement',
        status: 'refuted',
        details: 'Blacklisted DNS records and reported registrar for immediate takedown.',
        timestamp: 'Today at 09:40 AM'
      }
    ],
    redFlags: [
      'Unverified TLD (.xyz instead of official .gov.in or .nic.in domain)',
      'Artificial urgency ("Valid only for next 3 hours")',
      'Demands forwarding to 5 WhatsApp groups before redemption',
      'Requests Aadhaar OTP and banking PIN during questionnaire'
    ],
    timeline: [
      { time: '06:12 AM', event: 'First detected spreading across WhatsApp groups in Bengaluru & Delhi NCR', source: 'Crowd Sensor' },
      { time: '07:45 AM', event: 'Over 14,000 citizens reached via forwarded chain letters', source: 'Telegram Monitor' },
      { time: '08:30 AM', event: 'DoT Cyber Security Division issues emergency phishing warning', source: 'DoT Press' },
      { time: '09:00 AM', event: 'TruthLens publishes verified debunk dossier & counter-forward', source: 'TruthLens Engine' }
    ],
    originVector: 'WhatsApp Forwarded Message with URL Shortener',
    officialRefId: 'PIB-DOT-CYB-2024-0981',
    groundingInfo: {
      isGrounded: true,
      queries: [
        'PM Digital Yojana free 500GB 5G recharge scam fact check',
        'pmyojana-free-5g.xyz PIB Fact Check telecom cyber cell',
        'free 500GB data government announcement'
      ],
      sources: [
        {
          title: 'PIB Fact Check: Free 5G Data Scam Alert',
          uri: 'https://factcheck.pib.gov.in',
        },
        {
          title: 'Google Search: PM Digital Yojana 500GB 5G Recharge Fact Check',
          uri: 'https://www.google.com/search?q=PM+Digital+Yojana+500GB+5G+recharge+scam+fact+check',
        },
      ],
    },
  },
  {
    id: 'dossier-karnataka-school-holiday',
    title: 'Karnataka Monsoon School Holiday Circular',
    originalClaim: 'Karnataka Government orders 3-day statewide emergency holiday for all primary and high schools due to severe cyclone alert.',
    verdict: 'misleading',
    verdictLabel: 'Misleading • Old 2023 Order',
    verdictSubtitle: 'Recycled district commissioner signature block from July 2023 falsely presented as current statewide notice.',
    confidenceScore: 97.8,
    timeAgo: 'Updated 4h ago',
    category: 'governance',
    sourceEntity: 'Education Dept',
    languages: ['kn', 'en'],
    summary: {
      en: 'Recycled district commissioner signature block from July 2023 falsely presented as current statewide notice.',
      kn: 'ಜುಲೈ 2023 ರ ಜಿಲ್ಲಾಧಿಕಾರಿಗಳ ಹಳೆಯ ಸಹಿಯ ಆದೇಶ ಪತ್ರವನ್ನು ಪ್ರಸ್ತುತ ಆದೇಶವೆಂದು ಸುಳ್ಳಾಗಿ ಹಂಚಿಕೊಳ್ಳಲಾಗುತ್ತಿದೆ.',
      hi: 'जुलाई 2023 के पुराने जिला कलेक्टर आदेश को वर्तमान राज्यव्यापी आदेश के रूप में गलत तरीके से प्रसारित किया जा रहा है।'
    },
    debunkExplanation: {
      en: 'The circular being circulated on WhatsApp is an altered image of an official order issued by the Dakshina Kannada Deputy Commissioner back on 23rd July 2023. The Karnataka Department of School Education and Literacy has confirmed that schools are operating on regular schedule.',
      kn: 'ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಹರಿದಾಡುತ್ತಿರುವ ಸುತ್ತೋಲೆಯು ಜುಲೈ 2023 ರ ದಕ್ಷಿಣ ಕನ್ನಡ ಜಿಲ್ಲಾಧಿಕಾರಿಗಳ ಹಳೆಯ ಆದೇಶದ ತಿದ್ದಿದ ಚಿತ್ರವಾಗಿದೆ. ಕರ್ನಾಟಕ ಶಾಲಾ ಶಿಕ್ಷಣ ಮತ್ತು ಸಾಕ್ಷರತಾ ಇಲಾಖೆಯು ರಾಜ್ಯಾದ್ಯಂತ ಎಲ್ಲಾ ಶಾಲೆಗಳು ಎಂದಿನಂತೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿವೆ ಮತ್ತು ಯಾವುದೇ ತುರ್ತು ರಜೆ ಘೋಷಿಸಿಲ್ಲ ಎಂದು ಅಧಿಕೃತವಾಗಿ ಸ್ಪಷ್ಟಪಡಿಸಿದೆ.',
      hi: 'व्हाट्सएप पर प्रसारित हो रहा परिपत्र जुलाई 2023 का दक्षिण कन्नड़ जिला उपायुक्त का एक पुराना आदेश है, जिसमें छेड़छाड़ की गई है। कर्नाटक स्कूल शिक्षा एवं साक्षरता विभाग ने आधिकारिक पुष्टि की है कि सभी स्कूल नियमित समय सारिणी पर चल रहे हैं और कोई राज्यव्यापी अवकाश घोषित नहीं किया गया है।'
    },
    clearVerdictStatus: 'MISLEADING',
    spokenAudioScript: {
      kn: 'ಸ್ಪಷ್ಟೀಕರಣ! ಇದು ಹಳೆಯ ಆದೇಶವಾಗಿದ್ದು, ಪ್ರಸ್ತುತ ದಾರಿತಪ್ಪಿಸುವ ಸುದ್ದಿಯಾಗಿದೆ. ಕರ್ನಾಟಕ ಶಾಲಾ ಶಿಕ್ಷಣ ಇಲಾಖೆಯು ರಾಜ್ಯಾದ್ಯಂತ ಶಾಲೆಗಳಿಗೆ ಯಾವುದೇ ತುರ್ತು ರಜೆ ಘೋಷಿಸಿಲ್ಲ. ಇದು ಜುಲೈ 2023 ರ ಹಳೆಯ ಪತ್ರವಾಗಿದ್ದು, ಶಾಲೆಗಳು ಎಂದಿನಂತೆ ನಡೆಯುತ್ತಿವೆ. ಪೋಷಕರು ಆತಂಕಕ್ಕೆ ಒಳಗಾಗಬೇಡಿ.',
      hi: 'ध्यान दें! यह जानकारी भ्रामक और पुरानी है। कर्नाटक शिक्षा विभाग ने पुष्टि की है कि स्कूलों में कोई आपातकालीन अवकाश घोषित नहीं किया गया है। यह जुलाई 2023 का पुराना सर्कुलर है और सभी स्कूल सामान्य रूप से खुले हैं।',
      en: 'Clarification! This is MISLEADING. The Karnataka Department of School Education confirms schools are operating normally. This circular is a recycled letter from July 2023.'
    },
    whatsappDebunkNote: {
      en: '⚠️ *TRUTHLENS FACT CHECK ALERT* ⚠️\n\n*Claim:* Statewide 3-day school holiday announced in Karnataka.\n*VERDICT: MISLEADING / RECYCLED 2023 NOTICE*\n\n*Fact:* Karnataka Education Department confirms schools are operating normally. The circular image has been edited with July 2023 district signatures. Please do not panic parents.\n\n_Ref: Karnataka Edu Dept Bulletin_',
      kn: '⚠️ *ಟ್ರೂತ್‌ಲೆನ್ಸ್ ಫ್ಯಾಕ್ಟ್ ಚೆಕ್ ಎಚ್ಚರಿಕೆ* ⚠️\n\n*ಸುದ್ದಿ:* ಕರ್ನಾಟಕದಲ್ಲಿ ಶಾಲೆಗಳಿಗೆ 3 ದಿನ ತುರ್ತು ರಜೆ.\n*ತೀರ್ಪು: ದಾರಿತಪ್ಪಿಸುವ ಸುದ್ದಿ (2023 ರ ಹಳೆಯ ಪತ್ರ)*\n\n*ಸತ್ಯ:* ಶಾಲಾ ಶಿಕ್ಷಣ ಇಲಾಖೆಯು ಯಾವುದೇ ರಜೆ ಘೋಷಿಸಿಲ್ಲ. ಶಾಲೆಗಳು ಎಂದಿನಂತೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತಿವೆ. ಗೊಂದಲ ಸೃಷ್ಟಿಸಬೇಡಿ.',
      hi: '⚠️ *ट्रूथलेन्स फैक्ट चेक* ⚠️\n\n*दावा:* कर्नाटक के सभी स्कूलों में 3 दिन की छुट्टी घोषित।\n*निष्कर्ष: पुराना 2023 का आदेश (भ्रामक)*\n\n*सच्चाई:* शिक्षा विभाग ने पुष्टि की है कि कोई छुट्टी नहीं दी गई है।'
    },
    sources: [
      {
        name: 'Karnataka Dept of School Education',
        category: 'State Ministry Portal',
        status: 'refuted',
        details: 'Press Release clarifying normal academic operations across all districts.',
        url: 'https://schooleducation.karnataka.gov.in/',
        timestamp: 'Today at 07:15 AM'
      },
      {
        name: 'Karnataka State Gazette Archive',
        category: 'Official Gazette Record',
        status: 'refuted',
        details: 'Matched signature hash to Order DK-DC-EDU-2023-772 dated July 23, 2023.',
        url: 'https://karnataka.gov.in/gazette',
        timestamp: 'Forensic Match 99.2%'
      }
    ],
    redFlags: [
      'Document date field has visible pixel artifacting and font mismatch',
      'Refers to cyclone system "Biparjoy" which made landfall in mid-2023',
      'No publication on the official Karnataka KSEAB portal'
    ],
    timeline: [
      { time: '05:30 AM', event: 'Circulated in parent-teacher WhatsApp groups across Bengaluru and Mysuru', source: 'Citizen Tip-off' },
      { time: '06:45 AM', event: 'Primary Education Directorate receives flood of inquiry calls', source: 'State Desk' },
      { time: '07:15 AM', event: 'Official clarification published by Education Commissioner', source: 'Official Order' }
    ],
    originVector: 'WhatsApp Image / Edited PDF Circular',
    officialRefId: 'KAR-EDU-MONSOON-2024-C3',
    groundingInfo: {
      isGrounded: true,
      queries: [
        'Karnataka school holiday 3 days circular fact check',
        'Karnataka school education commissioner holiday notice today',
        'Dakshina Kannada deputy commissioner school holiday circular'
      ],
      sources: [
        {
          title: 'Karnataka School Education Dept Official Portal',
          uri: 'https://schooleducation.karnataka.gov.in/',
        },
        {
          title: 'Google Search: Karnataka 3 Day School Holiday Order Fact Check',
          uri: 'https://www.google.com/search?q=Karnataka+school+holiday+circular+fact+check',
        },
      ],
    },
  },
  {
    id: 'dossier-isro-solar-probe',
    title: 'ISRO Solar Probe Trajectory Announcement',
    originalClaim: 'ISRO completes scheduled Halo Orbit Insertion for Aditya-L1 solar observatory with zero telemetry drift.',
    verdict: 'verified_true',
    verdictLabel: 'Verified True • ISRO Official',
    verdictSubtitle: 'Telemetry release confirms planned orbital insertion sequence matches scheduled launch manifest.',
    confidenceScore: 99.9,
    timeAgo: 'Verified today',
    category: 'space',
    sourceEntity: 'ISRO HQ Press Release',
    languages: ['en', 'kn', 'hi'],
    summary: {
      en: 'Telemetry release confirms planned orbital insertion sequence matches scheduled launch manifest.',
      kn: 'ಟೆಲಿಮೆಟ್ರಿ ಬಿಡುಗಡೆಯು ಆದಿತ್ಯ-ಎಲ್1 ನ ಕಕ್ಷೆಯ ಪ್ರವೇಶ ಅನುಕ್ರಮವನ್ನು ದೃಢಪಡಿಸಿದೆ.',
      hi: 'इसरो टेलीमेट्री रिलीज ने पुष्टि की है कि योजनाबद्ध कक्षीय प्रविष्टि सफल रही है।'
    },
    debunkExplanation: {
      en: 'Official telemetry released by the Indian Space Research Organisation (ISRO) telemetry tracking and command network (ISTRAC) in Bengaluru confirms that the spacecraft entered the designated halo orbit around the Sun-Earth Lagrange point L1 on schedule with zero telemetry drift.',
      kn: 'ಬೆಂಗಳೂರಿನ ಇಸ್ರೋ ಟೆಲಿಮೆಟ್ರಿ ಟ್ರ್ಯಾಕಿಂಗ್ ಮತ್ತು ಕಮಾಂಡ್ ನೆಟ್‌ವರ್ಕ್ (ISTRAC) ಬಿಡುಗಡೆ ಮಾಡಿದ ಅಧಿಕೃತ ಟೆಲಿಮೆಟ್ರಿ ದಾಖಲೆಗಳು ಆದಿತ್ಯ-ಎಲ್1 ಬಾಹ್ಯಾಕಾಶ ನೌಕೆಯು ಸೂರ್ಯ-ಭೂಮಿ ಲಗ್ರಾಂಜ್ ಪಾಯಿಂಟ್ L1 ಸುತ್ತಲಿನ ನಿಗದಿತ ಹಾಲೋ ಕಕ್ಷೆಯನ್ನು ನಿಗದಿತ ಸಮಯಕ್ಕೆ ಯಶಸ್ವಿಯಾಗಿ ಪ್ರವೇಶಿಸಿದೆ ಎಂಬುದನ್ನು ಸಂಪೂರ್ಣವಾಗಿ ದೃಢಪಡಿಸಿವೆ.',
      hi: 'बेंगलुरु स्थित भारतीय अंतरिक्ष अनुसंधान संगठन (इसरो) के टेलीमेट्री ट्रैकिंग एंड कमांड नेटवर्क (ISTRAC) द्वारा जारी आधिकारिक टेलीमेट्री आंकड़ों ने पुष्टि की है कि आदित्य-एल1 अंतरिक्ष यान तय समय पर सूर्य-पृथ्वी लैग्रेंज बिंदु L1 के चारों ओर निर्धारित हेलो कक्षा में सफलतापूर्वक स्थापित हो गया है।'
    },
    clearVerdictStatus: 'REAL',
    spokenAudioScript: {
      kn: 'ಅಧಿಕೃತ ಸತ್ಯ! ಇಸ್ರೋ ಆದಿತ್ಯ-ಎಲ್1 ನೌಕೆಯು ನಿಗದಿತ ಕಕ್ಷೆಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ತಲುಪಿದೆ ಎಂಬ ಸುದ್ದಿ ನೂರಕ್ಕೆ ನೂರು ಸತ್ಯವಾಗಿದೆ. ಭಾರತೀಯ ಬಾಹ್ಯಾಕಾಶ ಸಂಶೋಧನಾ ಸಂಸ್ಥೆ ಅಧಿಕೃತವಾಗಿ ಈ ಕಾರ್ಯಾಚರಣೆಯ ಯಶಸ್ಸನ್ನು ದೃಢಪಡಿಸಿದೆ.',
      hi: 'सत्य प्रमाण! इसरो का आदित्य-एल1 सौर मिशन सफलतापूर्वक अपनी निर्धारित कक्षा में स्थापित हो गया है। यह दावा पूरी तरह सच और इसरो द्वारा प्रमाणित है।',
      en: 'Confirmed Real! The claim that ISRO Aditya-L1 solar probe completed its halo orbit insertion is 100% verified true by official space agency mission telemetry.'
    },
    whatsappDebunkNote: {
      en: '✅ *TRUTHLENS FACT CHECK VERIFIED* ✅\n\n*Claim:* ISRO Aditya-L1 Solar Probe successfully established in Halo Orbit.\n*VERDICT: VERIFIED TRUE (OFFICIAL ISRO TELEMETRY)*\n\n*Fact:* Confirmed via ISRO Space Applications Centre and official press brief #ISRO-PR-2024-11. Scientific instruments operational.\n\n_Ref: ISTRAC Mission Operations Center_',
      kn: '✅ *ಟ್ರೂತ್‌ಲೆನ್ಸ್ ಫ್ಯಾಕ್ಟ್ ಚೆಕ್ ದೃಢೀಕರಣ* ✅\n\n*ಸುದ್ದಿ:* ಇಸ್ರೋ ಆದಿತ್ಯ-ಎಲ್1 ಯಶಸ್ವಿ ಕಕ್ಷೆ ಪ್ರವೇಶ.\n*ತೀರ್ಪು: ಸತ್ಯ (ಇಸ್ರೋ ಅಧಿಕೃತ ದೃಢೀಕರಣ)*\n\n*ವಿವರ:* ಇಸ್ರೋ ಅಧಿಕೃತವಾಗಿ ಬಿಡುಗಡೆ ಮಾಡಿದ ಮಾಹಿತಿಯಂತೆ ಕಾರ್ಯಾಚರಣೆ ಸಂಪೂರ್ಣ ಯಶಸ್ವಿಯಾಗಿದೆ.',
      hi: '✅ *ट्रूथलेन्स फैक्ट चेक: सत्य* ✅\n\n*दावा:* इसरो का आदित्य-एल1 सौर मिशन सफलतापूर्वक स्थापित।\n*निष्कर्ष: पूर्णतः सत्य*\n\n*विवरण:* इसरो मुख्यालय द्वारा आधिकारिक पुष्टि जारी की गई है।'
    },
    sources: [
      {
        name: 'ISRO Bengaluru HQ',
        category: 'Space Agency Primary Record',
        status: 'confirmed',
        details: 'Press Release PR-L1-2024 with orbital vector parameters and telemetry data.',
        url: 'https://isro.gov.in',
        timestamp: 'Today at 04:00 PM'
      },
      {
        name: 'Press Information Bureau (Science & Tech)',
        category: 'Govt Official Channel',
        status: 'confirmed',
        details: 'Union Minister statement regarding solar payload data transmissions.',
        url: 'https://pib.gov.in',
        timestamp: 'Today at 04:15 PM'
      }
    ],
    redFlags: [],
    timeline: [
      { time: '03:45 PM', event: 'Thruster burn initiation telemetry broadcast on ISTRAC live terminal', source: 'Telemetry Stream' },
      { time: '04:00 PM', event: 'Halo Orbit Insertion confirmed by Mission Director', source: 'ISRO Bengaluru' }
    ],
    originVector: 'Press Release & Space Telemetry Archive',
    officialRefId: 'ISRO-PR-2024-11-L1',
    groundingInfo: {
      isGrounded: true,
      queries: [
        'ISRO Aditya-L1 Halo Orbit insertion telemetry press release',
        'Aditya L1 solar observatory ISTRAC mission update'
      ],
      sources: [
        {
          title: 'ISRO Official Mission Announcement',
          uri: 'https://www.isro.gov.in',
        },
        {
          title: 'Google Search: ISRO Aditya L1 Halo Orbit Insertion',
          uri: 'https://www.google.com/search?q=ISRO+Aditya-L1+Halo+Orbit+Insertion+official+telemetry',
        },
      ],
    },
  },
  {
    id: 'dossier-rbi-green-star-notes',
    title: 'RBI Colored Star Symbol Currency Rumor',
    originalClaim: 'Currency notes with a star (*) symbol in the number panel are fake and invalid according to RBI order.',
    verdict: 'false',
    verdictLabel: 'False • Banking Misinformation',
    verdictSubtitle: 'RBI Star Series notes are 100% legal tender used as replacement packets for misprinted notes.',
    confidenceScore: 98.7,
    timeAgo: 'Debunked 1d ago',
    category: 'governance',
    sourceEntity: 'Reserve Bank of India',
    languages: ['en', 'hi'],
    summary: {
      en: 'RBI Star Series notes are 100% legal tender used as replacement packets for misprinted notes.',
      kn: 'ನಂಬರ್ ಪ್ಯಾನೆಲ್‌ನಲ್ಲಿ ನಕ್ಷತ್ರ (*) ಗುರುತಿರುವ ನೋಟುಗಳು ಅಸಲಿಯಾಗಿದ್ದು, ಆರ್‌ಬಿಐ ನಿಂದ ಮಾನ್ಯತೆ ಪಡೆದಿವೆ.',
      hi: 'स्टार (*) निशान वाले नोट पूरी तरह वैध हैं, आरबीआई ने स्पष्ट किया है कि ये केवल रीप्लेसमेंट नोट हैं।'
    },
    debunkExplanation: {
      en: 'The Reserve Bank of India clarified through an official notification that banknotes with a star symbol in the number panel are fully legal tender. The star signifies a replacement note in a serialized packet where a defective note was extracted during high-speed printing.',
      kn: 'ಭಾರತೀಯ ರಿಸರ್ವ್ ಬ್ಯಾಂಕ್ (ಆರ್‌ಬಿಐ) ಅಧಿಕೃತ ಅಧಿಸೂಚನೆಯ ಮೂಲಕ ಸಂಖ್ಯೆ ಫಲಕದಲ್ಲಿ ನಕ್ಷತ್ರ (*) ಚಿಹ್ನೆಯಿರುವ ನೋಟುಗಳು ನೂರಕ್ಕೆ ನೂರು ಮಾನ್ಯವಾದ ಮತ್ತು ಕಾನೂನುಬದ್ಧ ಕರೆನ್ಸಿ ನೋಟುಗಳಾಗಿವೆ ಎಂದು ಸ್ಪಷ್ಟಪಡಿಸಿದೆ. ಈ ನಕ್ಷತ್ರ ಚಿಹ್ನೆಯು ಮುದ್ರಣದ ಸಮಯದಲ್ಲಿ ದೋಷಪೂರಿತ ನೋಟಿನ ಬದಲಿಗೆ ಬಳಸಲಾದ ಸರಣಿ ಬದಲಿ ನೋಟನ್ನು ಸೂಚಿಸುತ್ತದೆ.',
      hi: 'भारतीय रिजर्व बैंक (आरबीआई) ने आधिकारिक अधिसूचना द्वारा स्पष्ट किया है कि नंबर पैनल में स्टार (*) चिह्न वाले बैंक नोट पूरी तरह से वैध और कानूनी मुद्रा हैं। स्टार चिह्न केवल मुद्रण के दौरान खराब हुए नोटों के स्थान पर प्रतिस्थापन (रिप्लेसमेंट) नोट के रूप में उपयोग किया जाता है।'
    },
    clearVerdictStatus: 'FAKE',
    spokenAudioScript: {
      kn: 'ಸುಳ್ಳು ಸುದ್ದಿ ಎಚ್ಚರಿಕೆ! ನಂಬರ್ ಪ್ಯಾನೆಲ್‌ನಲ್ಲಿ ನಕ್ಷತ್ರ ಗುರುತಿರುವ ಕರೆನ್ಸಿ ನೋಟುಗಳು ನಕಲಿ ಅಥವಾ ಅಮಾನ್ಯ ಎಂಬ ಸುದ್ದಿ ಸಂಪೂರ್ಣ ಸುಳ್ಳಾಗಿದೆ. ಭಾರತೀಯ ರಿಸರ್ವ್ ಬ್ಯಾಂಕ್ ಸ್ಪಷ್ಟಪಡಿಸಿರುವಂತೆ ಇಂತಹ ನೋಟುಗಳು ಸಂಪೂರ್ಣ ಅಸಲಿ ಮತ್ತು ಕಾನೂನುಬದ್ಧವಾಗಿವೆ.',
      hi: 'फर्जी खबर से बचें! स्टार निशान वाले नोट अमान्य होने की खबर पूरी तरह गलत है। भारतीय रिजर्व बैंक ने स्पष्ट किया है कि ये नोट सौ प्रतिशत असली और वैध हैं।',
      en: 'Fake News Warning! Rumors claiming banknotes with a star mark are invalid are false. The Reserve Bank of India has confirmed that Star Series notes are 100% legal tender.'
    },
    whatsappDebunkNote: {
      en: '🚨 *TRUTHLENS FACT CHECK ALERT* 🚨\n\n*Claim:* Notes with Star (*) symbol are counterfeit.\n*VERDICT: FALSE*\n\n*Fact:* Reserve Bank of India (RBI) has clarified that Star Series notes are 100% genuine legal tender used to replace defective notes during printing.\n\n_Ref: RBI Press Release 2023-2024/668_',
      kn: '🚨 *ಟ್ರೂತ್‌ಲೆನ್ಸ್ ಫ್ಯಾಕ್ಟ್ ಚೆಕ್* 🚨\n\n*ಸುದ್ದಿ:* ನಕ್ಷತ್ರ ಗುರುತಿರುವ ನೋಟುಗಳು ನಕಲಿ.\n*ತೀರ್ಪು: ಸುಳ್ಳು*\n\n*ಸತ್ಯ:* ಆರ್‌ಬಿಐ ಪ್ರಕಾರ ಈ ನೋಟುಗಳು ಸಂಪೂರ್ಣ ಚಲಾವಣೆಯಲ್ಲಿವೆ.',
      hi: '🚨 *ट्रूथलेन्स फैक्ट चेक* 🚨\n\n*दावा:* स्टार (*) वाले नोट फर्जी हैं।\n*निष्कर्ष: बिल्कुल गलत*\n\n*सच्चाई:* आरबीआई ने स्पष्ट किया है कि स्टार वाले नोट 100% असली हैं।'
    },
    sources: [
      {
        name: 'Reserve Bank of India (RBI)',
        category: 'Central Banking Authority',
        status: 'confirmed',
        details: 'Press Release 2023-2024/668 explaining Star Series Banknote issuance procedures.',
        url: 'https://rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx',
        timestamp: 'Archived Notice'
      }
    ],
    redFlags: [
      'Claims shopkeepers will reject the note without citing any official banking regulation',
      'Sensational video claiming demonetization of specific serial prefixes'
    ],
    timeline: [
      { time: '11:00 AM', event: 'Video uploaded on Instagram claiming star notes are banned', source: 'Instagram Reels' },
      { time: '02:30 PM', event: 'RBI issues official clarification on Star Series legitimacy', source: 'RBI Spokesperson' }
    ],
    originVector: 'Social Media Viral Video / WhatsApp Audio',
    officialRefId: 'RBI-NOT-2023-668',
    groundingInfo: {
      isGrounded: true,
      queries: [
        'RBI star series banknote legal tender clarification fact check',
        'Reserve Bank of India star notes counterfeit rumor'
      ],
      sources: [
        {
          title: 'RBI Press Release: Star Series Banknotes',
          uri: 'https://rbi.org.in',
        },
        {
          title: 'Google Search: RBI Star Series Currency Note Fact Check',
          uri: 'https://www.google.com/search?q=RBI+star+series+banknote+valid+legal+tender+fact+check',
        },
      ],
    },
  }
];

export const COMMUNITY_SUBMISSIONS: CommunitySubmission[] = [
  {
    id: 'sub-1',
    claimText: 'Forward claiming Indian Railways is cancelling all trains between Bengaluru and Mangaluru due to western ghat landslide warning.',
    submittedBy: 'Naveen K. (Mangaluru)',
    submittedAt: '35m ago',
    platform: 'WhatsApp',
    category: 'Disaster & Transport',
    language: 'kn',
    upvotes: 42,
    verdictVotes: { falseVotes: 29, trueVotes: 3, needsDataVotes: 8 },
    status: 'under_investigation'
  },
  {
    id: 'sub-2',
    claimText: 'Viral audio clip claiming new rule imposes ₹5,000 fine for keeping phone flashlight turned on while driving in Delhi.',
    submittedBy: 'Pooja V. (New Delhi)',
    submittedAt: '1h ago',
    platform: 'WhatsApp',
    category: 'Traffic & Law',
    language: 'hi',
    upvotes: 68,
    verdictVotes: { falseVotes: 61, trueVotes: 1, needsDataVotes: 6 },
    status: 'debunked'
  },
  {
    id: 'sub-3',
    claimText: 'Screenshot of an alleged circular claiming UGC has made four-year undergraduate degrees mandatory for all 2024 batches.',
    submittedBy: 'Rahul M. (Hyderabad)',
    submittedAt: '2h ago',
    platform: 'X/Twitter',
    category: 'Higher Education',
    language: 'en',
    upvotes: 53,
    verdictVotes: { falseVotes: 38, trueVotes: 5, needsDataVotes: 10 },
    status: 'under_investigation'
  }
];

export const LEADERBOARD = [
  { name: 'Kavita Ramanathan', city: 'Bengaluru', debunks: 184, accuracy: '99.2%', badge: 'Master Forensic Auditor' },
  { name: 'Dr. Sameer Khan', city: 'Delhi', debunks: 142, accuracy: '98.5%', badge: 'Senior Fact Investigator' },
  { name: 'Ananya Deshmukh', city: 'Pune', debunks: 119, accuracy: '97.9%', badge: 'Phishing Hunter' },
  { name: 'Siddheshwar Gowda', city: 'Mysuru', debunks: 96, accuracy: '98.1%', badge: 'Civic Fact Analyst' },
  { name: 'Praveen Chawla', city: 'Jaipur', debunks: 88, accuracy: '96.8%', badge: 'Disinformation Tracker' }
];

export const UI_TRANSLATIONS: Record<Language, Record<string, string>> = {
  en: {
    appName: 'TruthLens',
    verifySub: 'Verify',
    multilingualBadge: 'Multilingual Fact Engine',
    heroTitle: 'Verify before you share.',
    heroSub: 'Investigate claims with live official records, primary sources, and verified news archives.',
    tabText: 'Text / WhatsApp',
    tabOcr: 'Screenshot / OCR',
    tabUrl: 'Web / URL',
    tapToTry: 'Tap to try sample',
    inputPlaceholder: 'Paste forwarded WhatsApp message, viral rumor, headline, or claim to investigate...',
    readyClaim: 'Ready for claim extraction',
    tooShort: 'Claim too short for cross-referencing',
    readyCrossExam: 'Ready to cross-examine 48 repositories',
    pasteBtn: 'Paste from clipboard',
    attachBtn: 'Attach screenshot',
    archiveSweepTitle: 'Autonomous Multi-Archive Sweep',
    archiveSweepSub: 'PIB Fact Check • Karnataka Gazette • Reuters',
    trendingTitle: 'Trending Verifications',
    viewAll: 'View all',
    inspectDossier: 'Inspect Dossier',
    claimsRefutedCount: '14,289',
    claimsRefutedDesc: 'Claims refuted in last 30 days across 3 languages',
    ctaInvestigate: 'Start Evidence Investigation',
    ctaSubtext: 'Grounds facts in live official data, not guesswork',
    navVerify: 'Verify',
    navInvestigation: 'Investigation',
    navExplore: 'Explore Feed',
    navCommunity: 'Community',
    searchClaims: 'Search verified claims, rumors, or domains...',
    dossierModalTitle: 'Evidentiary Dossier',
    copyWhatsapp: 'Copy WhatsApp Debunk Note',
    copiedAlert: 'Copied WhatsApp counter-forward to clipboard!',
    listenAudio: 'Listen to Voice Briefing',
    officialRef: 'Official Reference',
    evidenceFound: 'Corroborating Repositories',
    redFlagAlert: 'Disinformation Indicators',
    originVector: 'Primary Transmission Vector'
  },
  kn: {
    appName: 'ಟ್ರೂತ್‌ಲೆನ್ಸ್',
    verifySub: 'ಪರಿಶೀಲನೆ',
    multilingualBadge: 'ಬಹುಭಾಷಾ ಸತ್ಯ ಶೋಧನಾ ಎಂಜಿನ್',
    heroTitle: 'ಹಂಚಿಕೊಳ್ಳುವ ಮುನ್ನ ಪರಿಶೀಲಿಸಿ.',
    heroSub: 'ಲೈವ್ ಅಧಿಕೃತ ದಾಖಲೆಗಳು, ಪ್ರಾಥಮಿಕ ಮೂಲಗಳು ಮತ್ತು ಪರಿಶೀಲಿಸಿದ ಸುದ್ದಿ ದಾಖಲೆಗಳೊಂದಿಗೆ ಪರಿಶೀಲಿಸಿ.',
    tabText: 'ಪಠ್ಯ / ವಾಟ್ಸಾಪ್',
    tabOcr: 'ಸ್ಕ್ರೀನ್‌ಶಾಟ್ / ಒಸಿಆರ್',
    tabUrl: 'ವೆಬ್ / ಲಿಂಕ್',
    tapToTry: 'ಮಾದರಿ ಪ್ರಯತ್ನಿಸಲು ಒತ್ತಿ',
    inputPlaceholder: 'ಫಾರ್ವರ್ಡ್ ಮಾಡಿದ ವಾಟ್ಸಾಪ್ ಸಂದೇಶ, ವದಂತಿ ಅಥವಾ ಸುದ್ದಿಯನ್ನು ಇಲ್ಲಿ ಪೇಸ್ಟ್ ಮಾಡಿ...',
    readyClaim: 'ಹಕ್ಕು ಹೊರತೆಗೆಯಲು ಸಿದ್ಧವಾಗಿದೆ',
    tooShort: 'ಪರಿಶೀಲಿಸಲು ವಿವರ ಸಾಲದು',
    readyCrossExam: '48 ಅಧಿಕೃತ ದಾಖಲೆಗಳನ್ನು ಪರಿಶೀಲಿಸಲು ಸಿದ್ಧ',
    pasteBtn: 'ಕ್ಲಿಪ್‌ಬೋರ್ಡ್‌ನಿಂದ ಪೇಸ್ಟ್ ಮಾಡಿ',
    attachBtn: 'ಚಿತ್ರ ಸೇರಿಸಿ',
    archiveSweepTitle: 'ಸ್ವಾಯತ್ತ ಬಹು-ದಾಖಲೆ ಶೋಧ',
    archiveSweepSub: 'ಪಿಐಬಿ ಫ್ಯಾಕ್ಟ್ ಚೆಕ್ • ಕರ್ನಾಟಕ ಗೆಜೆಟ್ • ರಾಯಿಟರ್ಸ್',
    trendingTitle: 'ಟ್ರೆಂಡಿಂಗ್ ಪರಿಶೀಲನೆಗಳು',
    viewAll: 'ಎಲ್ಲವನ್ನೂ ವೀಕ್ಷಿಸಿ',
    inspectDossier: 'ಸತ್ಯ ಪರೀಕ್ಷಿಸಿ',
    claimsRefutedCount: '14,289',
    claimsRefutedDesc: 'ಕಳೆದ 30 ದಿನಗಳಲ್ಲಿ 3 ಭಾಷೆಗಳಲ್ಲಿ ಸುಳ್ಳೆಂದು ಸಾಬೀತಾದ ವದಂತಿಗಳು',
    ctaInvestigate: 'ಸಾಕ್ಷ್ಯಾಧಾರ ಪರಿಶೀಲನೆ ಆರಂಭಿಸಿ',
    ctaSubtext: 'ಊಹೆಗಳ ಬದಲಿಗೆ ಅಧಿಕೃತ ಸರ್ಕಾರಿ ದಾಖಲೆಗಳ ಆಧಾರದ ಮೇಲೆ',
    navVerify: 'ಪರಿಶೀಲನೆ',
    navInvestigation: 'ತನಿಖೆ',
    navExplore: 'ಫೀಡ್ ವೀಕ್ಷಣೆ',
    navCommunity: 'ಸಮುದಾಯ',
    searchClaims: 'ಪರಿಶೀಲಿಸಿದ ವದಂತಿಗಳು ಅಥವಾ ಲಿಂಕ್‌ಗಳನ್ನು ಹುಡುಕಿ...',
    dossierModalTitle: 'ಸಾಕ್ಷ್ಯ ಸಂಶೋಧನಾ ವರದಿ',
    copyWhatsapp: 'ವಾಟ್ಸಾಪ್ ಸಂದೇಶ ನಕಲಿಸಿ',
    copiedAlert: 'ವಾಟ್ಸಾಪ್ ಸ್ಪಷ್ಟೀಕರಣ ಸಂದೇಶ ಕಾಪಿ ಮಾಡಲಾಗಿದೆ!',
    listenAudio: 'ಧ್ವನಿ ವಿವರಣೆ ಕೇಳಿ',
    officialRef: 'ಅಧಿಕೃತ ಉಲ್ಲೇಖ',
    evidenceFound: 'ದೃಢೀಕರಣ ನೀಡಿದ ಇಲಾಖೆಗಳು',
    redFlagAlert: 'ವಂಚನೆಯ ಎಚ್ಚರಿಕೆಯ ಅಂಶಗಳು',
    originVector: 'ಹರಡಿದ ಮಾಧ್ಯಮ'
  },
  hi: {
    appName: 'ट्रूथलेन्स',
    verifySub: 'सत्यापन',
    multilingualBadge: 'बहुभाषी तथ्य सत्यापन इंजन',
    heroTitle: 'शेयर करने से पहले जांचें।',
    heroSub: 'लाइव सरकारी रिकॉर्ड, प्राथमिक स्रोतों और सत्यापित अभिलेखागारों के साथ पड़ताल करें।',
    tabText: 'टेक्स्ट / व्हाट्सएप',
    tabOcr: 'स्क्रीनशॉट / ओसीआर',
    tabUrl: 'वेब / यूआरएल',
    tapToTry: 'सैंपल आजमाने के लिए टैप करें',
    inputPlaceholder: 'फॉरवर्ड किया गया व्हाट्सएप संदेश, वायरल अफवाह या हेडलाइन यहां पेस्ट करें...',
    readyClaim: 'दावा निष्कर्षण के लिए तैयार',
    tooShort: 'जांच के लिए टेक्स्ट बहुत छोटा है',
    readyCrossExam: '48 अभिलेखागारों में जांच के लिए तैयार',
    pasteBtn: 'क्लिपबोर्ड से पेस्ट करें',
    attachBtn: 'स्क्रीनशॉट जोड़ें',
    archiveSweepTitle: 'स्वायत्त बहु-अभिलेखागार पड़ताल',
    archiveSweepSub: 'पीआईबी फैक्ट चेक • कर्नाटक राजपत्र • रॉयटर्स',
    trendingTitle: 'ट्रेंडिंग सत्यापन',
    viewAll: 'सभी देखें',
    inspectDossier: 'दस्तावेज देखें',
    claimsRefutedCount: '14,289',
    claimsRefutedDesc: 'पिछले 30 दिनों में 3 भाषाओं में झूठे साबित हुए दावे',
    ctaInvestigate: 'साक्ष्य आधारित जांच शुरू करें',
    ctaSubtext: 'अटकलों के बजाय केवल आधिकारिक सरकारी डेटा पर आधारित',
    navVerify: 'सत्यापन',
    navInvestigation: 'अनुसंधान',
    navExplore: 'एक्सप्लोर फीड',
    navCommunity: 'समुदाय',
    searchClaims: 'सत्यापित दावों या अफवाहों को खोजें...',
    dossierModalTitle: 'साक्ष्य अनुसंधान रिपोर्ट',
    copyWhatsapp: 'व्हाट्सएप फैक्ट-चेक कॉपी करें',
    copiedAlert: 'व्हाट्सएप स्पष्टीकरण संदेश कॉपी हो गया!',
    listenAudio: 'ऑडियो ब्रीफिंग सुनें',
    officialRef: 'आधिकारिक संदर्भ',
    evidenceFound: 'सत्यापित सरकारी स्रोत',
    redFlagAlert: 'धोखाधड़ी के संकेत',
    originVector: 'प्रसार का माध्यम'
  }
};

export const VERIFIED_AUTHORITIES: VerifiedAuthority[] = [
  {
    id: 'cybercrime',
    name: 'National Cyber Crime Reporting Portal',
    agencyName: 'Ministry of Home Affairs (I4C)',
    category: 'cyber_security',
    officialUrl: 'https://cybercrime.gov.in',
    helpline: '1930 (Toll-Free 24x7)',
    description: 'Nodal national authority for reporting cyber fraud, phishing, Aadhaar OTP theft, and online impersonation.',
    verifiedBadge: 'Govt of India (.gov.in)',
    jurisdiction: 'Pan-India',
  },
  {
    id: 'pib',
    name: 'PIB Fact Check Unit',
    agencyName: 'Press Information Bureau, Ministry of I&B',
    category: 'government',
    officialUrl: 'https://factcheck.pib.gov.in',
    whatsappHelpline: '+91 87997 11259',
    emailContact: 'pibfactcheck@gmail.com',
    description: 'Statutory verification bureau for countering viral disinformation regarding Central Government ministries, policies, and welfare schemes.',
    verifiedBadge: 'Official PIB (.gov.in)',
    jurisdiction: 'Central Ministries & National Schemes',
  },
  {
    id: 'karnataka_factcheck',
    name: 'Karnataka State Fact Check Unit',
    agencyName: 'Dept of Information & Public Relations (DIPR), Govt of Karnataka',
    category: 'state',
    officialUrl: 'https://factcheck.karnataka.gov.in',
    helpline: '112 / 1905',
    description: 'Official Karnataka state authority validating state government orders, educational circulars, guarantee schemes, and localized viral claims.',
    verifiedBadge: 'Govt of Karnataka (.gov.in)',
    jurisdiction: 'Karnataka State',
  },
  {
    id: 'cert_in',
    name: 'CERT-In Incident Response Desk',
    agencyName: 'Indian Computer Emergency Response Team, MeitY',
    category: 'cyber_security',
    officialUrl: 'https://www.cert-in.org.in',
    emailContact: 'incident@cert-in.org.in',
    description: 'National nodal agency for responding to computer security incidents, fraudulent websites, malware, and rogue APK campaigns.',
    verifiedBadge: 'MeitY Statutory (.org.in)',
    jurisdiction: 'National Critical Cyber Infrastructure',
  },
  {
    id: 'rbi_sachet',
    name: 'RBI Sachet & Financial Fraud Cell',
    agencyName: 'Reserve Bank of India',
    category: 'financial',
    officialUrl: 'https://sachet.rbi.org.in',
    helpline: '14440 (Toll-Free Financial Fraud Assistance)',
    description: 'Apex banking regulatory portal for verifying financial notices, currency demonetization rumors, unauthorized loan apps, and fraudulent deposit schemes.',
    verifiedBadge: 'Reserve Bank of India (.org.in)',
    jurisdiction: 'Banking & Financial System',
  },
  {
    id: 'chakshu',
    name: 'DoT Sanchar Saathi & Chakshu Facility',
    agencyName: 'Department of Telecommunications, Ministry of Communications',
    category: 'government',
    officialUrl: 'https://sancharsaathi.gov.in/sfc/',
    description: 'Citizen safety initiative to report suspected fraud communications via SMS, calls, or WhatsApp purporting to offer free recharges or SIM deactivations.',
    verifiedBadge: 'Dept of Telecom (.gov.in)',
    jurisdiction: 'Telecom & SMS Networks',
  },
  {
    id: 'boomlive',
    name: 'BOOM Live Fact Check',
    agencyName: 'BOOM Independent Newsroom',
    category: 'independent_ifcn',
    officialUrl: 'https://www.boomlive.in',
    whatsappHelpline: '+91 77009 06588',
    description: 'Independent fact-checking newsroom certified by the International Fact-Checking Network (IFCN) operating across English, Hindi, and regional languages.',
    verifiedBadge: 'IFCN Signatory Certified',
    jurisdiction: 'Independent Civic Verification',
  },
  {
    id: 'altnews',
    name: 'Alt News India',
    agencyName: 'Pravda Media Foundation',
    category: 'independent_ifcn',
    officialUrl: 'https://www.altnews.in',
    description: 'Non-profit fact-checking portal certified by the International Fact-Checking Network (IFCN) tracking communal, political, and medical misinformation.',
    verifiedBadge: 'IFCN Signatory Certified',
    jurisdiction: 'Independent Civic Verification',
  },
];
