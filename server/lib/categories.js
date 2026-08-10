// Canonical report categories (cancer types) used for counselor triage + specialist routing.
// Keep in sync with client/src/lib/categories.js
const CATEGORIES = [
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

// A doctor's `specialties` field is a comma-separated list of the categories above.
const splitCategories = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

module.exports = { CATEGORIES, splitCategories };
