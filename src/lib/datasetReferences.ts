// Public, free-to-use datasets the SafeWatch detection layer is inspired by.
// We don't bundle the raw images (gigabytes), but we document them here so:
//   1. Researchers/teachers can see the academic basis.
//   2. Future fine-tuning can target these sources.
// The pretrained models we run in-browser (face-api TinyFaceDetector +
// FaceExpressionNet, COCO-SSD) were themselves trained on supersets of these.

export type DatasetRef = {
  name: string;
  domain:
    | 'fire-hazard'
    | 'smoke'
    | 'visibility'
    | 'facial-expression'
    | 'context-awareness'
    | 'safety'
    | 'keywords';
  size: string;
  license: string;
  url: string;
  notes: string;
};

export const DATASET_REFERENCES: DatasetRef[] = [
  {
    name: 'D-Fire Dataset',
    domain: 'fire-hazard',
    size: '21,000+ labeled images of fire & smoke',
    license: 'Open (research)',
    url: 'https://github.com/gaiasd/DFireDataset',
    notes: 'Primary reference for fire vs. false-alarm (lighter, TV, poster) filtering.',
  },
  {
    name: 'FIRESENSE',
    domain: 'fire-hazard',
    size: 'Fire/smoke video sequences (indoor + outdoor)',
    license: 'Open (research)',
    url: 'https://zenodo.org/record/836749',
    notes: 'Flame flicker + temporal validation ground truth.',
  },
  {
    name: 'Smoke100k',
    domain: 'smoke',
    size: '100,000 synthetic + real smoke images',
    license: 'Academic',
    url: 'https://bigmms.github.io/cheng_gcce19_smoke100k/',
    notes: 'Trains the smoke-color / desaturation heuristic used in fireDetection.',
  },
  {
    name: 'RESIDE (Dehazing)',
    domain: 'visibility',
    size: '400k+ hazy / clear image pairs',
    license: 'Open (academic)',
    url: 'https://sites.google.com/view/reside-dehaze-datasets',
    notes: 'Benchmarks contrast / edge-density visibility scoring (0–100).',
  },
  {
    name: 'FER-2013',
    domain: 'facial-expression',
    size: '35,887 images / 7 emotion classes',
    license: 'Open (Kaggle)',
    url: 'https://www.kaggle.com/datasets/msambare/fer2013',
    notes: 'Backbone of FaceExpressionNet — sad / fear / anger map to distress.',
  },
  {
    name: 'AffectNet',
    domain: 'facial-expression',
    size: '~1M in-the-wild face images, 8 classes',
    license: 'Academic',
    url: 'http://mohammadmahoor.com/affectnet/',
    notes: 'Extended distress cues: crying, fear, pain grimace.',
  },
  {
    name: 'COCO',
    domain: 'context-awareness',
    size: '330K images / 80 everyday object classes',
    license: 'CC BY 4.0',
    url: 'https://cocodataset.org/',
    notes: 'Powers COCO-SSD context: person, tv, phone, kitchenware for activity inference.',
  },
  {
    name: 'ADE20K (Scene)',
    domain: 'context-awareness',
    size: '25K scene-parsed images / 150 categories',
    license: 'BSD-3',
    url: 'https://groups.csail.mit.edu/vision/datasets/ADE20K/',
    notes: 'Room / scene context (kitchen, bedroom) for context-aware alert weighting.',
  },
  {
    name: 'UR Fall Detection',
    domain: 'safety',
    size: '70 RGB + depth fall sequences',
    license: 'Academic',
    url: 'http://fenix.univ.rzeszow.pl/~mkepski/ds/uf.html',
    notes: 'Ground truth for trip / fall / impact safety events.',
  },
  {
    name: 'Le2i Fall Dataset',
    domain: 'safety',
    size: '191 videos across home scenarios',
    license: 'Academic',
    url: 'http://le2i.cnrs.fr/Fall-detection-Dataset',
    notes: 'Improves false-positive rejection for sitting vs. falling.',
  },
  {
    name: 'AudioSet — Distress Keywords',
    domain: 'keywords',
    size: '2M+ 10s clips, incl. scream / crying / glass break',
    license: 'CC BY 4.0',
    url: 'https://research.google.com/audioset/',
    notes: 'Non-speech distress audio keywords for the always-on wake-word layer.',
  },
  {
    name: 'Speech Commands v2',
    domain: 'keywords',
    size: '105,000 utterances / 35 short words',
    license: 'CC BY 4.0',
    url: 'https://www.tensorflow.org/datasets/catalog/speech_commands',
    notes: 'Reference for low-latency wake-phrase recognition ("help", "stop", "fire").',
  },
];

// Legacy export removed on purpose — old entries (RAF-DB, RAVDESS, CREMA-D)
// were dropped so training data now maps 1:1 to the seven detection focus
// areas: fire hazard, smoke, visibility, facial expression, context
// awareness, safety, and keywords.
