import { ClaimDossier, CommunitySubmission, Language } from '../types';

export const INITIAL_DOSSIERS: ClaimDossier[] = [
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
      kn: 'ಸಂವಹನ ಸಚಿವಾಲಯ ಮತ್ತು ಪಿಐಬಿ ಫ್ಯಾಕ್ಟ್ ಚೆಕ್ ಸ್ಪಷ್ಟಪಡಿಸಿದ್ದು, ಭಾರತ ಸರ್ಕಾರವು ಯಾವುದೇ ಉಚಿತ 5G ಡೇಟಾ ಯೋಜನೆಯನ್ನು ಘೋಷಿಸಿಲ್ಲ. ಈ ಲಿಂಕ್ ವಂಚನೆಯಾಗಿದೆ.',
      hi: 'संचार मंत्रालय और पीआईबी फैक्ट चेक ने पुष्टि की है कि भारत सरकार ऐसी कोई मुफ्त 5G डेटा योजना नहीं चला रही है। यह लिंक फर्जी है।'
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
      kn: 'ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಹರಿದಾಡುತ್ತಿರುವ ಆದೇಶ ಪತ್ರವು ಜುಲೈ 2023 ರ ದಕ್ಷಿಣ ಕನ್ನಡ ಜಿಲ್ಲೆಯ ಹಳೆಯ ಆದೇಶವಾಗಿದೆ. ಪ್ರಸ್ತುತ ರಾಜ್ಯಾದ್ಯಂತ ಯಾವುದೇ ರಜೆ ಘೋಷಿಸಿಲ್ಲ ಎಂದು ಶಿಕ್ಷಣ ಇಲಾಖೆ ಸ್ಪಷ್ಟಪಡಿಸಿದೆ.',
      hi: 'व्हाट्सएप पर फैलाया जा रहा सर्कुलर जुलाई 2023 का पुराना आदेश है। कर्नाटक शिक्षा विभाग ने पुष्टि की है कि सभी स्कूल सामान्य रूप से खुले हैं।'
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
      en: 'Official telemetry released by the Indian Space Research Organisation (ISRO) telemetry tracking and command network (ISTRAC) in Bengaluru confirms that the spacecraft entered the designated halo orbit around the Sun-Earth Lagrange point L1 on schedule.',
      kn: 'ಭಾರತೀಯ ಬಾಹ್ಯಾಕಾಶ ಸಂಶೋಧನಾ ಸಂಸ್ಥೆ (ಇಸ್ರೋ) ಬಿಡುಗಡೆ ಮಾಡಿದ ಅಧಿಕೃತ ಮಾಹಿತಿಯ ಪ್ರಕಾರ, ಆದಿತ್ಯ-ಎಲ್1 ನೌಕೆಯು ನಿಗದಿತ ಕಕ್ಷೆಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ತಲುಪಿದೆ.',
      hi: 'भारतीय अंतरिक्ष अनुसंधान संगठन (इसरो) ने आधिकारिक रूप से पुष्टि की है कि आदित्य-एल1 अंतरिक्ष यान सफलतापूर्वक अपनी लक्षित कक्षा में स्थापित हो गया है।'
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
      kn: 'ಆರ್‌ಬಿಐ ಅಧಿಕೃತವಾಗಿ ತಿಳಿಸಿರುವಂತೆ, ನಕ್ಷತ್ರ ಚಿಹ್ನೆಯಿರುವ ನೋಟುಗಳು ಚಲಾವಣೆಯಲ್ಲಿವೆ ಮತ್ತು ಕಾನೂನುಬದ್ಧವಾಗಿವೆ.',
      hi: 'भारतीय रिजर्व बैंक ने स्पष्ट किया है कि स्टार (*) निशान वाले बैंक नोट पूरी तरह असली और वैध हैं।'
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
