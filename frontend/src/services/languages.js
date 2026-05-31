export const LANGUAGES = {
  urdu:       { label: 'Urdu',       flag: '🇵🇰', script: 'اردو',   desc: 'Nastaliq (Arabic script)' },
  english:    { label: 'English',    flag: '🇬🇧', script: 'Eng',    desc: 'Latin script' },
  roman_urdu: { label: 'Roman Urdu', flag: '🇵🇰', script: 'Rmn',   desc: 'Urdu in Latin alphabet' },
};

export const LANG_OPTIONS = Object.entries(LANGUAGES).map(([value, meta]) => ({
  value, ...meta,
}));

export const isUrduScript = text =>
  typeof text === 'string' && /[\u0600-\u06FF]/.test(text);

export const textStyle = text => isUrduScript(text)
  ? { fontFamily: "'Noto Nastaliq Urdu', serif", direction: 'rtl', lineHeight: 2.2 }
  : {};
