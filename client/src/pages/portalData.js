// Demo data for the patient portal (front-end prototype).
export const CASES = [
  { id: 'DBL-2025-001', type: 'Breast Cancer', date: '10 May, 2025', status: 'In Review', tone: 'review', doctor: 'Dr. Priya Sharma', specialty: 'Medical Oncology', reports: 3, step: 1 },
  { id: 'DBL-2025-002', type: 'Lung Cancer', date: '05 May, 2025', status: 'Report Ready', tone: 'ready', doctor: 'Dr. Arjun Mehta', specialty: 'Radiation Oncology', reports: 4, step: 2 },
  { id: 'DBL-2025-003', type: 'Colorectal Cancer', date: '28 Apr, 2025', status: 'Completed', tone: 'done', doctor: 'Dr. Neha Rao', specialty: 'Surgical Oncology', reports: 5, step: 3 },
];

export const PROGRESS_STEPS = ['Report Uploaded', 'Under Review', 'Expert Opinion', 'Consultation'];

export const initials = (name = '') =>
  name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'U';
