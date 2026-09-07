// Lightweight, dependency-free SEO — sets the document title, meta description, canonical,
// and Open Graph / Twitter tags per route. Renders nothing. Google renders the SPA and picks
// these up; social scrapers get the static defaults baked into index.html as a fallback.
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE = 'DBL International';
const DEFAULT_TITLE = 'DBL International — Trusted Cancer Second Opinion from Top Oncologists';
const DEFAULT_IMAGE = '/hero.png';

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', content);
}
function setLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) { el = document.createElement('link'); el.setAttribute('rel', rel); document.head.appendChild(el); }
  el.setAttribute('href', href);
}

export default function Seo({ title, description, image = DEFAULT_IMAGE, noindex = false }) {
  const { pathname } = useLocation();
  useEffect(() => {
    const full = title ? `${title} — ${SITE}` : DEFAULT_TITLE;
    const origin = window.location.origin;
    const url = origin + pathname;
    const img = image.startsWith('http') ? image : origin + image;
    document.title = full;
    if (description) setMeta('name', 'description', description);
    setMeta('property', 'og:site_name', SITE);
    setMeta('property', 'og:title', full);
    if (description) setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', img);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', full);
    if (description) setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', img);
    setLink('canonical', url);
    if (!noindex) return;
    setMeta('name', 'robots', 'noindex, follow');
    return () => document.head.querySelector('meta[name="robots"]')?.remove();
  }, [title, description, image, pathname, noindex]);
  return null;
}

// Per-route titles + descriptions for the static public pages, tuned for the terms patients
// actually search for. Detail pages (/oncologists/:id, /services/:id) set their own via <Seo>.
const SEO_MAP = {
  '/': { description: "Get an expert cancer second opinion online from India's leading oncologists. Upload your medical reports and receive a trusted specialist review of your diagnosis and treatment plan." },
  '/oncologists': { title: 'Expert Cancer Oncologists', description: 'Browse our panel of experienced medical, surgical and radiation oncologists providing trusted second opinions for cancer patients across India.' },
  '/services': { title: 'Oncology & Second Opinion Services', description: 'Cancer second opinions, treatment planning and clinical oncology pharmacy support — expert cancer care services from DBL International.' },
  '/how-it-works': { title: 'How It Works', description: 'Upload your medical reports, get them reviewed by a specialist oncologist, and receive a comprehensive second-opinion report in 24–48 hours.' },
  '/upload-reports': { title: 'Upload Your Reports for a Second Opinion', description: 'Securely upload your cancer diagnosis and medical reports to get an expert oncology second opinion from home. Your privacy is protected end-to-end.' },
  '/for-patients': { title: 'For Patients — Get a Second Opinion', description: 'Securely upload your cancer diagnosis and medical reports to get an expert oncology second opinion from home. Your privacy is protected end-to-end.' },
  '/pricing': { title: 'Pricing & Plans', description: 'Transparent, affordable pricing for expert cancer second opinions and online oncology consultations at DBL International.' },
  '/contact': { title: 'Contact Us', description: "Get in touch with DBL International for expert cancer second opinions, oncology support and patient care. We're here to help at every step." },
  '/resources': { title: 'Cancer Care Resources', description: "Articles, guides and expert insights on cancer diagnosis, treatment options and getting a second opinion — from DBL International's oncology team." },
  '/about': { title: 'About Us', description: "DBL International connects cancer patients with India's top oncologists for trusted second opinions and clinical oncology pharmacy support." },
  '/privacy': { title: 'Privacy Policy', description: 'How DBL International collects, uses and protects your personal and medical information.' },
  '/terms': { title: 'Terms & Conditions', description: "The terms governing your use of DBL International's cancer second-opinion services." },
};

// Mounted once inside the Router — applies SEO for known static routes; returns null on
// detail/private routes so the page (or the index.html defaults) takes over.
export function RouteSeo() {
  const { pathname } = useLocation();
  const meta = SEO_MAP[pathname];
  if (!meta) return null;
  return <Seo title={meta.title} description={meta.description} />;
}
