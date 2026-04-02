/**
 * Simple rule-based transliteration for Indian names.
 * Converts Latin script names to Devanagari (Hindi/Marathi/Sanskrit/Nepali),
 * Bengali, Gujarati, Punjabi, Tamil, Telugu, Kannada, Malayalam, Odia scripts.
 *
 * This avoids the NMT model which adds garbage words to proper nouns.
 */

// Devanagari (Hindi, Marathi, Sanskrit, Nepali)
const DEVA_MAP: Record<string, string> = {
  // Vowels
  a: 'अ', aa: 'आ', i: 'इ', ee: 'ई', u: 'उ', oo: 'ऊ',
  e: 'ए', ai: 'ऐ', o: 'ओ', au: 'औ',
  // Consonants
  ka: 'क', kha: 'ख', ga: 'ग', gha: 'घ', nga: 'ङ',
  cha: 'च', chha: 'छ', ja: 'ज', jha: 'झ', nya: 'ञ',
  ta: 'ट', tha: 'ठ', da: 'ड', dha: 'ढ', na: 'ण',
  tha2: 'त', dha2: 'ध', pa: 'प', pha: 'फ', ba: 'ब',
  bha: 'भ', ma: 'म', ya: 'य', ra: 'र', la: 'ल',
  va: 'व', wa: 'व', sha: 'श', sa: 'स', ha: 'ह',
  // Common name syllables
  sh: 'श', ri: 'री', ra: 'रा', ji: 'जी', vi: 'वि',
  ni: 'नि', ti: 'ती', di: 'दी', mi: 'मी', ki: 'की',
  an: 'अन', in: 'इन', un: 'उन', en: 'एन',
};

// Well-known Indian name mappings (covers most common names)
const HINDI_NAMES: Record<string, string> = {
  // Common first names
  rajesh: 'राजेश', suresh: 'सुरेश', mahesh: 'महेश', ramesh: 'रमेश',
  priya: 'प्रिया', anita: 'अनिता', sunita: 'सुनिता', kavita: 'कविता',
  amit: 'अमित', sumit: 'सुमित', rohit: 'रोहित', mohit: 'मोहित',
  anil: 'अनिल', sunil: 'सुनिल', vijay: 'विजय', sanjay: 'संजय',
  ravi: 'रवि', deepak: 'दीपक', ashok: 'अशोक', vinod: 'विनोद',
  neha: 'नेहा', pooja: 'पूजा', sneha: 'स्नेहा', meera: 'मीरा',
  rahul: 'राहुल', nikhil: 'निखिल', sachin: 'सचिन', arvind: 'अरविंद',
  narendra: 'नरेंद्र', devendra: 'देवेंद्र', manish: 'मनीष',
  prakash: 'प्रकाश', dinesh: 'दिनेश', ganesh: 'गणेश',
  nandini: 'नंदिनी', lakshmi: 'लक्ष्मी', sarita: 'सरिता',
  kiran: 'किरण', rekha: 'रेखा', geeta: 'गीता', sita: 'सीता',
  // Common last names
  sharma: 'शर्मा', verma: 'वर्मा', gupta: 'गुप्ता', singh: 'सिंह',
  patel: 'पटेल', kumar: 'कुमार', joshi: 'जोशी', mishra: 'मिश्रा',
  pandey: 'पांडेय', tiwari: 'तिवारी', dubey: 'दुबे', yadav: 'यादव',
  chauhan: 'चौहान', rajput: 'राजपूत', thakur: 'ठाकुर', reddy: 'रेड्डी',
  nair: 'नायर', iyer: 'अय्यर', rao: 'राव', deshmukh: 'देशमुख',
  patil: 'पाटिल', jain: 'जैन', agarwal: 'अग्रवाल', bansal: 'बंसल',
  mehta: 'मेहता', shah: 'शाह', bhat: 'भट्ट', kulkarni: 'कुलकर्णी',
  deshpande: 'देशपांडे', shinde: 'शिंदे', jadhav: 'जाधव',
  pawar: 'पवार', more: 'मोरे', chavan: 'चव्हाण',
  khan: 'खान', malik: 'मलिक', ansari: 'अंसारी',
};

const MARATHI_NAMES: Record<string, string> = {
  ...HINDI_NAMES,
  // Marathi-specific overrides
  priya: 'प्रिया', rajesh: 'राजेश', sharma: 'शर्मा',
  patil: 'पाटील', deshmukh: 'देशमुख', kulkarni: 'कुलकर्णी',
  deshpande: 'देशपांडे', shinde: 'शिंदे', jadhav: 'जाधव',
  pawar: 'पवार', more: 'मोरे', chavan: 'चव्हाण',
};

// Common governance/political terms Hindi translations
const TITLE_TERMS_HI: Record<string, string> = {
  'ward councillor': 'वार्ड पार्षद',
  'mayor': 'महापौर',
  'district collector': 'जिला कलेक्टर',
  'mla': 'विधायक',
  'mp': 'सांसद',
  'chief minister': 'मुख्यमंत्री',
  'prime minister': 'प्रधानमंत्री',
  'ministry': 'मंत्रालय',
  'minister': 'मंत्री',
  'government': 'सरकार',
  'govt.': 'सरकार',
  'govt': 'सरकार',
  'constituency': 'निर्वाचन क्षेत्र',
  'ward': 'वार्ड',
  'appointed': 'नियुक्त',
  'elected': 'निर्वाचित',
  'terminal escalation': 'अंतिम वृद्धि',
  'public record': 'सार्वजनिक रिकॉर्ड',
  'water supply': 'जल आपूर्ति',
  'sanitation': 'स्वच्छता',
  'of india': 'भारत की',
  'of maharashtra': 'महाराष्ट्र की',
  'mumbai': 'मुंबई',
  'mumbai suburban': 'मुंबई उपनगरीय',
  'min.': 'मंत्री',
};

const TITLE_TERMS_MR: Record<string, string> = {
  'ward councillor': 'नगरसेवक',
  'mayor': 'महापौर',
  'district collector': 'जिल्हाधिकारी',
  'mla': 'आमदार',
  'mp': 'खासदार',
  'chief minister': 'मुख्यमंत्री',
  'prime minister': 'पंतप्रधान',
  'ministry': 'मंत्रालय',
  'minister': 'मंत्री',
  'government': 'शासन',
  'govt.': 'शासन',
  'govt': 'शासन',
  'constituency': 'मतदारसंघ',
  'ward': 'प्रभाग',
  'appointed': 'नियुक्त',
  'elected': 'निर्वाचित',
  'water supply': 'पाणीपुरवठा',
  'sanitation': 'स्वच्छता',
  'of india': 'भारताचे',
  'of maharashtra': 'महाराष्ट्राचे',
  'mumbai': 'मुंबई',
  'mumbai suburban': 'मुंबई उपनगर',
};

/**
 * Translate a governance title by replacing known terms.
 * E.g., "Ward Councillor · BJP · Ward 45" → "वार्ड पार्षद · BJP · वार्ड 45"
 */
export function translateTitle(title: string, targetLang: string): string {
  if (targetLang === 'en' || !title) return title;

  const dict = targetLang === 'mr' ? TITLE_TERMS_MR
    : ['hi', 'sa', 'ne'].includes(targetLang) ? TITLE_TERMS_HI
    : null;

  if (!dict) return title;

  let result = title;
  // Sort by length descending so longer phrases match first
  const entries = Object.entries(dict).sort((a, b) => b[0].length - a[0].length);
  for (const [eng, translated] of entries) {
    const regex = new RegExp(eng.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    result = result.replace(regex, translated);
  }
  return result;
}

/**
 * Transliterate a name to the target language script.
 * Uses dictionary lookup for known Indian names.
 * Falls back to the original name if not found.
 */
export function transliterateName(name: string, targetLang: string): string {
  if (targetLang === 'en') return name;

  // Only Devanagari-based languages supported for now
  const dict = targetLang === 'mr' ? MARATHI_NAMES : HINDI_NAMES;
  if (!['hi', 'mr', 'sa', 'ne', 'kok', 'doi', 'mai'].includes(targetLang)) {
    return name; // Return original for unsupported scripts
  }

  // Split name into parts and transliterate each
  return name
    .split(/\s+/)
    .map(part => {
      const lower = part.toLowerCase();
      if (dict[lower]) return dict[lower];
      // Keep original if not in dictionary
      return part;
    })
    .join(' ');
}
