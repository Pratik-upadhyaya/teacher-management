// ── Districts & Municipalities (Gandaki Pradesh) ────────────────────────
// Extracted from app/register/page.tsx so the same bilingual district/
// municipality data can be reused anywhere else a teacher needs to pick a
// school location -- e.g. app/(portal)/transfer/page.tsx -- without a
// second copy drifting out of sync (same reasoning as lib/teacherLabels.ts).
export const DISTRICTS: Record<
  string,
  { en: string; np: string; municipalities: { en: string; np: string }[] }
> = {
  Kaski: {
    en: "Kaski",
    np: "कास्की",
    municipalities: [
      { en: "Pokhara Metropolitan City", np: "पोखरा महानगरपालिका" },
      { en: "Annapurna Rural Municipality", np: "अन्नपूर्ण गाउँपालिका" },
      { en: "Madi Rural Municipality", np: "माडी गाउँपालिका" },
      { en: "Machhapuchchhre Rural Municipality", np: "माछापुच्छ्रे गाउँपालिका" },
      { en: "Rupa Rural Municipality", np: "रूपा गाउँपालिका" },
    ],
  },
  Syangja: {
    en: "Syangja",
    np: "स्याङ्जा",
    municipalities: [
      { en: "Putalibazar Municipality", np: "पुतलीबजार नगरपालिका" },
      { en: "Galyang Municipality", np: "गल्याङ नगरपालिका" },
      { en: "Chapakot Municipality", np: "चापाकोट नगरपालिका" },
      { en: "Biruwa Municipality", np: "बिरुवा नगरपालिका" },
      { en: "Arjunchaupari Rural Municipality", np: "अर्जुनचौपारी गाउँपालिका" },
      { en: "Harinas Rural Municipality", np: "हरिनास गाउँपालिका" },
      { en: "Kaligandaki Rural Municipality", np: "कालीगण्डकी गाउँपालिका" },
      { en: "Phedikhola Rural Municipality", np: "फेदीखोला गाउँपालिका" },
      { en: "Waling Municipality", np: "वालिङ नगरपालिका" },
    ],
  },
  Tanahun: {
    en: "Tanahun",
    np: "तनहुँ",
    municipalities: [
      { en: "Byas Municipality", np: "व्यास नगरपालिका" },
      { en: "Bhimad Municipality", np: "भिमाद नगरपालिका" },
      { en: "Shuklagandaki Municipality", np: "शुक्लागण्डकी नगरपालिका" },
      { en: "Bandipur Rural Municipality", np: "बन्दीपुर गाउँपालिका" },
      { en: "Devghat Rural Municipality", np: "देवघाट गाउँपालिका" },
      { en: "Ghiring Rural Municipality", np: "घिरिङ गाउँपालिका" },
      { en: "Myagde Rural Municipality", np: "म्याग्दे गाउँपालिका" },
      { en: "Rhishing Rural Municipality", np: "ऋषिङ गाउँपालिका" },
      { en: "Anbukhaireni Rural Municipality", np: "आँबुखैरेनी गाउँपालिका" },
    ],
  },
  Baglung: {
    en: "Baglung",
    np: "बागलुङ",
    municipalities: [
      { en: "Baglung Municipality", np: "बागलुङ नगरपालिका" },
      { en: "Galkot Municipality", np: "गल्कोट नगरपालिका" },
      { en: "Dhorpatan Municipality", np: "ढोरपाटन नगरपालिका" },
      { en: "Bareng Rural Municipality", np: "बारेङ गाउँपालिका" },
      { en: "Badigad Rural Municipality", np: "बडिगाड गाउँपालिका" },
      { en: "Taman Rural Municipality", np: "तमान गाउँपालिका" },
      { en: "Nisikhola Rural Municipality", np: "निसीखोला गाउँपालिका" },
      { en: "Jaimini Municipality", np: "जैमिनी नगरपालिका" },
      { en: "Kanthekhola Rural Municipality", np: "काँठेखोला गाउँपालिका" },
    ],
  },
  Parbat: {
    en: "Parbat",
    np: "पर्वत",
    municipalities: [
      { en: "Kushma Municipality", np: "कुश्मा नगरपालिका" },
      { en: "Phalebas Municipality", np: "फलेबास नगरपालिका" },
      { en: "Modi Rural Municipality", np: "मोदी गाउँपालिका" },
      { en: "Mahashila Rural Municipality", np: "महाशिला गाउँपालिका" },
      { en: "Painyu Rural Municipality", np: "पैयूँ गाउँपालिका" },
      { en: "Bihadi Rural Municipality", np: "विहादी गाउँपालिका" },
      { en: "Jaljala Rural Municipality", np: "जलजला गाउँपालिका" },
    ],
  },
  Myagdi: {
    en: "Myagdi",
    np: "म्याग्दी",
    municipalities: [
      { en: "Beni Municipality", np: "बेनी नगरपालिका" },
      { en: "Mangala Rural Municipality", np: "मंगला गाउँपालिका" },
      { en: "Malika Rural Municipality", np: "मालिका गाउँपालिका" },
      { en: "Annapurna Rural Municipality", np: "अन्नपूर्ण गाउँपालिका" },
      { en: "Dhaulagiri Rural Municipality", np: "धौलागिरी गाउँपालिका" },
      { en: "Raghuganga Rural Municipality", np: "रघुगंगा गाउँपालिका" },
    ],
  },
  Mustang: {
    en: "Mustang",
    np: "मुस्ताङ",
    municipalities: [
      { en: "Mustang Rural Municipality", np: "मुस्ताङ गाउँपालिका" },
      { en: "Gharapjhong Rural Municipality", np: "घरपझोङ गाउँपालिका" },
      { en: "Lomanthang Rural Municipality", np: "लोमन्थाङ गाउँपालिका" },
      { en: "Thasang Rural Municipality", np: "थसाङ गाउँपालिका" },
      { en: "Waragung Muktikhsetra Rural Municipality", np: "वारागुङ मुक्तिक्षेत्र गाउँपालिका" },
    ],
  },
  Manang: {
    en: "Manang",
    np: "मनाङ",
    municipalities: [
      { en: "Chame Rural Municipality", np: "चामे गाउँपालिका" },
      { en: "Narpa Bhumi Rural Municipality", np: "नार्पा भूमि गाउँपालिका" },
      { en: "Narphu Rural Municipality", np: "नार्फु गाउँपालिका" },
      { en: "Manang Disyang Rural Municipality", np: "मनाङ डिसयाङ गाउँपालिका" },
    ],
  },
  Nawalpur: {
    en: "Nawalpur",
    np: "नवलपुर",
    municipalities: [
      { en: "Kawasoti Municipality", np: "कावासोती नगरपालिका" },
      { en: "Gaindakot Municipality", np: "गैंडाकोट नगरपालिका" },
      { en: "Madhyabindu Municipality", np: "मध्यविन्दु नगरपालिका" },
      { en: "Bulingtar Rural Municipality", np: "बुलिङटार गाउँपालिका" },
      { en: "Devchuli Municipality", np: "देवचुली नगरपालिका" },
      { en: "Hupsekot Municipality", np: "हुप्सेकोट नगरपालिका" },
      { en: "Binayi Tribeni Rural Municipality", np: "विनायी त्रिवेणी गाउँपालिका" },
      { en: "Baudimai Rural Municipality", np: "बौदीमाई गाउँपालिका" },
    ],
  },
  Gorkha: {
    en: "Gorkha",
    np: "गोरखा",
    municipalities: [
      { en: "Gorkha Municipality", np: "गोरखा नगरपालिका" },
      { en: "Palungtar Municipality", np: "पालुङटार नगरपालिका" },
      { en: "Sulikot Rural Municipality", np: "सुलीकोट गाउँपालिका" },
      { en: "Siranchok Rural Municipality", np: "सिरानचोक गाउँपालिका" },
      { en: "Arpak Dudhapokhara Rural Municipality", np: "अर्पक दूधपोखरी गाउँपालिका" },
      { en: "Bhimsenthapa Rural Municipality", np: "भिमसेनथापा गाउँपालिका" },
      { en: "Tsum Nubri Rural Municipality", np: "तसुम नुब्री गाउँपालिका" },
      { en: "Dharche Rural Municipality", np: "धार्चे गाउँपालिका" },
      { en: "Gandaki Rural Municipality", np: "गण्डकी गाउँपालिका" },
      { en: "Ajirkot Rural Municipality", np: "अजिरकोट गाउँपालिका" },
    ],
  },
  Lamjung: {
    en: "Lamjung",
    np: "लम्जुङ",
    municipalities: [
      { en: "Besisahar Municipality", np: "बेसीशहर नगरपालिका" },
      { en: "Madhya Nepal Municipality", np: "मध्यनेपाल नगरपालिका" },
      { en: "Rainas Municipality", np: "रायनास नगरपालिका" },
      { en: "Sundarbazar Municipality", np: "सुन्दरबजार नगरपालिका" },
      { en: "Dordi Rural Municipality", np: "दोर्दी गाउँपालिका" },
      { en: "Dudhpokhari Rural Municipality", np: "दूधपोखरी गाउँपालिका" },
      { en: "Kwholasothar Rural Municipality", np: "क्व्होलासोथर गाउँपालिका" },
      { en: "Marsyangdi Rural Municipality", np: "मर्स्याङ्दी गाउँपालिका" },
    ],
  },
};