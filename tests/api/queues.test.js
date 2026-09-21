// The sidebar work-queue badges. Unlike the bell, these count work still to do, so they must
// track the database and fall when the work is finished — not when someone opens the tab.
(async () => {
  const ROOT = process.cwd();
  const jwt = require(ROOT + '/node_modules/jsonwebtoken');
  const { PrismaClient } = require(ROOT + '/node_modules/@prisma/client');
  const prisma = new PrismaClient();
  const B = 'http://localhost:5500/api';
  const adminTok = jwt.sign({ id: 1, email: 'a@b.com', name: 'A', role: 'admin' }, 't', { expiresIn: '1d' });

  let pass = 0, fail = 0;
  const check = (n, got, want) => {
    const ok = JSON.stringify(got) === JSON.stringify(want);
    ok ? pass++ : fail++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${ok ? '' : `  (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`}`);
  };
  const queues = async () => (await (await fetch(B + '/notifications', { headers: { Authorization: 'Bearer ' + adminTok } })).json()).queues;

  const q0 = await queues();
  check('queues are reported', q0 && typeof q0 === 'object', true);

  const pending = await prisma.consultation.count({ where: { status: { in: ['Pending', 'In Review'] } } });
  const apps = await prisma.doctorApplication.count({ where: { status: 'Pending' } });
  const untriaged = await prisma.report.count({ where: { category: null } });
  check('consultations badge matches the database', q0.consultations, pending);
  check('applications badge matches the database', q0.applications, apps);
  check('reports badge matches the database', q0.reports, untriaged);

  // Adding work raises the badge...
  const c = await prisma.consultation.create({ data: { patientName: 'Queue Probe', status: 'Pending' } });
  check('adding a pending consultation raises it', (await queues()).consultations, pending + 1);

  // ...and finishing the work lowers it again. This is the behaviour a work queue needs:
  // the number reflects the backlog, not whether anyone has glanced at the tab.
  await prisma.consultation.update({ where: { id: c.id }, data: { status: 'Completed' } });
  check('completing it lowers the badge again', (await queues()).consultations, pending);

  await prisma.consultation.deleteMany({ where: { patientName: 'Queue Probe' } });
  await prisma.$disconnect();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
