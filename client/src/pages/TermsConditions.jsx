import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';

const UPDATED = 'August 18, 2026';

const SECTIONS = [
  {
    h: '1. Agreement to Terms',
    body: [
      'These Terms & Conditions ("Terms") govern your access to and use of the DBL International website, platform, and services ("Services"). By using the Services, creating an account, submitting an application, or uploading medical reports, you confirm that you have read, understood, and agree to be bound by these Terms and our Privacy Policy. If you do not agree, please do not use the Services.',
      'In these Terms, "we", "us", and "our" refer to DBL International; "you" and "your" refer to the person using the Services, whether a patient, caregiver, doctor, or visitor.',
    ],
  },
  {
    h: '2. Nature of Our Services',
    body: [
      'DBL International provides clinical oncology pharmacy support and facilitates cancer second opinions by connecting patients with qualified, registered oncologists. A second opinion delivered through the Services is advisory and informational in nature and is intended to complement — not replace — the diagnosis, treatment, and ongoing care of your treating physician.',
    ],
    note: 'The Services do not constitute emergency medical care. If you are experiencing a medical emergency, call your local emergency number or go to the nearest hospital immediately.',
  },
  {
    h: '3. No Doctor–Patient Relationship; Informational Purpose',
    body: [
      'A remote second opinion provided through the Services is based solely on the medical records and information you submit and does not, by itself, establish a continuing doctor–patient relationship, nor does it involve a physical examination. The reviewing specialist does not take over your care or become your treating physician.',
      'Opinions are provided for your information and to help you make decisions together with your treating physician. You should not disregard, delay, or discontinue any treatment, or start any new treatment, solely on the basis of an opinion obtained through the Services without consulting your treating physician.',
    ],
  },
  {
    h: '4. Medical Disclaimer',
    body: [
      'Opinions represent the professional judgment of the reviewing specialist at the time of review, based only on the information and documents supplied. The quality and accuracy of any opinion depends on the accuracy, completeness, and legibility of the records you provide. Medical opinions can legitimately differ, and a second opinion may agree or disagree with your current diagnosis or treatment plan.',
      'We do not guarantee any particular diagnosis, result, cure, or outcome. Always consult your treating physician before acting on any information obtained through the Services.',
    ],
  },
  {
    h: '5. Eligibility',
    list: [
      'You must be at least 18 years old to create an account. Services for a minor or a person unable to consent must be requested and supervised by a parent, legal guardian, or authorized caregiver, who accepts these Terms on their behalf.',
      'If you submit records on behalf of another person, you confirm that you are authorized to do so and to consent to the processing of their information.',
      'Doctors applying to our expert panel must hold a valid, current medical registration and provide accurate professional credentials.',
      'You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.',
    ],
  },
  {
    h: '6. Consent to Process Personal & Health Information',
    body: [
      'Your medical reports and health information are sensitive personal data. By using the Services and uploading such information, you give your explicit, informed consent for DBL International and the reviewing specialists to collect, store, and process it for the purpose of providing the Services, in accordance with our Privacy Policy and applicable data-protection law, including the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000 and rules made thereunder.',
      'You may withdraw your consent or request deletion of your data as described in our Privacy Policy, subject to any records we are required to retain by law.',
    ],
  },
  {
    h: '7. Doctor Applications & Onboarding',
    body: [
      'Submitting an application through the "Join Our Network" form does not guarantee acceptance. Our medical board reviews each application, and approval is at our sole discretion. Approved doctors receive login credentials and agree to provide opinions professionally, ethically, within their scope of expertise, and in compliance with the applicable professional conduct regulations of the National Medical Commission (or their governing body) and these Terms.',
    ],
  },
  {
    h: '8. Your Responsibilities',
    list: [
      'Provide accurate, current, complete, and legible information and medical records.',
      'Use the Services only for lawful purposes and not to upload harmful, misleading, defamatory, or infringing content.',
      'Do not misuse the platform, attempt to gain unauthorized access to it, to other accounts, or to medical records, or interfere with its security or operation.',
      'Do not use the Services in any way that violates applicable laws or the rights of others.',
    ],
  },
  {
    h: '9. Fees, Payments & Refunds',
    body: [
      'Certain Services may be subject to fees, which will be disclosed to you before you incur them. Fees are payable through the payment methods made available on the platform. Unless expressly stated otherwise or required by applicable law, fees are non-refundable once a consultation or review has been delivered.',
      'If a paid Service cannot be delivered for reasons attributable to us, we will, at our discretion, re-perform the Service or provide a refund. Honorarium and payout terms for panel doctors are governed by a separate agreement.',
    ],
  },
  {
    h: '10. Intellectual Property',
    body: [
      'All content, branding, software, and materials on the platform are owned by DBL International or its licensors and are protected by applicable laws. You may not copy, reproduce, modify, or distribute them without prior written permission. You retain ownership of the medical documents you upload and grant us a limited, non-exclusive license to use them solely to provide the Services.',
    ],
  },
  {
    h: '11. Confidentiality & Data Protection',
    body: [
      'We treat your personal and medical information as confidential and handle it in accordance with our Privacy Policy and applicable data-protection law. We apply reasonable technical and organizational security measures to protect your data; however, no method of transmission or storage is completely secure, and we cannot guarantee absolute security.',
    ],
  },
  {
    h: '12. Telemedicine & Regulatory Compliance',
    body: [
      'To the extent the Services involve telemedicine, they are intended to be provided in a manner consistent with the Telemedicine Practice Guidelines, 2020 (issued under the Indian Medical Council Act / National Medical Commission framework) and other applicable healthcare regulations. Reviewing specialists exercise their independent professional judgment and may decline to provide an opinion where the information available is insufficient or where an in-person examination is necessary.',
    ],
  },
  {
    h: '13. Third-Party Services & Cross-Border Processing',
    body: [
      'The platform may rely on third-party providers (for example, secure hosting, storage, messaging, and communication services). Your information may be processed or stored in locations outside your country of residence, including by specialists and infrastructure in India and other jurisdictions, subject to appropriate safeguards. We are not responsible for the practices of third-party websites or services linked from the platform.',
    ],
  },
  {
    h: '14. Limitation of Liability',
    body: [
      'To the fullest extent permitted by law, DBL International, its officers, employees, and panel doctors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss arising from your reliance on an opinion, from decisions made together with your treating physician, or from your use of or inability to use the Services. Nothing in these Terms excludes or limits liability that cannot be excluded or limited under applicable law, including liability for death or personal injury caused by proven negligence, or for fraud.',
    ],
  },
  {
    h: '15. Indemnification',
    body: [
      'You agree to indemnify and hold harmless DBL International and its personnel from any claims, damages, liabilities, and reasonable expenses arising out of your breach of these Terms, your misuse of the Services, or your violation of any law or the rights of a third party.',
    ],
  },
  {
    h: '16. Termination',
    body: [
      'We may suspend or terminate access to the Services at our discretion, including for breach of these Terms or applicable law. You may stop using the Services at any time. Provisions that by their nature should survive termination — including those on intellectual property, confidentiality, disclaimers, limitation of liability, indemnification, and governing law — will continue to apply.',
    ],
  },
  {
    h: '17. Governing Law & Jurisdiction',
    body: [
      'These Terms are governed by and construed in accordance with the laws of India, without regard to conflict-of-laws principles. Subject to the Dispute Resolution section below, the courts at Kolkata, India shall have exclusive jurisdiction over any dispute arising out of or relating to these Terms or the Services.',
    ],
  },
  {
    h: '18. Dispute Resolution',
    body: [
      'In the event of any dispute, the parties will first attempt to resolve it amicably through good-faith discussion. If the dispute is not resolved within thirty (30) days, it may be referred to arbitration by a sole arbitrator under the Arbitration and Conciliation Act, 1996, seated at Kolkata, India, and conducted in English. This does not affect any rights you may have as a consumer under the Consumer Protection Act, 2019.',
    ],
  },
  {
    h: '19. Grievance Redressal',
    body: [
      'In accordance with applicable law, complaints regarding content, data, or the Services may be sent to our Grievance Officer at grievance@dblhealthcare.com. We will acknowledge complaints within the timelines prescribed by law and endeavour to resolve them promptly.',
    ],
  },
  {
    h: '20. General Provisions',
    list: [
      'If any provision of these Terms is found unenforceable, the remaining provisions will remain in full force and effect.',
      'These Terms, together with the Privacy Policy, constitute the entire agreement between you and us regarding the Services.',
      'Our failure to enforce any provision is not a waiver of that provision. You may not assign your rights under these Terms without our consent; we may assign ours in connection with a reorganization or transfer of the business.',
    ],
  },
  {
    h: '21. Changes to These Terms',
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
              <h2>22. Contact Us</h2>
              <p>
                Questions about these Terms? Reach us at{' '}
                <a href="mailto:legal@dblhealthcare.com">legal@dblhealthcare.com</a> or through our{' '}
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
