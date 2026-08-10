// Seed sample oncologists + an admin account.
// Sample doctors are fictional, for demo purposes only.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../server/db');

const oncologists = [
  {
    name: 'Dr. Bhoumik Kadhye',
    specialty: 'Medical Oncology',
    qualifications: 'MBBS, MD, DM (Medical Oncology)',
    experience: 16,
    hospital: 'Apex Cancer Institute',
    city: 'Mumbai',
    bio: 'Specialises in solid tumours and personalised chemotherapy protocols. Believes every cancer patient deserves the right treatment and the right opinion.',
    rating: 4.9,
    featured: true,
  },
  {
    name: 'Dr. Ananya Sharma',
    specialty: 'Surgical Oncology',
    qualifications: 'MBBS, MS, MCh (Surgical Oncology)',
    experience: 14,
    hospital: 'Sunrise Oncology Centre',
    city: 'Delhi',
    bio: 'Expert in minimally invasive and breast-conserving cancer surgery with a focus on faster recovery.',
    rating: 4.8,
    featured: true,
  },
  {
    name: 'Dr. Rajesh Menon',
    specialty: 'Radiation Oncology',
    qualifications: 'MBBS, MD (Radiation Oncology)',
    experience: 18,
    hospital: 'Meditrust Cancer Hospital',
    city: 'Bengaluru',
    bio: 'Leads advanced IMRT and stereotactic radiosurgery programmes for precise, targeted treatment.',
    rating: 4.9,
    featured: true,
  },
  {
    name: 'Dr. Priya Nair',
    specialty: 'Paediatric Oncology',
    qualifications: 'MBBS, MD, Fellowship (Paediatric Haemato-Oncology)',
    experience: 12,
    hospital: 'Little Hearts Children’s Hospital',
    city: 'Chennai',
    bio: 'Dedicated to childhood cancers and blood disorders with a compassionate, family-centred approach.',
    rating: 4.9,
    featured: false,
  },
  {
    name: 'Dr. Arjun Deshpande',
    specialty: 'Haemato-Oncology',
    qualifications: 'MBBS, MD, DM (Clinical Haematology)',
    experience: 15,
    hospital: 'Apex Cancer Institute',
    city: 'Pune',
    bio: 'Focuses on leukaemia, lymphoma and bone-marrow transplantation with the latest immunotherapy options.',
    rating: 4.7,
    featured: false,
  },
  {
    name: 'Dr. Fatima Qureshi',
    specialty: 'Gynaecologic Oncology',
    qualifications: 'MBBS, MS (OBG), Fellowship (Gynae-Oncology)',
    experience: 13,
    hospital: 'Sunrise Oncology Centre',
    city: 'Hyderabad',
    bio: 'Specialises in ovarian, cervical and uterine cancers, combining surgery with targeted therapy.',
    rating: 4.8,
    featured: false,
  },
];

const services = [
  { title: 'Cancer Medical Second Opinion', icon: 'report', price: 2999, description: 'Expert opinion on your diagnosis and treatment plan.', longDescription: 'Get a comprehensive second opinion from a leading oncologist on your diagnosis, staging and recommended treatment plan. Upload your reports and receive a detailed written opinion within 24–48 hours.', featured: true, order: 1 },
  { title: 'Clinical Oncology Pharmacy Review', icon: 'pill', price: 999, description: 'Medication review by clinical oncology experts.', longDescription: 'A clinical oncology pharmacist reviews your current medications for dosing, interactions and suitability, and provides clear guidance you can discuss with your treating team.', order: 2 },
  { title: 'Multidisciplinary Tumour Board', icon: 'board', price: 12999, description: 'Case review by multiple cancer specialists together.', longDescription: 'Your case is reviewed jointly by a panel of specialists — medical, surgical and radiation oncology — to arrive at a consensus recommendation, just like a hospital tumour board.', featured: true, order: 3 },
  { title: 'Video Consultation', icon: 'video', price: 1499, description: 'Discuss your case with experts over a video call.', longDescription: 'A scheduled one-on-one video consultation with an oncologist to discuss your reports, ask questions and understand your options in plain language.', order: 4 },
  { title: 'Patient Assistance Services', icon: 'heart', price: 4999, description: 'Hospital selection, appointment booking & care coordination.', longDescription: 'End-to-end assistance with choosing the right hospital, booking appointments and coordinating your care so you can focus on getting better.', order: 5 },
  { title: 'Treatment Plan Review', icon: 'plan', price: 2999, description: 'A thorough review of your current treatment plan.', longDescription: 'An oncologist reviews your existing treatment plan against current evidence and guidelines and flags anything worth discussing with your treating doctor.', order: 6 },
  { title: 'Chemotherapy Review', icon: 'chemo', price: 1499, description: 'Chemotherapy medicines review and expert guidance.', longDescription: 'A focused review of your chemotherapy regimen — drugs, doses and schedule — with guidance on what to expect and how to manage it.', order: 7 },
  { title: 'Side-Effect Management', icon: 'shield', price: 1499, description: 'Management strategies for treatment side effects.', longDescription: 'Practical, evidence-based strategies to prevent and manage common treatment side effects, improving comfort and quality of life during therapy.', order: 8 },
  { title: 'Nationwide Patient Assistance', icon: 'globe', price: 4999, description: 'Complete support for patients across the country.', longDescription: 'Dedicated support for patients travelling for care anywhere in India — logistics, second opinions and coordination across cities.', order: 9 },
  { title: 'Dedicated Care Manager', icon: 'manager', price: 9999, priceUnit: '/month', description: 'A personal care manager for complete, ongoing support.', longDescription: 'A single point of contact who manages your entire care journey — appointments, reports, reminders and coordination — for complete peace of mind.', order: 10 },
];

const pricingPlans = [
  { name: 'Basic Plan', tagline: 'For standard second opinion', priceMonthly: 2999, order: 1, features: ['Report review by oncology experts', 'Second opinion report', 'Email support', 'Delivery in 3 working days'] },
  { name: 'Standard Plan', tagline: 'For comprehensive review', priceMonthly: 5999, order: 2, featured: true, features: ['Everything in Basic', 'Detailed report with recommendations', 'Clinical oncology pharmacist review', 'Care coordinator support', 'Delivery in 2 working days'] },
  { name: 'Premium Plan', tagline: 'For advanced & urgent cases', priceMonthly: 9999, order: 3, features: ['Everything in Standard', 'Priority case handling', 'Oncologist panel review', 'Live consultation (Optional)', 'Delivery in 24–48 hours'] },
];

const blogPosts = [
  { title: 'Understanding Your Cancer Diagnosis', category: 'Cancer Guide', excerpt: 'A comprehensive guide to help you understand your diagnosis and what comes next.', date: '10 May, 2025', readTime: '5 min read', imageUrl: '/blog-1.jpg', order: 1 },
  { title: 'The Role of Second Opinion in Cancer Care', category: 'Expert Insights', excerpt: 'Why a second opinion can make a big difference in your treatment journey.', date: '08 May, 2025', readTime: '6 min read', imageUrl: '/blog-2.jpg', order: 2 },
  { title: 'A Journey of Hope and Strength', category: 'Patient Stories', excerpt: 'Real stories from patients who faced cancer and came out stronger.', date: '05 May, 2025', readTime: '4 min read', imageUrl: '/blog-3.jpg', order: 3 },
  { title: 'Latest Advances in Cancer Treatment', category: 'News & Updates', excerpt: 'Stay updated with the latest breakthroughs and innovations in oncology.', date: '02 May, 2025', readTime: '7 min read', imageUrl: '/blog-4.jpg', order: 4 },
  { title: 'Nutrition & Diet During Cancer Treatment', category: 'Cancer Guide', excerpt: 'Foods that help boost immunity and support your recovery.', date: '30 Apr, 2025', readTime: '5 min read', imageUrl: '/blog-5.jpg', order: 5 },
  { title: 'Mental Wellness for Cancer Patients', category: 'Expert Insights', excerpt: 'Tips and strategies to manage stress and improve mental well-being.', date: '28 Apr, 2025', readTime: '6 min read', imageUrl: '/blog-6.jpg', order: 6 },
  { title: 'Overcoming Challenges with the Right Support', category: 'Patient Stories', excerpt: 'How expert guidance and family support make a difference.', date: '25 Apr, 2025', readTime: '4 min read', imageUrl: '/blog-7.jpg', order: 7 },
  { title: 'Webinar: Immunotherapy Explained', category: 'Videos & Podcasts', excerpt: 'Our expert oncologists explain how immunotherapy works.', date: '22 Apr, 2025', readTime: 'Watch Now', imageUrl: '/blog-8.jpg', isVideo: true, order: 8 },
];

const patients = [
  { name: 'Rahul Sharma', uhid: 'DBL125456', age: 54, gender: 'Male', phone: '+91 98200 11111', city: 'Mumbai', cancerType: 'Colon Cancer', stage: 'Stage II', status: 'Under Treatment', doctor: 'Dr. Bhoumik Kadhye', lastVisit: '16 May 2024' },
  { name: 'Neha Verma', uhid: 'DBL125457', age: 46, gender: 'Female', phone: '+91 98200 22222', city: 'Delhi', cancerType: 'Breast Cancer', stage: 'Stage IIA', status: 'Under Treatment', doctor: 'Dr. Ananya Sharma', lastVisit: '16 May 2024' },
  { name: 'Arjun Mehta', uhid: 'DBL125458', age: 61, gender: 'Male', phone: '+91 98200 33333', city: 'Bengaluru', cancerType: 'Lung Cancer', stage: 'Stage IIIA', status: 'Under Treatment', doctor: 'Dr. Rajesh Menon', lastVisit: '15 May 2024' },
  { name: 'Pooja Singh', uhid: 'DBL125459', age: 39, gender: 'Female', phone: '+91 98200 44444', city: 'Pune', cancerType: 'Ovarian Cancer', stage: 'Stage IIC', status: 'New Patient', doctor: 'Dr. Ananya Sharma', lastVisit: '15 May 2024' },
  { name: 'Rajesh Kumar', uhid: 'DBL125460', age: 67, gender: 'Male', phone: '+91 98200 55555', city: 'Chennai', cancerType: 'Prostate Cancer', stage: 'Stage I', status: 'Follow-up', doctor: 'Dr. Bhoumik Kadhye', lastVisit: '14 May 2024' },
  { name: 'Sunita Rao', uhid: 'DBL125461', age: 52, gender: 'Female', phone: '+91 98200 66666', city: 'Hyderabad', cancerType: 'Cervical Cancer', stage: 'Stage IB', status: 'Completed', doctor: 'Dr. Rajesh Menon', lastVisit: '10 May 2024' },
];

const staff = [
  { name: 'Dr. Bhoumik Kadhye', role: 'Oncologist', department: 'Medical Oncology', specialties: 'Lung Cancer, GI / Liver / Pancreatic Cancer', qualifications: 'MBBS, MD, DM (Medical Oncology)', email: 'bhoumik.k@dblinternational.com', phone: '+91 98200 10001', status: 'Active', onCall: true, joinedDate: '12 Jan 2018' },
  { name: 'Dr. Ananya Sharma', role: 'Surgeon', department: 'Surgical Oncology', specialties: 'Breast Cancer, Colorectal Cancer', qualifications: 'MBBS, MS, MCh (Surgical Oncology)', email: 'ananya.s@dblinternational.com', phone: '+91 98200 10002', status: 'Active', joinedDate: '03 Mar 2019' },
  { name: 'Dr. Rajesh Menon', role: 'Radiologist', department: 'Radiation Oncology', specialties: 'Head & Neck Cancer, Brain & CNS Cancer', qualifications: 'MBBS, MD (Radiation Oncology)', email: 'rajesh.m@dblinternational.com', phone: '+91 98200 10003', status: 'Active', joinedDate: '20 Jul 2017' },
  { name: 'Dr. Neha Verma', role: 'Clinical Pharmacist', department: 'Pharmacy', qualifications: 'PharmD, BCOP', email: 'neha.v@dblinternational.com', phone: '+91 98200 10004', status: 'Active', joinedDate: '15 Sep 2020' },
  { name: 'Ms. Pooja Sharma', role: 'Care Coordinator', department: 'Patient Support', qualifications: 'BSc Nursing', email: 'pooja.s@dblinternational.com', phone: '+91 98200 10005', status: 'Active', joinedDate: '05 Feb 2021' },
  { name: 'Ms. Ritu Singh', role: 'Nutritionist', department: 'Patient Support', qualifications: 'MSc Clinical Nutrition', email: 'ritu.s@dblinternational.com', phone: '+91 98200 10006', status: 'On Leave', joinedDate: '11 Nov 2021' },
  { name: 'Mr. Amit Deshpande', role: 'Lab Technician', department: 'Pathology', qualifications: 'DMLT, BSc', email: 'amit.d@dblinternational.com', phone: '+91 98200 10007', status: 'Active', joinedDate: '28 Jun 2022' },
  { name: 'Ms. Kavya Nair', role: 'Administrator', department: 'Administration', qualifications: 'MBA (Healthcare)', email: 'kavya.n@dblinternational.com', phone: '+91 98200 10008', status: 'Active', joinedDate: '02 Jan 2020' },
];

const appointments = [
  { patientName: 'Rahul Sharma', patientUhid: 'DBL125456', doctor: 'Dr. Bhoumik Kadhye', type: 'OPD Follow-up', date: '16 May 2024', time: '09:00 AM', mode: 'In-person', status: 'Upcoming' },
  { patientName: 'Neha Verma', patientUhid: 'DBL125457', doctor: 'Dr. Ananya Sharma', type: 'Chemotherapy Review', date: '16 May 2024', time: '10:00 AM', mode: 'In-person', status: 'Upcoming' },
  { patientName: 'Arjun Mehta', patientUhid: 'DBL125458', doctor: 'Dr. Rajesh Menon', type: 'Second Opinion', date: '16 May 2024', time: '11:30 AM', mode: 'Video', status: 'Confirmed' },
  { patientName: 'Pooja Singh', patientUhid: 'DBL125459', doctor: 'Dr. Ananya Sharma', type: 'New Consultation', date: '16 May 2024', time: '01:00 PM', mode: 'In-person', status: 'Upcoming' },
  { patientName: 'Rajesh Kumar', patientUhid: 'DBL125460', doctor: 'Dr. Bhoumik Kadhye', type: 'Treatment Plan Review', date: '16 May 2024', time: '02:30 PM', mode: 'In-person', status: 'Pending' },
  { patientName: 'Sunita Rao', patientUhid: 'DBL125461', doctor: 'Dr. Rajesh Menon', type: 'Video Consultation', date: '15 May 2024', time: '04:00 PM', mode: 'Video', status: 'Completed' },
];

const consultations = [
  { patientName: 'Rahul Sharma', patientUhid: 'DBL125456', doctor: 'Dr. Bhoumik Kadhye', type: 'Second Opinion', date: '14 May 2024', cancerType: 'Colon Cancer', summary: 'Stage II adenocarcinoma, post-resection. Reviewing adjuvant chemotherapy need.', recommendation: 'Adjuvant FOLFOX recommended for 6 months; monitor CEA.', status: 'Report Ready', fee: 2999 },
  { patientName: 'Neha Verma', patientUhid: 'DBL125457', doctor: 'Dr. Ananya Sharma', type: 'Chemotherapy Planning', date: '15 May 2024', cancerType: 'Breast Cancer', summary: 'ER+/HER2- Stage IIA. Planning systemic therapy.', recommendation: 'Consider AC-T regimen followed by endocrine therapy.', status: 'In Review', fee: 1499 },
  { patientName: 'Arjun Mehta', patientUhid: 'DBL125458', doctor: 'Dr. Rajesh Menon', type: 'Tumor Board Review', date: '15 May 2024', cancerType: 'Lung Cancer', summary: 'Stage IIIA NSCLC. Multidisciplinary review for concurrent chemoradiation.', recommendation: 'Concurrent chemoradiation, re-evaluate for surgery.', status: 'Pending', fee: 12999 },
  { patientName: 'Pooja Singh', patientUhid: 'DBL125459', doctor: 'Dr. Ananya Sharma', type: 'New Consultation', date: '15 May 2024', cancerType: 'Ovarian Cancer', summary: 'Newly diagnosed Stage IIC. Initial assessment.', recommendation: 'Staging laparotomy; plan platinum-based chemo.', status: 'Pending', fee: 2999 },
  { patientName: 'Rajesh Kumar', patientUhid: 'DBL125460', doctor: 'Dr. Bhoumik Kadhye', type: 'Follow-up', date: '13 May 2024', cancerType: 'Prostate Cancer', summary: 'Stage I, on active surveillance. Routine review.', recommendation: 'Continue surveillance; repeat PSA in 3 months.', status: 'Completed', fee: 999 },
];

const reports = [
  { patientName: 'Rahul Sharma', patientUhid: 'DBL125456', type: 'CT Scan', doctor: 'Dr. Bhoumik Kadhye', date: '14 May 2024', status: 'Reviewed', fileUrl: '/sample-report.pdf' },
  { patientName: 'Neha Verma', patientUhid: 'DBL125457', type: 'PET CT', doctor: 'Dr. Ananya Sharma', date: '15 May 2024', status: 'Pending Review', fileUrl: '/sample-report.pdf' },
  { patientName: 'Arjun Mehta', patientUhid: 'DBL125458', type: 'Histopathology', doctor: 'Dr. Rajesh Menon', date: '13 May 2024', status: 'Pending Review', fileUrl: '/sample-report.pdf' },
  { patientName: 'Pooja Singh', patientUhid: 'DBL125459', type: 'Blood Report', doctor: 'Dr. Ananya Sharma', date: '15 May 2024', status: 'Uploaded', fileUrl: '/sample-report.pdf' },
  { patientName: 'Rajesh Kumar', patientUhid: 'DBL125460', type: 'Treatment Summary', doctor: 'Dr. Bhoumik Kadhye', date: '12 May 2024', status: 'Reviewed', fileUrl: '/sample-report.pdf' },
];

const treatmentPlans = [
  { patientName: 'Rahul Sharma', patientUhid: 'DBL125456', doctor: 'Dr. Bhoumik Kadhye', diagnosis: 'Colon Cancer', regimen: 'FOLFOX', modality: 'Chemotherapy', cyclesTotal: 12, cyclesDone: 7, startDate: '01 Mar 2024', status: 'Active' },
  { patientName: 'Neha Verma', patientUhid: 'DBL125457', doctor: 'Dr. Ananya Sharma', diagnosis: 'Breast Cancer', regimen: 'AC-T', modality: 'Chemotherapy', cyclesTotal: 8, cyclesDone: 4, startDate: '10 Apr 2024', status: 'Active' },
  { patientName: 'Arjun Mehta', patientUhid: 'DBL125458', doctor: 'Dr. Rajesh Menon', diagnosis: 'Lung Cancer', regimen: 'Concurrent CRT', modality: 'Radiotherapy', cyclesTotal: 30, cyclesDone: 12, startDate: '20 Apr 2024', status: 'Active' },
  { patientName: 'Rajesh Kumar', patientUhid: 'DBL125460', doctor: 'Dr. Bhoumik Kadhye', diagnosis: 'Prostate Cancer', regimen: 'Active Surveillance', modality: 'Surgery', cyclesTotal: 0, cyclesDone: 0, startDate: '05 Jan 2024', status: 'On Hold' },
];

const secondOpinions = [
  { patientName: 'Arjun Mehta', patientUhid: 'DBL125458', expert: 'Dr. Rajesh Menon', cancerType: 'Lung Cancer', priority: 'High', submittedDate: '13 May 2024', status: 'Under Review', summary: 'Requesting review of chemoradiation vs surgery for Stage IIIA NSCLC.' },
  { patientName: 'Pooja Singh', patientUhid: 'DBL125459', expert: 'Dr. Ananya Sharma', cancerType: 'Ovarian Cancer', priority: 'Urgent', submittedDate: '15 May 2024', status: 'Awaiting Review', summary: 'Newly diagnosed Stage IIC — second opinion on surgical approach.' },
  { patientName: 'Rahul Sharma', patientUhid: 'DBL125456', expert: 'Dr. Bhoumik Kadhye', cancerType: 'Colon Cancer', priority: 'Normal', submittedDate: '12 May 2024', status: 'Opinion Ready', summary: 'Adjuvant chemotherapy necessity after resection.' },
  { patientName: 'Sunita Rao', patientUhid: 'DBL125461', expert: 'Dr. Rajesh Menon', cancerType: 'Cervical Cancer', priority: 'Normal', submittedDate: '09 May 2024', status: 'Delivered', summary: 'Radiation planning review for Stage IB.' },
];

const medications = [
  { name: 'Oxaliplatin', category: 'Chemotherapy', form: 'Infusion', strength: '100 mg', stock: 42, price: 8500, status: 'In Stock' },
  { name: 'Paclitaxel', category: 'Chemotherapy', form: 'Infusion', strength: '260 mg', stock: 8, price: 6200, status: 'Low Stock' },
  { name: 'Ondansetron', category: 'Antiemetic', form: 'Injection', strength: '4 mg', stock: 120, price: 45, status: 'In Stock' },
  { name: 'Filgrastim', category: 'Supportive', form: 'Injection', strength: '300 mcg', stock: 0, price: 1500, status: 'Out of Stock' },
  { name: 'Morphine', category: 'Analgesic', form: 'Tablet', strength: '10 mg', stock: 60, price: 25, status: 'In Stock' },
  { name: 'Capecitabine', category: 'Chemotherapy', form: 'Tablet', strength: '500 mg', stock: 15, price: 3200, status: 'Low Stock' },
];

const invoices = [
  { patientName: 'Rahul Sharma', patientUhid: 'DBL125456', service: 'Cancer Medical Second Opinion', amount: 2999, date: '14 May 2024', method: 'Card', status: 'Paid' },
  { patientName: 'Neha Verma', patientUhid: 'DBL125457', service: 'Chemotherapy Review', amount: 1499, date: '15 May 2024', method: 'UPI', status: 'Pending' },
  { patientName: 'Arjun Mehta', patientUhid: 'DBL125458', service: 'Multidisciplinary Tumour Board', amount: 12999, date: '13 May 2024', method: 'Bank Transfer', status: 'Paid' },
  { patientName: 'Pooja Singh', patientUhid: 'DBL125459', service: 'New Consultation', amount: 2999, date: '15 May 2024', method: 'Insurance', status: 'Pending' },
  { patientName: 'Rajesh Kumar', patientUhid: 'DBL125460', service: 'Follow-up', amount: 999, date: '10 May 2024', method: 'Cash', status: 'Overdue' },
];

const labTests = [
  { patientName: 'Rahul Sharma', patientUhid: 'DBL125456', test: 'CEA Tumour Marker', orderedBy: 'Dr. Bhoumik Kadhye', date: '14 May 2024', status: 'Completed', result: '3.2 ng/mL (normal)' },
  { patientName: 'Neha Verma', patientUhid: 'DBL125457', test: 'CBC', orderedBy: 'Dr. Ananya Sharma', date: '15 May 2024', status: 'In Progress' },
  { patientName: 'Arjun Mehta', patientUhid: 'DBL125458', test: 'Biopsy — Histopathology', orderedBy: 'Dr. Rajesh Menon', date: '13 May 2024', status: 'Sample Collected' },
  { patientName: 'Pooja Singh', patientUhid: 'DBL125459', test: 'CA-125', orderedBy: 'Dr. Ananya Sharma', date: '15 May 2024', status: 'Ordered' },
];

const appUsers = [
  { name: 'DBL Admin', email: 'admin@dblindia.com', role: 'Super Admin', status: 'Active', lastLogin: '16 May 2024' },
  { name: 'Dr. Bhoumik Kadhye', email: 'bhoumik.k@dblinternational.com', role: 'Doctor', status: 'Active', lastLogin: '16 May 2024' },
  { name: 'Ms. Pooja Sharma', email: 'pooja.s@dblinternational.com', role: 'Staff', status: 'Active', lastLogin: '15 May 2024' },
  { name: 'Dr. Neha Verma', email: 'neha.v@dblinternational.com', role: 'Doctor', status: 'Active', lastLogin: '16 May 2024' },
  { name: 'Reception Desk', email: 'reception@dblinternational.com', role: 'Viewer', status: 'Inactive', lastLogin: '02 May 2024' },
];

const announcements = [
  { title: 'New chemotherapy protocol guidelines released', body: 'Updated NCCN-aligned protocols are now available in the Library. Please review before the next tumour board.', audience: 'Doctors', date: '15 May 2024', status: 'Published' },
  { title: 'System maintenance this weekend', body: 'The platform will be briefly unavailable on Sunday 2–4 AM IST for scheduled maintenance.', audience: 'All Staff', date: '14 May 2024', status: 'Published' },
  { title: 'Patient satisfaction survey — Q2', body: 'Coordinators, please ensure discharge surveys are shared with all completed cases.', audience: 'Coordinators', date: '10 May 2024', status: 'Draft' },
];

const activityLogs = [
  { kind: 'activity', actor: 'Dr. Neha Verma', action: 'generated a new report', target: 'Neha Verma', category: 'Report', time: '2 min ago' },
  { kind: 'activity', actor: 'Reception Desk', action: 'registered new patient', target: 'Rahul Sharma', category: 'Patient', time: '15 min ago' },
  { kind: 'activity', actor: 'System', action: 'backup completed successfully', category: 'System', time: '30 min ago' },
  { kind: 'activity', actor: 'DBL Admin', action: 'updated system settings', category: 'Settings', time: '45 min ago' },
  { kind: 'activity', actor: 'Billing', action: 'received payment', target: 'Neha Verma', category: 'Billing', time: '1 hour ago' },
  { kind: 'audit', actor: 'admin@dblindia.com', action: 'logged in', category: 'Login', time: '16 May 2024, 09:02' },
  { kind: 'audit', actor: 'admin@dblindia.com', action: 'updated patient record', target: 'DBL125456', category: 'Patient', time: '16 May 2024, 09:15' },
  { kind: 'audit', actor: 'bhoumik.k@dblinternational.com', action: 'deleted appointment', target: '#42', category: 'Appointment', time: '15 May 2024, 17:40' },
  { kind: 'audit', actor: 'admin@dblindia.com', action: 'changed user role', target: 'reception@dblinternational.com', category: 'User', time: '15 May 2024, 11:20' },
];

const doctorApplications = [
  { name: 'Dr. Karan Malhotra', email: 'karan.malhotra@example.com', specialization: 'Medical Oncology', experience: '10–15 years', qualification: 'MD', country: 'India', status: 'Pending' },
  { name: 'Dr. Sneha Iyer', email: 'sneha.iyer@example.com', specialization: 'Radiation Oncology', experience: '5–10 years', qualification: 'DM', country: 'India', status: 'Pending' },
  { name: 'Dr. James Carter', email: 'james.carter@example.com', specialization: 'Surgical Oncology', experience: '15+ years', qualification: 'MCh', country: 'United States', status: 'Pending' },
];

async function main() {
  console.log('Seeding database...');

  // Admin
  const email = process.env.ADMIN_EMAIL || 'admin@dblindia.com';
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
  await prisma.admin.upsert({
    where: { email },
    update: {},
    create: { email, name: process.env.ADMIN_NAME || 'DBL Admin', password: passwordHash },
  });
  console.log(`  ✓ admin ready: ${email}`);

  // Oncologists — only seed when empty, so re-running (e.g. on deploy) never
  // wipes changes made through the admin panel.
  if (await prisma.oncologist.count() === 0) {
    await prisma.oncologist.createMany({ data: oncologists });
    console.log(`  ✓ ${oncologists.length} oncologists inserted`);
  } else {
    console.log('  • oncologists already present — skipped');
  }

  // Services — same idempotent guard
  if (await prisma.service.count() === 0) {
    await prisma.service.createMany({ data: services });
    console.log(`  ✓ ${services.length} services inserted`);
  } else {
    console.log('  • services already present — skipped');
  }

  // Pricing settings singleton
  await prisma.pricingSetting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  console.log('  ✓ pricing settings ready');

  // Pricing plans — idempotent guard
  if (await prisma.pricingPlan.count() === 0) {
    await prisma.pricingPlan.createMany({ data: pricingPlans });
    console.log(`  ✓ ${pricingPlans.length} pricing plans inserted`);
  } else {
    console.log('  • pricing plans already present — skipped');
  }

  // Blog posts — idempotent guard
  if (await prisma.blogPost.count() === 0) {
    await prisma.blogPost.createMany({ data: blogPosts });
    console.log(`  ✓ ${blogPosts.length} blog posts inserted`);
  } else {
    console.log('  • blog posts already present — skipped');
  }

  // Patients — idempotent guard
  if (await prisma.patient.count() === 0) {
    await prisma.patient.createMany({ data: patients });
    console.log(`  ✓ ${patients.length} patients inserted`);
  } else {
    console.log('  • patients already present — skipped');
  }

  // Staff — idempotent guard
  if (await prisma.staff.count() === 0) {
    await prisma.staff.createMany({ data: staff });
    console.log(`  ✓ ${staff.length} staff inserted`);
  } else {
    console.log('  • staff already present — skipped');
  }

  // Give staff a default Doctor Portal password if they don't have one yet
  const needPass = await prisma.staff.count({ where: { password: null } });
  if (needPass) {
    const hash = await bcrypt.hash('doctor123', 10);
    await prisma.staff.updateMany({ where: { password: null }, data: { password: hash } });
    console.log(`  ✓ ${needPass} staff given default password ("doctor123")`);
  }

  // Appointments — idempotent guard
  if (await prisma.appointment.count() === 0) {
    await prisma.appointment.createMany({ data: appointments });
    console.log(`  ✓ ${appointments.length} appointments inserted`);
  } else {
    console.log('  • appointments already present — skipped');
  }

  // Consultations — idempotent guard
  if (await prisma.consultation.count() === 0) {
    await prisma.consultation.createMany({ data: consultations });
    console.log(`  ✓ ${consultations.length} consultations inserted`);
  } else {
    console.log('  • consultations already present — skipped');
  }

  // Remaining modules — idempotent guards
  const seedIf = async (model, data, label) => {
    if (await prisma[model].count() === 0) { await prisma[model].createMany({ data }); console.log(`  ✓ ${data.length} ${label} inserted`); }
    else { console.log(`  • ${label} already present — skipped`); }
  };
  await seedIf('report', reports, 'reports');
  await seedIf('treatmentPlan', treatmentPlans, 'treatment plans');
  await seedIf('secondOpinion', secondOpinions, 'second opinions');
  await seedIf('medication', medications, 'medications');
  await seedIf('invoice', invoices, 'invoices');
  await seedIf('labTest', labTests, 'lab tests');
  await seedIf('appUser', appUsers, 'users');
  await seedIf('announcement', announcements, 'announcements');
  await seedIf('activityLog', activityLogs, 'activity logs');
  await seedIf('doctorApplication', doctorApplications, 'doctor applications');
  await prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  console.log('  ✓ settings ready');

  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
