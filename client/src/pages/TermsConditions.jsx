import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

const UPDATED = 'August 10, 2026';

const SECTIONS = [
  {
    h: '1. Agreement to Terms',
    body: [
      'These Terms & Conditions ("Terms") govern your access to and use of the DBL International website, platform, and services ("Services"). By using the Services, submitting an application, or uploading medical reports, you agree to be bound by these Terms. If you do not agree, please do not use the Services.',
    ],
  },
  {
    h: '2. Nature of Our Services',
    body: [
      'DBL International provides clinical oncology pharmacy support and facilitates cancer second opinions by connecting patients with qualified oncologists. A second opinion is intended to complement — not replace — the care of your treating physician.',
    ],
    note: 'The Services do not constitute emergency medical care. If you are experiencing a medical emergency, call your local emergency number or go to the nearest hospital immediately.',
  },
  {
    h: '3. Eligibility',
    list: [
      'You must be at least 18 years old, or use the Services under the supervision of a parent or legal guardian.',
      'Doctors applying to our expert panel must hold a valid medical registration and provide accurate professional credentials.',
      'You are responsible for maintaining the confidentiality of any account credentials issued to you.',
    ],
  },
  {
    h: '4. Doctor Applications & Onboarding',
    body: [
      'Submitting an application through the "Join Our Network" form does not guarantee acceptance. Our medical board reviews each application, and approval is at our sole discretion. Approved doctors receive login credentials and agree to provide opinions professionally, ethically, and within their scope of expertise.',
    ],
  },
  {
    h: '5. User Responsibilities',
    list: [
      'Provide accurate, current, and complete information.',
      'Use the Services only for lawful purposes and not to upload harmful, misleading, or infringing content.',
      'Do not attempt to gain unauthorized access to the platform, other accounts, or medical records.',
    ],
  },
  {
    h: '6. Medical Disclaimer',
    body: [
      'Opinions provided through the Services are based on the information and documents supplied and represent the professional judgment of the reviewing specialist at that time. They are not a guarantee of any particular outcome. Always consult your treating physician before making decisions about your care.',
    ],
  },
  {
    h: '7. Fees & Payments',
    body: [
      'Certain Services may be subject to fees, which will be disclosed before you incur them. Unless stated otherwise, fees are non-refundable once a consultation or review has been delivered. Honorarium and payout terms for panel doctors are governed by a separate agreement.',
    ],
  },
  {
    h: '8. Intellectual Property',
    body: [
      'All content, branding, and materials on the platform are owned by DBL International or its licensors and are protected by applicable laws. You may not copy, reproduce, or distribute them without prior written permission. You retain ownership of the medical documents you upload and grant us a limited license to use them solely to provide the Services.',
    ],
  },
  {
    h: '9. Confidentiality & Privacy',
    body: [
      'We handle personal and medical information in accordance with our Privacy Policy. By using the Services, you consent to the practices described there.',
    ],
  },
  {
    h: '10. Limitation of Liability',
    body: [
      'To the fullest extent permitted by law, DBL International shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Services. Nothing in these Terms limits liability that cannot be excluded under applicable law.',
    ],
  },
  {
    h: '11. Termination',
    body: [
      'We may suspend or terminate access to the Services at our discretion, including for breach of these Terms. You may stop using the Services at any time. Provisions that by their nature should survive termination will continue to apply.',
    ],
  },
  {
    h: '12. Changes to These Terms',
    body: [
      'We may update these Terms from time to time. Material changes will be posted on this page with a revised "Last updated" date. Your continued use of the Services after changes take effect constitutes acceptance of the updated Terms.',
    ],
  },
];

export default function TermsConditions() {
  return (
    <>
      <Header />
      <section className="legal">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link> <span>›</span> Terms &amp; Conditions
          </nav>

          <header className="legal-head">
            <span className="jn-eyebrow">Legal</span>
            <h1>Terms &amp; Conditions</h1>
            <p className="legal-updated">Last updated: {UPDATED}</p>
            <p className="legal-lede">
              Please read these Terms carefully before using DBL International. They set out the rules for using our platform and services.
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
                {sec.note && <p className="legal-note">{sec.note}</p>}
              </div>
            ))}

            <div className="legal-section">
              <h2>13. Contact Us</h2>
              <p>
                Questions about these Terms? Reach us at{' '}
                <a href="mailto:legal@dblinternational.com">legal@dblinternational.com</a> or through our{' '}
                <Link to="/contact">Contact page</Link>. See also our{' '}
                <Link to="/privacy">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
