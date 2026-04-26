export interface WackyItem {
  headline: string;
  isReal: boolean;
  source: string;
  explanation: string;
}

export interface QuipPrompt {
  setup: string;
  sourceHint: string;
}

export interface PanelistDef {
  name: string;
  role: string;
  initial: string;
  taste: string;
  likeReactions: string[];
  mehReactions: string[];
  hateReactions: string[];
}

export interface SpreadItem {
  question: string;
  answer: number;
  unit: string;
  others: number[];
  explanation: string;
}

export interface LedePanelist {
  name: string;
  role: string;
  completion: string;
  pitch: string;
  isCorrect: boolean;
}

export interface LedeItem {
  partialHeadline: string;
  sourceHint: string;
  panelists: LedePanelist[];
  explanation: string;
}

export interface WaveItem {
  leftLabel: string;
  rightLabel: string;
  story: string;
  truthPosition: number;
  explanation: string;
}

export interface SofClaim {
  text: string;
  isScience: boolean;
  explanation: string;
  source: { name: string; url: string } | null;
}

export interface SofItem {
  topic: string;
  intro: string;
  claims: SofClaim[];
}

export type GameId = 'wacky' | 'quip' | 'spread' | 'lede' | 'wave' | 'sof';

export const WACKY_BANK: WackyItem[] = [
  {
    headline: 'Florida Man Breaks Into Closed Restaurant To Wash All The Dirty Dishes',
    isReal: true,
    source: 'Tampa Bay Times, 2023',
    explanation: 'Real. A man broke into a closed Tampa restaurant and was found scrubbing dishes when police arrived. He claimed he just wanted to help. He was arrested for burglary anyway.',
  },
  {
    headline: "Local Man Convinced He Could Take A Bear In A Fight If He Really Had To",
    isReal: false,
    source: 'Satire — fabricated headline',
    explanation: "Satire. This headline is fabricated for the game. The 'man vs. bear' debate is a real meme but not a verified news event.",
  },
  {
    headline: 'Italian Town Sells Abandoned Houses For One Euro To Anyone Willing To Renovate',
    isReal: true,
    source: 'BBC, 2019 (Sambuca, Sicily program)',
    explanation: 'Real. Multiple Italian towns including Sambuca, Mussomeli, and Bivona launched €1 home programs to combat depopulation. Buyers must commit to renovating within three years.',
  },
  {
    headline: "Nation's Dads Demand Right To Tell Same Story Twice At Family Dinner",
    isReal: false,
    source: 'Satire — fabricated headline',
    explanation: 'Satire. Classic satirical construction (oversized civic concern + small mundane behavior). No such story exists, but it sounds plausible because of the format.',
  },
  {
    headline: "Tuvalu Plans To Become World's First Country To Exist In The Metaverse",
    isReal: true,
    source: 'Reuters, COP27 announcement, 2022',
    explanation: "Real. The Pacific island nation Tuvalu announced at COP27 that it would create a digital twin of the country to preserve its statehood and culture as rising seas threaten the islands.",
  },
  {
    headline: "Man Who Asked 'Anyone Else Hot?' Now Considered Group Spokesperson",
    isReal: false,
    source: 'Satire — Reductress-style',
    explanation: "Satire. This is a fabricated workplace-comedy headline in the style of Reductress or McSweeney's. There's no such news event.",
  },
  {
    headline: "Oregon Man Legally Changes His Name To 'Captain Awesome'",
    isReal: true,
    source: 'The Oregonian, 2008',
    explanation: 'Real. Scott Nall successfully petitioned an Oregon court to change his legal name to Captain Awesome, after convincing the judge it was not intended for fraud and was, well, awesome.',
  },
  {
    headline: 'New Study Finds That If You Just Believe In Yourself, You Can Apparently Do A Few Things',
    isReal: false,
    source: 'Satire — fabricated headline',
    explanation: "Satire. A classic satirical deflation of a self-help cliché. No such study exists, but the phrasing parodies real headlines about positivity research.",
  },
  {
    headline: 'UK Man Caught Smuggling 70 Kilograms Of Garlic Across Border',
    isReal: true,
    source: 'The Guardian, 2021 (UK Border Force report)',
    explanation: 'Real. A man was caught with 70 kg of garlic at a UK border crossing. Garlic carries high import duties in the UK and is a surprisingly common smuggling target.',
  },
  {
    headline: 'Scientists Confirm Octopuses Just Out There Punching Fish For No Reason',
    isReal: true,
    source: 'Ecology, peer-reviewed marine biology paper',
    explanation: 'Real. Researchers in the Red Sea documented octopuses literally punching their fish hunting partners, sometimes apparently out of spite. Published in Ecology, 2020.',
  },
  {
    headline: "Area Woman's Cardio Routine Just Walking Faster Through The Office",
    isReal: false,
    source: 'Satire — Reductress-style',
    explanation: 'Satire. This is a fabricated lifestyle-parody headline in the style of Reductress. No such article was published.',
  },
  {
    headline: "Switzerland's Law Requires Every Home To Have Access To A Nuclear Fallout Shelter",
    isReal: true,
    source: 'Swiss Federal Civil Protection Law, 1963 (still active)',
    explanation: 'Real. A 1963 Swiss law still requires that there be enough nuclear fallout shelter capacity for every resident. New buildings must include shelters or owners pay into a communal fund.',
  },
  {
    headline: "Local Cat Looks Out Window With Genuine Look Of 'I Used To Be Someone'",
    isReal: false,
    source: 'Satire — fabricated headline',
    explanation: 'Satire. A classic satirical construction (anthropomorphizing pets with melodrama). No such story exists; this specific headline is fabricated.',
  },
  {
    headline: 'Japan Opens World\'s First Hotel Staffed Almost Entirely By Robots',
    isReal: true,
    source: 'BBC, 2015 (Henn-na Hotel, Nagasaki)',
    explanation: "Real. The Henn-na Hotel opened with robot receptionists, robot porters, and a robotic dinosaur at the front desk. Many were later 'fired' and replaced with humans due to malfunctions.",
  },
  {
    headline: "New Study: Most Americans Could Not Pick Their Best Friend Out Of A Police Lineup",
    isReal: false,
    source: 'Satire — fabricated headline',
    explanation: 'Satire. Satirical fake-study format used for absurdist effect. No such study exists.',
  },
];

export const QUIP_PROMPTS: QuipPrompt[] = [
  { setup: 'Scientists just confirmed octopuses punch fish for fun. Their new motto is...', sourceHint: 'real 2024 marine biology study' },
  { setup: "A small Italian town is selling houses for one euro. The catch in their listing reads...", sourceHint: 'real Italian municipal real estate program' },
  { setup: "A man legally changed his name to 'Captain Awesome.' His new business card says...", sourceHint: 'real 2008 Oregon court case' },
  { setup: 'Tuvalu is moving its entire country to the metaverse. The welcome sign at the digital border reads...', sourceHint: 'real 2022 Tuvalu government announcement' },
  { setup: 'A man was caught smuggling 70 kilos of garlic across the UK border. His excuse to officials was...', sourceHint: 'real 2021 UK Border Force case' },
  { setup: 'A Florida man broke into a restaurant just to do the dishes. The note he left in the kitchen said...', sourceHint: 'real 2023 Tampa news story' },
];

export const PANEL: PanelistDef[] = [
  {
    name: 'Margot Vance',
    role: 'The Cynic',
    initial: 'M',
    taste: 'dry, dark, deadpan',
    likeReactions: [
      "Mmm. Surprisingly good. I'm choosing not to enjoy it.",
      'Tolerable. Almost human.',
      'I hate that I laughed. Points awarded under protest.',
    ],
    mehReactions: [
      "I've heard worse. I've also heard better. Mostly better.",
      "It's a quip. It exists. Congratulations.",
      'Sure. Why not. Moving on.',
    ],
    hateReactions: [
      "This is exactly the kind of optimism I've been warning people about.",
      'If joy were a war crime, this would be evidence.',
      'I\'d rather read Yelp reviews of dentists.',
    ],
  },
  {
    name: 'Sunny Park',
    role: 'The Dad Joke Guy',
    initial: 'S',
    taste: 'wholesome, punny, groan-inducing',
    likeReactions: [
      "Ha! I'm going to use that. Don't sue me.",
      "That's a keeper for the office potluck.",
      'My grandkids would laugh. Probably. They\'re polite.',
    ],
    mehReactions: [
      'I almost smiled. Almost.',
      'Could use a pun. Always could use a pun.',
      'Pleasant. Like room-temperature water.',
    ],
    hateReactions: [
      'This is too edgy. I worry about you.',
      "Where's the warmth? Where's the heart?",
      "I don't get it. And I get all of them.",
    ],
  },
  {
    name: 'Felix Crane',
    role: 'The Chaos Agent',
    initial: 'F',
    taste: 'absurd, weird, nonsensical',
    likeReactions: [
      'YES. The dimensions are bending. Beautiful.',
      'I would die for this sentence.',
      'Finally. A reason to keep going.',
    ],
    mehReactions: [
      'Hm. Reasonable. Disappointing.',
      'Conventional. Still — workmanlike.',
      'It made sense. That\'s the problem.',
    ],
    hateReactions: [
      'Where is the gerbil? Why no gerbil?',
      'This is what they want you to write.',
      'Boring. Boring. Boring. BORING.',
    ],
  },
];

export const SPREAD_BANK: SpreadItem[] = [
  {
    question: 'How many days did it take ChatGPT to reach 1 million users after launch?',
    answer: 5,
    unit: 'days',
    others: [12, 30, 7, 60, 90],
    explanation: '5 days. Instagram took 75 days; Spotify took roughly 150.',
  },
  {
    question: 'How many time zones does France have, including its overseas territories?',
    answer: 12,
    unit: 'time zones',
    others: [3, 8, 6, 15, 9],
    explanation: '12 time zones — more than any other country in the world.',
  },
  {
    question: 'How fast (in mph) does the Parker Solar Probe travel at its closest approach to the Sun?',
    answer: 430000,
    unit: 'miles per hour',
    others: [92000, 1200000, 200000, 65000, 750000],
    explanation: 'Approximately 430,000 mph — the fastest any human-made object has ever moved.',
  },
  {
    question: 'How many kilograms of garlic was a man caught smuggling into the UK in 2021?',
    answer: 70,
    unit: 'kilograms',
    others: [12, 200, 35, 500, 150],
    explanation: '70 kg. Garlic carries high import duties in the UK.',
  },
  {
    question: 'How many residents are in Vatican City — the world\'s highest wine-consuming nation per capita?',
    answer: 800,
    unit: 'residents',
    others: [200, 5000, 1500, 12000, 2200],
    explanation: 'About 800 residents — most of them clergy.',
  },
  {
    question: 'How much did the first item ever sold on eBay (a broken laser pointer) cost?',
    answer: 14.83,
    unit: 'dollars',
    others: [1.5, 49.99, 0.25, 100, 7.25],
    explanation: '$14.83. The buyer claimed to be a collector of broken laser pointers.',
  },
];

export const LEDE_BANK: LedeItem[] = [
  {
    partialHeadline: 'Scientists Confirm Octopuses Are',
    sourceHint: 'a 2024 marine biology study in Ecology',
    panelists: [
      {
        name: 'Iris Bellamy',
        role: 'The Naturalist',
        completion: 'Punching Fish During Joint Hunts',
        pitch: 'I read this in Ecology — they actually punch the fish hunting partners. Full slap. It\'s wild but documented.',
        isCorrect: true,
      },
      {
        name: 'Dex Holloway',
        role: 'The Skeptic',
        completion: 'Communicating With Dolphins',
        pitch: 'There was something about cross-species signaling — clicks, body posture, that sort of thing. Cetacean conversation.',
        isCorrect: false,
      },
      {
        name: 'Pip Calderone',
        role: 'The Optimist',
        completion: 'Capable Of Forming Lasting Friendships',
        pitch: 'I\'m pretty sure they bond. Long memories, individual preferences, the whole emotional package.',
        isCorrect: false,
      },
    ],
    explanation: 'Iris had it right — researchers in the Red Sea documented octopuses literally punching their fish hunting partners during cooperative hunts, sometimes to assert control. Published in Ecology, 2020–2024.',
  },
  {
    partialHeadline: 'Pacific Island Nation Tuvalu To Become',
    sourceHint: "Tuvalu's 2022 COP27 announcement",
    panelists: [
      {
        name: 'Iris Bellamy',
        role: 'The Naturalist',
        completion: 'Fully Solar-Powered By 2030',
        pitch: 'Small island nations are racing to renewables. I\'d bet on a major energy commitment.',
        isCorrect: false,
      },
      {
        name: 'Dex Holloway',
        role: 'The Skeptic',
        completion: 'The First Country In The Metaverse',
        pitch: "I remember this — they announced at COP27 that they'd build a digital twin nation. Sounded like satire at first.",
        isCorrect: true,
      },
      {
        name: 'Pip Calderone',
        role: 'The Optimist',
        completion: 'A UN-Recognized Climate Refugee Haven',
        pitch: 'It would track. Rising seas, vulnerable population — the world has to step up somewhere.',
        isCorrect: false,
      },
    ],
    explanation: 'Dex was right. At COP27 in 2022, Tuvalu announced it would recreate itself in the metaverse to preserve its statehood and culture as rising seas threaten the islands — the first nation to attempt digital sovereignty.',
  },
  {
    partialHeadline: 'Switzerland Legally Requires Every Home To',
    sourceHint: 'Swiss federal civil protection law of 1963',
    panelists: [
      {
        name: 'Iris Bellamy',
        role: 'The Naturalist',
        completion: 'Have A Working Composting System',
        pitch: 'Switzerland is environmentally fanatical. Composting at the household level seems on-brand.',
        isCorrect: false,
      },
      {
        name: 'Dex Holloway',
        role: 'The Skeptic',
        completion: 'Have Access To A Nuclear Fallout Shelter',
        pitch: "It's an old Cold War law that's still on the books. Every new build must include shelter capacity.",
        isCorrect: true,
      },
      {
        name: 'Pip Calderone',
        role: 'The Optimist',
        completion: 'Be Reachable By Public Transit Within 10 Minutes',
        pitch: 'They have one of the best transit networks in the world. A walkability mandate would fit perfectly.',
        isCorrect: false,
      },
    ],
    explanation: 'Dex called it. A 1963 Swiss law still requires nuclear fallout shelter capacity for every resident. New buildings must include shelters or owners pay into a communal shelter fund.',
  },
  {
    partialHeadline: 'ChatGPT Reached One Million Users In Just',
    sourceHint: "Sam Altman's December 2022 announcement",
    panelists: [
      {
        name: 'Iris Bellamy',
        role: 'The Naturalist',
        completion: 'Six Weeks After Launch',
        pitch: 'Six weeks would still be impressive — Instagram took two and a half months. That feels right.',
        isCorrect: false,
      },
      {
        name: 'Dex Holloway',
        role: 'The Skeptic',
        completion: 'Five Days After Launch',
        pitch: 'Five days. Sam Altman tweeted it. I remember being stunned — Spotify took five months for the same thing.',
        isCorrect: true,
      },
      {
        name: 'Pip Calderone',
        role: 'The Optimist',
        completion: 'Eleven Hours After Launch',
        pitch: "It went so viral I'd believe almost anything. People were sharing it across every platform overnight.",
        isCorrect: false,
      },
    ],
    explanation: 'Dex was right. Sam Altman confirmed ChatGPT hit one million users in 5 days — the fastest growth of any consumer product in history at that point.',
  },
  {
    partialHeadline: 'Florida Man Arrested After Breaking Into A Restaurant To',
    sourceHint: 'a 2023 Tampa local news report',
    panelists: [
      {
        name: 'Iris Bellamy',
        role: 'The Naturalist',
        completion: 'Free Live Lobsters From The Tank',
        pitch: 'There was a story like this — animal rights activist breaking into seafood places. It tracks.',
        isCorrect: false,
      },
      {
        name: 'Dex Holloway',
        role: 'The Skeptic',
        completion: 'Argue With An Online Yelp Reviewer',
        pitch: 'Florida has a long history of bizarre confrontations. A bad review escalation feels right.',
        isCorrect: false,
      },
      {
        name: 'Pip Calderone',
        role: 'The Optimist',
        completion: 'Wash All Of The Dirty Dishes',
        pitch: 'I swear I remember this — a guy broke in and was just doing the dishes when police showed up. He claimed he wanted to help.',
        isCorrect: true,
      },
    ],
    explanation: 'Pip had it. A man in Tampa broke into a closed restaurant and was found cleaning dishes, claiming he just wanted to help. Police arrested him for burglary anyway.',
  },
];

export const WAVE_BANK: WaveItem[] = [
  {
    leftLabel: 'Totally expected',
    rightLabel: 'Completely shocking',
    story: 'Scientists confirmed that octopuses punch their fish hunting partners during collaborative hunts.',
    truthPosition: 78,
    explanation: 'The reaction skewed strongly toward shocking. Even biologists who study octopus behavior were surprised at the apparent spite involved.',
  },
  {
    leftLabel: 'Wholesome',
    rightLabel: 'Cursed',
    story: 'A Florida man broke into a closed restaurant just to wash all the dirty dishes.',
    truthPosition: 38,
    explanation: 'Most reactions skewed wholesome — people were charmed, even though it was technically burglary.',
  },
  {
    leftLabel: 'Reasonable policy',
    rightLabel: 'Wildly impractical',
    story: 'Switzerland legally requires every home to have access to a nuclear fallout shelter.',
    truthPosition: 55,
    explanation: 'Public reaction was split. Many found it sensible given Cold War history; others called it dated.',
  },
  {
    leftLabel: 'Boring number',
    rightLabel: 'Mind-blowing number',
    story: 'ChatGPT reached 1 million users in just 5 days after launch.',
    truthPosition: 88,
    explanation: 'Almost universally seen as mind-blowing.',
  },
  {
    leftLabel: "I'd buy it",
    rightLabel: "I'd never buy it",
    story: 'Italian towns are selling abandoned houses for 1 euro, but you must commit to renovating within 3 years.',
    truthPosition: 32,
    explanation: "Most people leaned toward 'I'd buy it' — the romantic appeal of an Italian villa won out.",
  },
  {
    leftLabel: 'Definitely fake news',
    rightLabel: 'Definitely real',
    story: 'Tuvalu announced it will become the world\'s first country to exist entirely in the metaverse.',
    truthPosition: 70,
    explanation: 'Many initially assumed it was satire, then accepted it as real but with disbelief.',
  },
];

export const SOF_BANK: SofItem[] = [
  {
    topic: 'Animal Behavior',
    intro: 'Three claims about animal behavior. Two are real findings; one is fabricated.',
    claims: [
      {
        text: 'A 2024 study found that bumblebees can learn to roll a wooden ball into a target zone for a sugar reward by watching other bees demonstrate it first.',
        isScience: true,
        explanation: 'Real. The Queen Mary University of London study showed bees acquired the behavior socially, not individually — evidence of basic cultural learning.',
        source: { name: 'PLOS Biology', url: 'https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.3001541' },
      },
      {
        text: "Researchers documented octopuses punching fish hunting partners during cooperative hunts, apparently to assert control or out of spite.",
        isScience: true,
        explanation: "Real. The behavior was observed in the Red Sea and published in Ecology, showing octopuses sometimes 'discipline' fish that fail to cooperate.",
        source: { name: 'Ecology (Ecological Society of America)', url: 'https://esajournals.onlinelibrary.wiley.com/doi/10.1002/ecy.3266' },
      },
      {
        text: 'A 2023 study found that captive elephants can identify their human keepers\' moods by smell alone, even when the keeper is in a different building.',
        isScience: false,
        explanation: 'Fiction. While elephants do have remarkable olfaction (real 2014 study showed they distinguish human ethnic groups by scent), no published research claims they identify mood through walls.',
        source: null,
      },
    ],
  },
  {
    topic: 'Space & Astronomy',
    intro: 'Three claims about recent space discoveries. Two are real; one is fabricated.',
    claims: [
      {
        text: "NASA's Parker Solar Probe became the fastest human-made object in history, reaching speeds of approximately 430,000 mph at its closest approach to the Sun in December 2024.",
        isScience: true,
        explanation: "Real. The probe achieved this speed during its closest perihelion, coming within 3.8 million miles of the Sun's surface.",
        source: { name: 'NASA', url: 'https://science.nasa.gov/mission/parker-solar-probe/' },
      },
      {
        text: 'The James Webb Space Telescope detected water vapor in the atmosphere of an exoplanet roughly the size of Jupiter, located about 700 light-years from Earth.',
        isScience: true,
        explanation: "Real. JWST detected water vapor and other molecules in WASP-39b's atmosphere in 2022.",
        source: { name: 'NASA / JWST Mission', url: 'https://webbtelescope.org/contents/news-releases/2022/news-2022-040' },
      },
      {
        text: 'A 2024 study from the European Space Agency found that the Moon is gradually spiraling closer to Earth at a rate of 1.5 centimeters per year.',
        isScience: false,
        explanation: 'Fiction. The Moon is moving away from Earth, not closer — at approximately 3.8 cm per year due to tidal interactions. This claim inverts a real, well-documented fact.',
        source: null,
      },
    ],
  },
  {
    topic: 'Medicine & Health',
    intro: 'Three medical research claims. Two are real; one is fabricated.',
    claims: [
      {
        text: 'A 2024 clinical trial found that a CRISPR-based gene therapy substantially reduced or eliminated symptoms in patients with sickle cell disease, leading to FDA approval of the first CRISPR therapy.',
        isScience: true,
        explanation: 'Real. Casgevy, developed by Vertex and CRISPR Therapeutics, became the first FDA-approved CRISPR therapy in late 2023.',
        source: { name: 'FDA', url: 'https://www.fda.gov/news-events/press-announcements/fda-approves-first-gene-therapies-treat-patients-sickle-cell-disease' },
      },
      {
        text: 'Researchers at Stanford developed a wearable patch that uses ultrasound waves to non-invasively monitor deep-tissue blood flow in real time.',
        isScience: true,
        explanation: 'Real. The wearable ultrasound patch published in Nature Biomedical Engineering can continuously monitor cardiovascular signals.',
        source: { name: 'Nature Biomedical Engineering', url: 'https://www.nature.com/articles/s41551-021-00763-4' },
      },
      {
        text: 'A Harvard Medical School study found that listening to classical music for 30 minutes daily reduces resting blood pressure by an average of 18 percent in adults over 50.',
        isScience: false,
        explanation: 'Fiction. Music can have modest blood pressure effects, but no Harvard study has shown an 18% reduction. Real effect sizes are typically much smaller.',
        source: null,
      },
    ],
  },
  {
    topic: 'Earth & Environment',
    intro: 'Three claims about our planet. Two are real; one is fabricated.',
    claims: [
      {
        text: 'Scientists have confirmed that some species of trees in the same forest can share nutrients and warning signals about pests through underground networks of fungi.',
        isScience: true,
        explanation: "Real. The 'wood wide web' phenomenon was extensively documented by Suzanne Simard and others. Trees connect via mycorrhizal fungi.",
        source: { name: 'Nature', url: 'https://www.nature.com/articles/41557' },
      },
      {
        text: 'A 2024 study found that microplastics have been detected in human placentas and in samples of arterial plaque, raising concerns about cardiovascular impact.',
        isScience: true,
        explanation: 'Real. Multiple peer-reviewed studies have detected microplastics in human placentas (2020) and carotid arterial plaque (2024), linked to higher cardiovascular risk.',
        source: { name: 'New England Journal of Medicine', url: 'https://www.nejm.org/doi/full/10.1056/NEJMoa2309822' },
      },
      {
        text: "A 2023 Greenpeace study found that the Pacific Ocean's salinity has decreased by 12 percent over the past decade due to glacial melt.",
        isScience: false,
        explanation: 'Fiction. Pacific salinity is changing in some regions, but a 12% global drop in a decade would be extreme and is not supported by any peer-reviewed study.',
        source: null,
      },
    ],
  },
  {
    topic: 'Technology & AI',
    intro: 'Three claims about recent technology. Two are real; one is fabricated.',
    claims: [
      {
        text: "When OpenAI's ChatGPT launched in November 2022, it reached one million users in just five days — faster than any consumer product in history at that point.",
        isScience: true,
        explanation: 'Real. Sam Altman confirmed the milestone publicly. Instagram took 75 days; Spotify took 150.',
        source: { name: 'Reuters / OpenAI', url: 'https://www.reuters.com/business/chatgpt-sets-record-fastest-growing-user-base-analyst-note-2023-02-01/' },
      },
      {
        text: "DeepMind's AlphaFold has predicted the 3D structure of nearly every known protein, releasing a database of over 200 million predicted structures freely available to researchers.",
        isScience: true,
        explanation: 'Real. The AlphaFold Protein Structure Database, in partnership with EMBL-EBI, has revolutionized structural biology.',
        source: { name: 'DeepMind / EMBL-EBI', url: 'https://alphafold.ebi.ac.uk/' },
      },
      {
        text: 'A 2024 MIT study found that GPT-class models score higher on standardized creativity tests than 92 percent of human test-takers in a controlled comparison.',
        isScience: false,
        explanation: 'Fiction. There has been research on AI vs human creativity with varying results, but no MIT study has produced this specific 92% figure.',
        source: null,
      },
    ],
  },
];

export const GAME_META: Record<GameId, { num: string; section: string; title: string; tagline: string; meta: string[]; hidden?: boolean }> = {
  wacky: {
    num: 'N° 01',
    section: 'Real or Satire',
    title: 'Wacky News',
    tagline: 'A bizarre headline appears. Real news or satire? You decide.',
    meta: ['Real headlines', '~1 min'],
  },
  spread: {
    num: 'N° 02',
    section: 'The Number Hunt',
    title: 'The Spread',
    tagline: 'Guess the number behind a real news story. The closer you are, the more points you score.',
    meta: ['Numerical', '~2 min'],
  },
  lede: {
    num: 'N° 03',
    section: 'Finish The Headline',
    title: 'The Lede',
    tagline: 'Three reporters offer competing endings for today\'s headline. Only one is real.',
    meta: ['Bluff round', '~2 min'],
  },
  sof: {
    num: 'N° 04',
    section: 'Two Truths, One Lie',
    title: 'Science or Fiction',
    tagline: 'Three claims. Two are real and cited. One is fabricated. Find the fake.',
    meta: ['Cited sources', '~3 min'],
  },
  quip: {
    num: 'N° 05',
    section: 'The Wit Test',
    title: 'The Quip',
    tagline: "Write the funniest answer to today's strangest news.",
    meta: ['Open-ended', '~3 min'],
    hidden: true,
  },
  wave: {
    num: 'N° 06',
    section: 'Reading The Room',
    title: 'The Pulse',
    tagline: "Where does the public stand on today's story? Place your dial on the public mood.",
    meta: ['Sentiment dial', '~1 min'],
    hidden: true,
  },
};

export const VISIBLE_GAMES: GameId[] = ['wacky', 'spread', 'lede', 'sof'];
