import { MaterialPreset } from '../types';

export const MATERIAL_PRESETS: MaterialPreset[] = [
  {
    id: 'rubber',
    nameEn: 'Rubber',
    nameBn: 'রবার',
    poissonRatio: 0.49,
    youngsModulus: 0.05e9, // 0.05 GPa (50 MPa)
    density: 1100, // kg/m3
    color: '#334155', // Slate dark
    secondaryColor: '#1e293b',
    specularColor: '#64748b',
    descriptionEn: 'Nearly incompressible polymer (σ ≈ 0.5). Stretches easily; dramatic necking and lateral contraction.',
    descriptionBn: 'প্রায় অসংকোচনীয় পলিমার (σ ≈ ০.৫)। সহজে প্রসারিত হয় এবং স্পষ্ট পার্শ্বীয় সংকোচন (necking) দেখায়।'
  },
  {
    id: 'steel',
    nameEn: 'Structural Steel',
    nameBn: 'কাঠামোগত ইস্পাত',
    poissonRatio: 0.28,
    youngsModulus: 200e9, // 200 GPa
    density: 7850,
    color: '#94a3b8', // Metallic silver
    secondaryColor: '#64748b',
    specularColor: '#f8fafc',
    descriptionEn: 'Classic structural isotropic metal (σ ≈ 0.28). Extremely stiff; high stored energy per unit strain.',
    descriptionBn: 'চিরচেনা স্থিতিস্থাপক ধাতু (σ ≈ ০.২৮)। অত্যন্ত দৃঢ়; সামান্য দৈর্ঘ্য বৃদ্ধিতেই প্রচুর বিভব শক্তি সঞ্চয় করে।'
  },
  {
    id: 'cork',
    nameEn: 'Cork',
    nameBn: 'কর্ক',
    poissonRatio: 0.0,
    youngsModulus: 0.03e9, // 30 MPa
    density: 240,
    color: '#d97706', // Warm cork amber-brown
    secondaryColor: '#b45309',
    specularColor: '#fef3c7',
    descriptionEn: 'Zero Poisson\'s ratio (σ ≈ 0). Stretches or compresses with negligible diameter change. Used for bottle stoppers.',
    descriptionBn: 'শূন্য পয়সনের অনুপাত (σ ≈ ০)। টান বা চাপে ব্যাস অপরিবর্তিত থাকে; ফলে বোতলের ছিপি হিসেবে উপযুক্ত।'
  },
  {
    id: 'auxetic',
    nameEn: 'Auxetic Metamaterial',
    nameBn: 'অক্সেটিক মেটাম্যাটেরিয়াল',
    poissonRatio: -0.5,
    youngsModulus: 0.02e9, // 20 MPa
    density: 350,
    color: '#0891b2', // Cyan teal
    secondaryColor: '#0e7490',
    specularColor: '#67e8f9',
    isAuxetic: true,
    descriptionEn: 'Negative Poisson\'s ratio (σ < 0). Expands laterally when pulled and contracts when pushed! Re-entrant honeycomb structure.',
    descriptionBn: 'ঋণাত্মক পয়সনের অনুপাত (σ < ০)। টেনে লম্বা করলে পার্শ্বীয়ভাবেও প্রসারিত হয়! বিশেষ পুনর্বিন্যাসযোগ্য কোষ কাঠামো।'
  },
  {
    id: 'aluminum',
    nameEn: 'Aluminum Alloy',
    nameBn: 'অ্যালুমিনিয়াম সংকর',
    poissonRatio: 0.33,
    youngsModulus: 70e9, // 70 GPa
    density: 2700,
    color: '#cbd5e1', // Light aluminum
    secondaryColor: '#94a3b8',
    specularColor: '#ffffff',
    descriptionEn: 'Lightweight engineering alloy (σ ≈ 0.33). Common in aerospace; predictable linear elastic behavior.',
    descriptionBn: 'হালকা কিন্তু মজবুত ধাতু (σ ≈ ০.৩৩)। বিমান ও প্রকৌশলে বহুল ব্যবহৃত আদর্শ স্থিতিস্থাপক মাধ্যম।'
  },
  {
    id: 'custom',
    nameEn: 'Custom Specimen',
    nameBn: 'কাস্টম নমুনা',
    poissonRatio: 0.30,
    youngsModulus: 1.0e9, // 1 GPa
    density: 2000,
    color: '#4f46e5', // Indigo
    secondaryColor: '#3730a3',
    specularColor: '#c7d2fe',
    descriptionEn: 'Customizable material parameters to explore any theoretical boundary from σ = -0.8 to +0.5.',
    descriptionBn: 'শিক্ষার্থীদের জন্য মুক্ত গবেষণার নমুনা; ইচ্ছামতো পয়সনের অনুপাত ও ইয়ং গুণাঙ্ক পরিবর্তন করুন।'
  }
];
