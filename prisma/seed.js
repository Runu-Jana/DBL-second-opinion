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

  console.log('Done.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
