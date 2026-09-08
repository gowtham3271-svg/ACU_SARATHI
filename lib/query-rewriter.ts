/**
 * Query Preprocessor & Bilingual Normalizer for SARATHI
 * Handles:
 * - Language detection (English, Kannada script, transliterated Kannada / code-mixed)
 * - Indic-to-English institutional concept expansion
 * - Query cleaning and normalization
 */

export type DetectedLanguage = "en" | "kn";

export interface ProcessedQuery {
  original: string;
  normalized: string;
  searchQuery: string;
  detectedLanguage: DetectedLanguage;
  isCodeMixed: boolean;
}

// Common institutional term translations (Kannada script & Transliterated to canonical search keywords)
const INDIC_CONCEPT_MAP: Record<string, string> = {
  // Kannada Script mappings
  "ಹಾಸ್ಟೆಲ್": "hostel accommodation",
  "ವಸತಿ": "hostel accommodation residence rooms",
  "ಊಟ": "food mess dining cafeteria",
  "ಮೆಸ್": "mess dining food",
  "ಶುಲ್ಕ": "fee fees payment cost",
  "ಫೀಸ್": "fees fee payment",
  "ಫೀಜು": "fees fee payment",
  "ಪ್ರವೇಶ": "admission admission procedure entry",
  "ದಾಖಲಾತಿ": "admission application documents",
  "ಅಡ್ಮಿಷನ್": "admission",
  "ಅರ್ಹತೆ": "eligibility criteria qualification requirements",
  "ದಾಖಲೆಗಳು": "documents required certificates",
  "ಕೋರ್ಸ್": "courses programs degrees",
  "ಕೋರ್ಸ್‌ಗಳು": "courses programs degrees",
  "ಕಾಲೇಜು": "college constituent institutions",
  "ಕಾಲೇಜುಗಳು": "colleges constituent institutions",
  "ಇಂಜಿನಿಯರಿಂಗ್": "engineering technology BGSIT",
  "ವೈದ್ಯಕೀಯ": "medical MBBS AIMS doctor",
  "ಆಸ್ಪತ್ರೆ": "hospital AHRC clinical 1000 bed",
  "ಫಾರ್ಮಸಿ": "pharmacy SACP BPharm PharmD",
  "ನರ್ಸಿಂಗ್": "nursing ACN BSc Nursing",
  "ಅಲೈಡ್": "allied health sciences ASAHS physiotherapy BPT BMLS",
  "ಕುಲಪತಿ": "chancellor swamiji leadership",
  "ಉಪಕುಲಪತಿ": "vice chancellor vc leadership",
  "ಕುಲಸಚಿವರು": "registrar leadership",
  "ಸ್ಥಳ": "location address campus BG Nagara Mandya",
  "ಎಲ್ಲಿದೆ": "location address route reach map",
  "ಸಂಪರ್ಕ": "contact helpline phone email admission office",
  "ಗ್ರಂಥಾಲಯ": "central digital library books",
  "ಸಾರಿಗೆ": "transport bus connectivity",

  // Kannada Transliteration / Code-Mixed Latin mappings
  "hostel": "hostel accommodation",
  "fees": "fees fee structure payment",
  "eshtu": "how much fee fees",
  "yavudhu": "which programs courses",
  "yavudu": "which programs courses",
  "yava": "which programs courses",
  "hege": "how procedure process",
  "hegide": "how procedure process",
  "hegidhe": "how procedure process",
  "beku": "required documents eligibility",
  "dhaakhalathi": "documents admission",
  "pravesha": "admission process",
  "yaaru": "who leadership chancellor vice chancellor",
  "yaru": "who leadership chancellor vice chancellor",
  "yelli": "where location address",
  "bagge": "about details",
  "thilisi": "explain details",
  "tilisi": "explain details",
  "heli": "tell explain details",
  "ideya": "available facilities",
};

export function isKannadaScript(text: string): boolean {
  return /[\u0C80-\u0CFF]/.test(text);
}

export function isCodeMixedKannada(text: string): boolean {
  return /\b(yaaru|yaru|yavudhu|yavudu|yava|eshtu|hege|hegidhe|heg\s*ide|bagge|thilisi|tilisi|heli|kodi|beku|namaskara|kannada|kannadadalli|maadabeku|maadi|idhe|ide|yavagalu|collegegalu|coursagalu|vidyarthi|dhaakhalathi|pravesha|yelli|enu|enide)\b/i.test(
    text
  );
}

export function processUserQuery(
  rawQuery: string,
  preferredLanguage?: "auto" | "en" | "kn"
): ProcessedQuery {
  const original = rawQuery.trim();
  const lower = original.toLowerCase();

  const hasScript = isKannadaScript(original);
  const hasTranslit = isCodeMixedKannada(lower);

  let detectedLanguage: DetectedLanguage = "en";
  if (preferredLanguage === "kn") {
    detectedLanguage = "kn";
  } else if (preferredLanguage === "en") {
    detectedLanguage = "en";
  } else if (hasScript || hasTranslit) {
    detectedLanguage = "kn";
  }

  // Extract expansion concepts
  const expansions: string[] = [];
  for (const [key, expansion] of Object.entries(INDIC_CONCEPT_MAP)) {
    if (original.includes(key) || lower.includes(key)) {
      expansions.push(expansion);
    }
  }

  // Construct search query
  const combinedSearch = expansions.length > 0
    ? `${original} ${expansions.join(" ")}`.trim()
    : original;

  return {
    original,
    normalized: lower,
    searchQuery: combinedSearch,
    detectedLanguage,
    isCodeMixed: hasTranslit && !hasScript,
  };
}
