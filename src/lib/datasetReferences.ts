// Public, free-to-use datasets the SafeWatch detection layer is inspired by.
// We don't bundle the raw images (gigabytes), but we document them here so:
//   1. Researchers/teachers can see the academic basis.
//   2. Future fine-tuning can target these sources.
// The pretrained models we run in-browser (face-api TinyFaceDetector +
// FaceExpressionNet, COCO-SSD) were themselves trained on supersets of these.

export type DatasetRef = {
  name: string;
  domain: 'facial-expression' | 'audio-distress' | 'object' | 'fire' | 'fall';
  size: string;
  license: string;
  url: string;
  notes: string;
};

export const DATASET_REFERENCES: DatasetRef[] = [
  {
    name: 'FER-2013',
    domain: 'facial-expression',
    size: '35,887 images / 7 classes',
    license: 'Open (Kaggle)',
    url: 'https://www.kaggle.com/datasets/msambare/fer2013',
    notes: 'Backbone of FaceExpressionNet — sad / fear / anger map to distress.',
  },
  {
    name: 'AffectNet',
    domain: 'facial-expression',
    size: '~1M images / 8 classes + valence/arousal',
    license: 'Academic',
    url: 'http://mohammadmahoor.com/affectnet/',
    notes: 'Largest in-the-wild facial-expression dataset; for future fine-tuning.',
  },
  {
    name: 'RAF-DB',
    domain: 'facial-expression',
    size: '29,672 images, real-world, compound expressions',
    license: 'Academic',
    url: 'http://www.whdeng.cn/RAF/model1.html',
    notes: 'Improves robustness to lighting/pose for crying/shouting faces.',
  },
  {
    name: 'RAVDESS',
    domain: 'audio-distress',
    size: '7,356 vocal recordings (24 actors, 8 emotions)',
    license: 'CC BY-NC-SA 4.0',
    url: 'https://zenodo.org/record/1188976',
    notes: 'Ground truth for screaming, crying, fearful and angry speech.',
  },
  {
    name: 'CREMA-D',
    domain: 'audio-distress',
    size: '7,442 clips, 91 actors',
    license: 'Open Database License',
    url: 'https://github.com/CheyneyComputerScience/CREMA-D',
    notes: 'Diverse demographic emotional speech — improves shouting detection.',
  },
  {
    name: 'AudioSet (Google)',
    domain: 'audio-distress',
    size: '2M+ 10s YouTube clips, 632 classes (incl. screaming, crying, glass break)',
    license: 'CC BY 4.0',
    url: 'https://research.google.com/audioset/',
    notes: 'Source for non-speech distress sounds (bangs, screams, crying).',
  },
  {
    name: 'COCO',
    domain: 'object',
    size: '330K images / 80 classes',
    license: 'CC BY 4.0',
    url: 'https://cocodataset.org/',
    notes: 'COCO-SSD model running in-browser is trained on this set.',
  },
  {
    name: 'FireNet / D-Fire',
    domain: 'fire',
    size: '21K+ labeled images of fire & smoke',
    license: 'Open (research)',
    url: 'https://github.com/gaiasd/DFireDataset',
    notes: 'Reference for fire false-alarm filtering benchmarks.',
  },
  {
    name: 'UR Fall Detection',
    domain: 'fall',
    size: '70 sequences (RGB + depth)',
    license: 'Academic',
    url: 'http://fenix.univ.rzeszow.pl/~mkepski/ds/uf.html',
    notes: 'Used to validate trip / fall detection logic.',
  },
];