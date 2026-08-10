// Config-driven definitions for the standard CRUD admin sections (rendered by <AdminCrud/>).
import { rupees } from '../../api.js';

const countBy = (l, pred) => l.filter(pred).length;

const T = {
  report: { 'Pending Review': 'amber', Reviewed: 'green', Uploaded: 'blue', Archived: 'gray' },
  plan: { Active: 'blue', Completed: 'green', 'On Hold': 'amber', Cancelled: 'rose' },
  opinion: { 'Awaiting Review': 'amber', 'Under Review': 'blue', 'Opinion Ready': 'teal', Delivered: 'green' },
  priority: { Normal: 'gray', High: 'amber', Urgent: 'rose' },
  medication: { 'In Stock': 'green', 'Low Stock': 'amber', 'Out of Stock': 'rose' },
  invoice: { Paid: 'green', Pending: 'amber', Overdue: 'rose', Refunded: 'gray' },
  lab: { Ordered: 'gray', 'Sample Collected': 'blue', 'In Progress': 'amber', Completed: 'green' },
  user: { Active: 'green', Inactive: 'gray', Suspended: 'rose' },
  announcement: { Draft: 'gray', Published: 'green', Archived: 'amber' },
};

const REPORT_STATUSES = ['Pending Review', 'Reviewed', 'Uploaded', 'Archived'];
const REPORT_TYPES = ['CT Scan', 'PET CT', 'Histopathology', 'Blood Report', 'MRI', 'X-Ray', 'Ultrasound', 'Treatment Summary'];
const PLAN_STATUSES = ['Active', 'Completed', 'On Hold', 'Cancelled'];
const MODALITIES = ['Chemotherapy', 'Radiotherapy', 'Immunotherapy', 'Targeted', 'Surgery'];
const OPINION_STATUSES = ['Awaiting Review', 'Under Review', 'Opinion Ready', 'Delivered'];
const PRIORITIES = ['Normal', 'High', 'Urgent'];
const MED_STATUSES = ['In Stock', 'Low Stock', 'Out of Stock'];
const MED_CATEGORIES = ['Chemotherapy', 'Supportive', 'Analgesic', 'Antiemetic', 'Antibiotic', 'Other'];
const MED_FORMS = ['Tablet', 'Injection', 'Infusion', 'Capsule', 'Syrup'];
const INVOICE_STATUSES = ['Paid', 'Pending', 'Overdue', 'Refunded'];
const METHODS = ['Card', 'UPI', 'Cash', 'Bank Transfer', 'Insurance'];
const LAB_STATUSES = ['Ordered', 'Sample Collected', 'In Progress', 'Completed'];
const USER_STATUSES = ['Active', 'Inactive', 'Suspended'];
const ROLES = ['Super Admin', 'Admin', 'Doctor', 'Staff', 'Viewer'];
const AUDIENCES = ['All Staff', 'Doctors', 'Coordinators', 'Patients'];
const ANN_STATUSES = ['Draft', 'Published', 'Archived'];

// NOTE: `reports` is a bespoke section ([pages/admin/ReportsAdmin.jsx]) — the counselor triage +
// round-robin routing UI — so it is intentionally NOT defined here.
const MODULE_CONFIGS = {
  treatment: {
    title: 'Treatment Plans', subtitle: 'Active & past treatment protocols', noun: 'Treatment Plan', endpoint: '/treatment-plans',
    addLabel: 'Add Plan', searchPlaceholder: 'Search patient, diagnosis or regimen…', statuses: PLAN_STATUSES, pickers: ['patients', 'staff'],
    columns: [
      { key: 'patientName', label: 'Patient', sub: 'patientUhid' },
      { key: 'diagnosis', label: 'Diagnosis' }, { key: 'modality', label: 'Modality' }, { key: 'regimen', label: 'Regimen' },
      { key: 'cycles', label: 'Cycles', render: (r) => `${r.cyclesDone || 0}/${r.cyclesTotal || 0}` },
      { key: 'status', label: 'Status', badge: T.plan },
    ],
    fields: [
      { key: 'patientName', label: 'Patient *', type: 'patient', required: true, autofill: 'diagnosis' },
      { key: 'patientUhid', label: 'UHID', type: 'text', placeholder: 'Auto from patient' },
      { key: 'doctor', label: 'Doctor', type: 'doctor' },
      { key: 'diagnosis', label: 'Diagnosis', type: 'text' },
      { key: 'modality', label: 'Modality', type: 'select', options: MODALITIES },
      { key: 'regimen', label: 'Regimen', type: 'text', placeholder: 'e.g. FOLFOX' },
      { key: 'cyclesTotal', label: 'Total cycles', type: 'number' },
      { key: 'cyclesDone', label: 'Cycles done', type: 'number' },
      { key: 'startDate', label: 'Start date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: PLAN_STATUSES },
      { key: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
    defaults: { modality: 'Chemotherapy', status: 'Active' },
    stats: (l) => [
      { label: 'Active plans', value: countBy(l, (x) => x.status === 'Active'), tone: 'blue' },
      { label: 'Completed', value: countBy(l, (x) => x.status === 'Completed'), tone: 'green' },
      { label: 'On hold', value: countBy(l, (x) => x.status === 'On Hold'), tone: 'amber' },
      { label: 'Total', value: l.length },
    ],
  },

  'second-opinion': {
    title: 'Review & Second Opinion', subtitle: 'Second-opinion request queue', noun: 'Request', endpoint: '/second-opinions',
    addLabel: 'New Request', searchPlaceholder: 'Search patient, expert or cancer type…', statuses: OPINION_STATUSES, pickers: ['patients', 'staff'],
    columns: [
      { key: 'patientName', label: 'Patient', sub: 'patientUhid' },
      { key: 'cancerType', label: 'Cancer Type' }, { key: 'expert', label: 'Assigned Expert' },
      { key: 'priority', label: 'Priority', badge: T.priority },
      { key: 'submittedDate', label: 'Submitted' },
      { key: 'status', label: 'Status', badge: T.opinion },
    ],
    fields: [
      { key: 'patientName', label: 'Patient *', type: 'patient', required: true, autofill: 'cancerType' },
      { key: 'patientUhid', label: 'UHID', type: 'text', placeholder: 'Auto from patient' },
      { key: 'cancerType', label: 'Cancer type', type: 'text' },
      { key: 'expert', label: 'Assigned expert', type: 'doctor' },
      { key: 'priority', label: 'Priority', type: 'select', options: PRIORITIES },
      { key: 'submittedDate', label: 'Submitted date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: OPINION_STATUSES },
      { key: 'summary', label: 'Case summary', type: 'textarea', full: true },
    ],
    defaults: { priority: 'Normal', status: 'Awaiting Review' },
    stats: (l) => [
      { label: 'Awaiting review', value: countBy(l, (x) => x.status === 'Awaiting Review'), tone: 'amber' },
      { label: 'Under review', value: countBy(l, (x) => x.status === 'Under Review'), tone: 'blue' },
      { label: 'Delivered', value: countBy(l, (x) => x.status === 'Delivered'), tone: 'green' },
      { label: 'Urgent', value: countBy(l, (x) => x.priority === 'Urgent'), tone: 'rose' },
    ],
  },

  pharmacy: {
    title: 'Pharmacy & Medications', subtitle: 'Medication inventory', noun: 'Medication', endpoint: '/medications',
    addLabel: 'Add Medication', searchPlaceholder: 'Search name, category or form…', statuses: MED_STATUSES,
    columns: [
      { key: 'name', label: 'Medication' }, { key: 'category', label: 'Category' }, { key: 'form', label: 'Form' },
      { key: 'strength', label: 'Strength' }, { key: 'stock', label: 'Stock' }, { key: 'price', label: 'Price', money: true },
      { key: 'status', label: 'Status', badge: T.medication },
    ],
    fields: [
      { key: 'name', label: 'Name *', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'select', options: MED_CATEGORIES },
      { key: 'form', label: 'Form', type: 'select', options: MED_FORMS },
      { key: 'strength', label: 'Strength', type: 'text', placeholder: 'e.g. 500 mg' },
      { key: 'stock', label: 'Stock (units)', type: 'number' },
      { key: 'price', label: 'Price (₹)', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: MED_STATUSES },
    ],
    defaults: { category: 'Chemotherapy', status: 'In Stock' },
    stats: (l) => [
      { label: 'Medications', value: l.length },
      { label: 'In stock', value: countBy(l, (x) => x.status === 'In Stock'), tone: 'green' },
      { label: 'Low stock', value: countBy(l, (x) => x.status === 'Low Stock'), tone: 'amber' },
      { label: 'Out of stock', value: countBy(l, (x) => x.status === 'Out of Stock'), tone: 'rose' },
    ],
  },

  billing: {
    title: 'Billing & Payments', subtitle: 'Invoices & payments', noun: 'Invoice', endpoint: '/invoices',
    addLabel: 'Create Invoice', searchPlaceholder: 'Search patient or service…', statuses: INVOICE_STATUSES, pickers: ['patients'],
    columns: [
      { key: 'patientName', label: 'Patient', sub: 'patientUhid' },
      { key: 'service', label: 'Service' }, { key: 'amount', label: 'Amount', money: true },
      { key: 'method', label: 'Method' }, { key: 'date', label: 'Date' },
      { key: 'status', label: 'Status', badge: T.invoice },
    ],
    fields: [
      { key: 'patientName', label: 'Patient *', type: 'patient', required: true },
      { key: 'patientUhid', label: 'UHID', type: 'text', placeholder: 'Auto from patient' },
      { key: 'service', label: 'Service', type: 'text', placeholder: 'e.g. Second Opinion' },
      { key: 'amount', label: 'Amount (₹)', type: 'number' },
      { key: 'method', label: 'Payment method', type: 'select', options: METHODS },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: INVOICE_STATUSES },
      { key: 'notes', label: 'Notes', type: 'textarea', full: true },
    ],
    defaults: { method: 'Card', status: 'Pending' },
    stats: (l) => [
      { label: 'Collected', value: rupees(l.filter((x) => x.status === 'Paid').reduce((s, x) => s + (x.amount || 0), 0)), tone: 'green' },
      { label: 'Outstanding', value: rupees(l.filter((x) => ['Pending', 'Overdue'].includes(x.status)).reduce((s, x) => s + (x.amount || 0), 0)), tone: 'amber' },
      { label: 'Overdue', value: countBy(l, (x) => x.status === 'Overdue'), tone: 'rose' },
      { label: 'Invoices', value: l.length },
    ],
  },

  lab: {
    title: 'Lab & Investigations', subtitle: 'Lab orders & results', noun: 'Lab Order', endpoint: '/lab-tests',
    addLabel: 'Order Test', searchPlaceholder: 'Search patient, test or doctor…', statuses: LAB_STATUSES, pickers: ['patients', 'staff'],
    columns: [
      { key: 'patientName', label: 'Patient', sub: 'patientUhid' },
      { key: 'test', label: 'Test' }, { key: 'orderedBy', label: 'Ordered By' }, { key: 'date', label: 'Date' },
      { key: 'result', label: 'Result' },
      { key: 'status', label: 'Status', badge: T.lab },
    ],
    fields: [
      { key: 'patientName', label: 'Patient *', type: 'patient', required: true },
      { key: 'patientUhid', label: 'UHID', type: 'text', placeholder: 'Auto from patient' },
      { key: 'test', label: 'Test', type: 'text', placeholder: 'e.g. CBC, CA-125' },
      { key: 'orderedBy', label: 'Ordered by', type: 'doctor' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: LAB_STATUSES },
      { key: 'result', label: 'Result', type: 'textarea', full: true },
    ],
    defaults: { test: 'CBC', status: 'Ordered' },
    stats: (l) => [
      { label: 'Ordered', value: countBy(l, (x) => x.status === 'Ordered') },
      { label: 'In progress', value: countBy(l, (x) => x.status === 'In Progress'), tone: 'amber' },
      { label: 'Completed', value: countBy(l, (x) => x.status === 'Completed'), tone: 'green' },
      { label: 'Total', value: l.length },
    ],
  },

  users: {
    title: 'User Management', subtitle: 'System login accounts & roles', noun: 'User', endpoint: '/users',
    addLabel: 'Add User', searchPlaceholder: 'Search name, email or role…', statuses: USER_STATUSES,
    columns: [
      { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Role' },
      { key: 'lastLogin', label: 'Last Login' },
      { key: 'status', label: 'Status', badge: T.user },
    ],
    fields: [
      { key: 'name', label: 'Full name *', type: 'text', required: true },
      { key: 'email', label: 'Email *', type: 'text', required: true, placeholder: 'name@dblinternational.com' },
      { key: 'role', label: 'Role', type: 'select', options: ROLES },
      { key: 'status', label: 'Status', type: 'select', options: USER_STATUSES },
      { key: 'lastLogin', label: 'Last login', type: 'date' },
    ],
    defaults: { role: 'Staff', status: 'Active' },
    stats: (l) => [
      { label: 'Total users', value: l.length },
      { label: 'Active', value: countBy(l, (x) => x.status === 'Active'), tone: 'green' },
      { label: 'Doctors', value: countBy(l, (x) => x.role === 'Doctor'), tone: 'blue' },
      { label: 'Suspended', value: countBy(l, (x) => x.status === 'Suspended'), tone: 'rose' },
    ],
  },

  communication: {
    title: 'Communication', subtitle: 'Announcements & broadcasts', noun: 'Announcement', endpoint: '/announcements',
    addLabel: 'New Announcement', searchPlaceholder: 'Search title or audience…', statuses: ANN_STATUSES,
    columns: [
      { key: 'title', label: 'Title' }, { key: 'audience', label: 'Audience' }, { key: 'date', label: 'Date' },
      { key: 'status', label: 'Status', badge: T.announcement },
    ],
    fields: [
      { key: 'title', label: 'Title *', type: 'text', required: true, full: true },
      { key: 'audience', label: 'Audience', type: 'select', options: AUDIENCES },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ANN_STATUSES },
      { key: 'body', label: 'Message', type: 'textarea', full: true },
    ],
    defaults: { audience: 'All Staff', status: 'Published' },
    stats: (l) => [
      { label: 'Published', value: countBy(l, (x) => x.status === 'Published'), tone: 'green' },
      { label: 'Draft', value: countBy(l, (x) => x.status === 'Draft'), tone: 'amber' },
      { label: 'Archived', value: countBy(l, (x) => x.status === 'Archived') },
      { label: 'Total', value: l.length },
    ],
  },
};

export default MODULE_CONFIGS;
