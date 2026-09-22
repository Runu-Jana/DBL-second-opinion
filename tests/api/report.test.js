// The AI report builder: the structured report is saved by the doctor, gated to its owner,
// submitted, edited by the admin, delivered, and only then rendered to the patient. The AI
// composition itself needs a key, so here we drive the flow with a report the way the model would
// have produced it, and check the composer's pure shaping separately (no key required).
(async () => {
  const ROOT = process.cwd();
  const jwt = require(ROOT + '/node_modules/jsonwebtoken');
  const { PrismaClient } = require(ROOT + '/node_modules/@prisma/client');
  const { normalise, toPlainText, buildPrompt, intakeText } = require(ROOT + '/server/lib/reportComposer');
  const prisma = new PrismaClient();
  const B = 'http://localhost:5500/api';
  const S = 't';

  let pass = 0, fail = 0;
  const check = (n, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    ok ? pass++ : fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `  (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`}`);
  };
  const call = async (m, p, token, body) => {
    const r = await fetch(B + p, {
      method: m,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };

  /* ---------- the composer's pure shaping (no API key needed) ---------- */
  const empty = normalise({});
  check('normalise fills the service default', empty.header.service, 'Medical Second Opinion & Clinical Oncology Review');
  check('normalise makes missing tables empty', [empty.medications.length, empty.investigations.length, empty.answers.length], [0, 0, 0]);
  check('normalise defaults a medication status', normalise({ medications: [{ name: 'X' }] }).medications[0].status, 'Appropriate');
  check('normalise coerces a non-string field', normalise({ header: { stage: 3 } }).header.stage, '3');

  const form = { planAppropriate: true, considerAlternatives: false, recommendations: ['Continue the current treatment plan'], tone: 'Reassuring — plan is appropriate' };
  check('intake reflects the ticks', /appropriate \(per NCCN\/ESMO\/ASCO\): yes/.test(intakeText(form)), true);
  const pr = buildPrompt({ patientName: 'Asha', patientQuestions: 'Will chemo work?', form });
  check('the prompt carries the intake', pr.includes("THE DOCTOR'S CLINICAL INTAKE"), true);
  check('the prompt carries the question', pr.includes('Will chemo work?'), true);

  const sample = {
    header: { diagnosis: 'Adenocarcinoma Lung', cancerType: 'Lung Cancer', stage: 'Stage III', chiefComplaint: 'Second opinion on chemotherapy', prevTreatment: '', currentTreatment: 'Chemotherapy ongoing', service: 'Medical Second Opinion' },
    reportsReviewed: ['CT Scan — 12 Sep 2026'],
    secondOpinion: { diagnosisReview: 'Consistent with the reports.', investigationsReview: 'CT shows a left upper lobe mass.', treatmentReview: 'The plan is appropriate.', alternatives: 'None needed at this stage.', additionalTests: 'PET-CT for staging.', overallOpinion: 'Continue the current plan.' },
    pharmacy: {},
    medications: [{ name: 'Cisplatin', dose: '75 mg/m²', purpose: 'Chemotherapy', status: 'Appropriate' }],
    interactions: { major: false, minor: [], considerations: ['Maintain hydration.'] },
    recommendations: ['Continue chemotherapy', 'Repeat imaging in three months'],
    nextSteps: ['Follow up in three weeks'],
    investigations: [{ name: 'CT', date: '12 Sep 2026', findings: 'LUL mass 3.1 cm', interpretation: 'Primary lung tumour' }],
    sideEffects: [{ effect: 'Nausea', monitoring: 'Each cycle', management: 'Antiemetics' }],
    followUp: { schedule: [{ item: 'Oncologist review', when: 'Every 3 weeks' }], lifestyle: ['Avoid smoking'] },
    supportive: { nutrition: 'High-protein diet', psychological: '', physical: '', infection: '', medications: [] },
    costs: [], costTotal: '',
    answers: [{ question: 'Is my treatment right?', answer: 'Yes, it aligns with guidelines.' }],
  };
  const plain = toPlainText(sample, 'Asha');
  check('the flattening keeps the headings', /REVIEW OF DIAGNOSIS/.test(plain) && /OVERALL CLINICAL OPINION/.test(plain), true);
  check('the flattening keeps a recommendation', /Continue chemotherapy/.test(plain), true);

  /* ---------- the flow through the real API ---------- */
  const stamp = Date.now();
  const docName = `Dr Report ${stamp}`;
  const uhid = 'DBLR' + String(stamp).slice(-5);
  const email = `rep${stamp}@example.com`;
  const dTok = jwt.sign({ id: 811, name: docName, role: 'doctor', jobRole: 'Oncologist' }, S, { expiresIn: '1d' });
  const impTok = jwt.sign({ id: 811, name: docName, role: 'doctor', jobRole: 'Oncologist', imp: true, by: 'Admin' }, S, { expiresIn: '1d' });
  const otherDoc = jwt.sign({ id: 812, name: 'Dr Nobody', role: 'doctor' }, S, { expiresIn: '1d' });
  const cTok = jwt.sign({ id: 813, name: 'Priya Nair', role: 'counsellor', jobRole: 'Counsellor' }, S, { expiresIn: '1d' });

  await prisma.staff.create({ data: { name: docName, role: 'Oncologist', status: 'Active', password: 'x', specialties: 'Lung Cancer', email: `s${stamp}@example.com` } });
  const patient = await prisma.patient.create({ data: { name: `Report Probe ${stamp}`, uhid, email, status: 'New Patient', password: 'x' } });
  await prisma.report.create({ data: { patientName: patient.name, patientUhid: uhid, type: 'CT Scan', status: 'Pending Review', fileUrl: '/uploads/x.pdf', aiSummary: 'Left upper lobe mass 3.1 cm.' } });
  const pTok = jwt.sign({ id: patient.id, uhid, name: patient.name, email, role: 'patient' }, S, { expiresIn: '1d' });
  const adminTok = jwt.sign({ id: 1, email: 'a@b.com', name: 'Admin', role: 'admin' }, S, { expiresIn: '1d' });

  // Counsellor routes the case so the doctor owns it.
  await call('PUT', `/counsellor/folders/${patient.id}/report`, cTok, { report: 'Suspected lung primary.', cancerType: 'Lung Cancer' });
  await call('POST', `/counsellor/folders/${patient.id}/assign`, cTok, { doctor: docName, category: 'Lung Cancer' });

  // --- generate-report is gated ---
  check('a preview (read-only) cannot generate', (await call('POST', `/doctor/cases/${uhid}/generate-report`, impTok, { form })).status, 403);
  check('a counsellor cannot generate', (await call('POST', `/doctor/cases/${uhid}/generate-report`, cTok, { form })).status, 403);
  const noai = await call('POST', `/doctor/cases/${uhid}/generate-report`, dTok, { form });
  check('with no AI key configured, generate is unavailable', noai.status, 503);

  // --- saving the structured report (what the doctor does after generating + editing) ---
  check('a patient cannot save a report', [401, 403].includes((await call('PUT', `/doctor/cases/${uhid}/report`, pTok, { reportData: sample })).status), true);
  check('another doctor cannot save this report', (await call('PUT', `/doctor/cases/${uhid}/report`, otherDoc, { reportData: sample })).status, 404);
  check('a preview cannot save a report', (await call('PUT', `/doctor/cases/${uhid}/report`, impTok, { reportData: sample })).status, 403);

  const saved = await call('PUT', `/doctor/cases/${uhid}/report`, dTok, { reportData: sample, form });
  check('the assigned doctor saves the report', saved.status, 200);
  check('  the structured report is returned', saved.body.reportData.header.diagnosis, 'Adenocarcinoma Lung');
  check('  still just a draft', saved.body.status, 'Under Review');
  check('patient sees nothing yet', (await call('GET', '/portal/opinions', pTok)).body.length, 0);

  // The handover now carries the structured report and the intake back to the doctor.
  const handover = await call('GET', `/doctor/cases/${uhid}`, dTok);
  check('the handover returns the report', handover.body.reportData.secondOpinion.overallOpinion, 'Continue the current plan.');
  check('the handover returns the intake', handover.body.reportForm.planAppropriate, true);

  // --- submit to admin (the plain-text flattening set by the save satisfies the submit gate) ---
  const submitted = await call('POST', `/doctor/cases/${uhid}/submit`, dTok);
  check('the doctor submits for review', submitted.body.case.status, 'Pending Approval');
  check('patient still sees nothing', (await call('GET', '/portal/opinions', pTok)).body.length, 0);
  const caseId = submitted.body.case.id;

  // --- admin edits the structured report, then delivers ---
  check('a doctor cannot use the admin edit route', [401, 403].includes((await call('PUT', `/second-opinions/${caseId}/report`, dTok, { reportData: sample })).status), true);
  const edited = JSON.parse(JSON.stringify(sample));
  edited.secondOpinion.overallOpinion = 'Continue the plan; add a PET-CT before cycle 4.';
  const adminEdit = await call('PUT', `/second-opinions/${caseId}/report`, adminTok, { reportData: edited });
  check('the admin edits the report', adminEdit.status, 200);
  check('  the edit is kept', adminEdit.body.reportData.secondOpinion.overallOpinion, 'Continue the plan; add a PET-CT before cycle 4.');

  const sent = await call('POST', `/second-opinions/${caseId}/deliver`, adminTok);
  check('the admin delivers', sent.body.case.status, 'Delivered');

  // --- the patient reads the styled report ---
  const mine = await call('GET', '/portal/opinions', pTok);
  check('the patient can read the opinion', mine.body.length, 1);
  check('  the structured report is delivered', mine.body[0].reportData.header.diagnosis, 'Adenocarcinoma Lung');
  check("  including the admin's edit", mine.body[0].reportData.secondOpinion.overallOpinion, 'Continue the plan; add a PET-CT before cycle 4.');
  check('  the doctor is named', mine.body[0].doctor, docName);
  check("  the counsellor's internal note is NOT exposed", JSON.stringify(mine.body).includes('Suspected lung primary'), false);

  await prisma.notification.deleteMany({ where: { recipient: { in: [uhid, docName] } } }).catch(() => {});
  await prisma.report.deleteMany({ where: { patientUhid: uhid } });
  await prisma.secondOpinion.deleteMany({ where: { patientUhid: uhid } });
  await prisma.patient.deleteMany({ where: { uhid } });
  await prisma.staff.deleteMany({ where: { name: docName } });
  await prisma.$disconnect();

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
