// Canonical report categories (cancer types) for counselor triage + specialist routing.
// Keep in sync with server/lib/categories.js
export const CATEGORIES = [
  'Lung Cancer',
  'Breast Cancer',
  'Colorectal Cancer',
  'Prostate Cancer',
  'Blood Cancer (Leukemia/Lymphoma)',
  'Head & Neck Cancer',
  'Gynecologic Cancer',
  'GI / Liver / Pancreatic Cancer',
  'Brain & CNS Cancer',
  'Skin / Melanoma',
  'Bone & Sarcoma',
  'Other',
];

// Badge tone per category for the admin/doctor tables.
export const CATEGORY_TONE = {
  'Lung Cancer': 'blue',
  'Breast Cancer': 'rose',
  'Colorectal Cancer': 'amber',
  'Prostate Cancer': 'teal',
  'Blood Cancer (Leukemia/Lymphoma)': 'violet',
  'Head & Neck Cancer': 'blue',
  'Gynecologic Cancer': 'rose',
  'GI / Liver / Pancreatic Cancer': 'amber',
  'Brain & CNS Cancer': 'violet',
  'Skin / Melanoma': 'teal',
  'Bone & Sarcoma': 'gray',
  Other: 'gray',
};

export const splitCategories = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);
