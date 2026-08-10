import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

const UPDATED = 'August 10, 2026';

const SECTIONS = [
  {
    h: '1. Introduction',
    body: [
      'DBL International ("DBL", "we", "us", or "our") operates a clinical oncology pharmacy and cancer second-opinion platform. We are committed to protecting the privacy and security of the personal and medical information entrusted to us by patients, doctors, and visitors.',
      'This Privacy Policy explains what information we collect, how we use and safeguard it, and the choices you have. By using our website, submitting an application, or uploading medical reports, you agree to the practices described here.',
    ],
  },
  {
    h: '2. Information We Collect',
    list: [
      'Identity & contact details — name, email address, phone number, and country.',
      'Professional details (for doctors) — specialization, qualifications, medical registration number, years of experience, and the information you share in your application.',
      'Health information (for patients) — medical reports, diagnoses, and related documents you choose to upload for review.',
      'Technical data — IP address, browser type, device information, and usage analytics collected automatically as you use the site.',
    ],
  },
  {
    h: '3. How We Use Your Information',
    list: [
      'To review doctor applications and onboard approved specialists to our expert panel.',
      'To route patient reports to the appropriate oncologist and deliver second-opinion services.',
      'To communicate with you about your application, appointments, consultations, and support requests.',
      'To operate, secure, and improve our platform and comply with legal and regulatory obligations.',
    ],
  },
  {
    h: '4. Medical Data & Confidentiality',
    body: [
      'Medical records and health information are treated as strictly confidential. Access is limited to the assigned clinical team and authorized personnel on a need-to-know basis. We handle protected health information in line with applicable healthcare privacy standards, including HIPAA-aligned safeguards.',
    ],
  },
  {
    h: '5. How We Share Information',
    body: [
      'We do not sell your personal or medical information. We share information only with the oncologists and clinical staff involved in your care, with trusted service providers who help us operate the platform under confidentiality obligations, and where required by law.',
    ],
  },
  {
    h: '6. Data Security',
    body: [
      'We use administrative, technical, and physical safeguards — including encryption in transit, access controls, and secure storage — to protect your information. No method of transmission or storage is completely secure, but we continually work to protect your data and limit access to it.',
    ],
  },
  {
    h: '7. Data Retention',
    body: [
      'We retain personal and medical information only as long as necessary to provide our services, meet legal and regulatory requirements, resolve disputes, and enforce our agreements. When information is no longer needed, we securely delete or anonymize it.',
    ],
  },
  {
    h: '8. Your Rights',
    list: [
      'Access the personal information we hold about you.',
      'Request correction of inaccurate or incomplete information.',
      'Request deletion of your information, subject to legal and clinical record-keeping obligations.',
      'Withdraw consent or object to certain processing where applicable.',
    ],
  },
  {
    h: '9. Cookies & Analytics',
    body: [
      'We use essential cookies to run the site and limited analytics to understand usage and improve the experience. You can control cookies through your browser settings; disabling some cookies may affect functionality.',
    ],
  },
  {
    h: '10. Changes to This Policy',
    body: [
      'We may update this Privacy Policy from time to time. Material changes will be posted on this page with a revised "Last updated" date. Your continued use of the platform after changes take effect constitutes acceptance of the updated policy.',
    ],
  },
];

export default function PrivacyPolicy() {
  return (
    <>
      <Header />
      <section className="legal">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link> <span>›</span> Privacy Policy
          </nav>

          <header className="legal-head">
            <span className="jn-eyebrow">Legal</span>
            <h1>Privacy Policy</h1>
            <p className="legal-updated">Last updated: {UPDATED}</p>
            <p className="legal-lede">
              Your privacy and the confidentiality of your medical information matter to us. This policy describes how DBL International collects, uses, and protects your data.
            </p>
          </header>

          <div className="legal-body">
            {SECTIONS.map((sec) => (
              <div className="legal-section" key={sec.h}>
                <h2>{sec.h}</h2>
                {sec.body && sec.body.map((p, i) => <p key={i}>{p}</p>)}
                {sec.list && (
                  <ul>
                    {sec.list.map((li, i) => <li key={i}>{li}</li>)}
                  </ul>
                )}
              </div>
            ))}

            <div className="legal-section">
              <h2>11. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy or how your information is handled, contact us at{' '}
                <a href="mailto:privacy@dblinternational.com">privacy@dblinternational.com</a> or through our{' '}
                <Link to="/contact">Contact page</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
