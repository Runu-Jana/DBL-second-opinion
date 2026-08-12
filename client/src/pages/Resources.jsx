import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { useLang } from '../i18n.jsx';
import { api } from '../api.js';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Ico = {
  cal: <svg viewBox="0 0 24 24" width="14" height="14" {...S}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></svg>,
  clock: <svg viewBox="0 0 24 24" width="14" height="14" {...S}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  search: <svg viewBox="0 0 24 24" width="18" height="18" {...S}><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>,
  play: <svg viewBox="0 0 24 24" width="30" height="30" fill="#fff"><circle cx="12" cy="12" r="11" opacity="0.3" /><path d="m10 8 6 4-6 4V8Z" /></svg>,
  send: <svg viewBox="0 0 24 24" width="16" height="16" {...S}><path d="M4 12 20 4l-6 16-3-7-7-1Z" /></svg>,
};

const CATS = ['All', 'Cancer Guide', 'Patient Stories', 'Expert Insights', 'News & Updates', 'Videos & Podcasts'];
const CAT_KEY = { All: 'res.all', 'Cancer Guide': 'res.cancerGuide', 'Patient Stories': 'res.patientStories', 'Expert Insights': 'res.expertInsights', 'News & Updates': 'res.news', 'Videos & Podcasts': 'res.videos' };
const FALLBACK = [
  { category: 'Cancer Guide', title: 'Understanding Your Cancer Diagnosis', excerpt: 'A comprehensive guide to help you understand your diagnosis and what comes next.', date: '10 May, 2025', readTime: '5 min read', imageUrl: '/blog-1.jpg' },
  { category: 'Expert Insights', title: 'The Role of Second Opinion in Cancer Care', excerpt: 'Why a second opinion can make a big difference in your treatment journey.', date: '08 May, 2025', readTime: '6 min read', imageUrl: '/blog-2.jpg' },
  { category: 'Patient Stories', title: 'A Journey of Hope and Strength', excerpt: 'Real stories from patients who faced cancer and came out stronger.', date: '05 May, 2025', readTime: '4 min read', imageUrl: '/blog-3.jpg' },
  { category: 'News & Updates', title: 'Latest Advances in Cancer Treatment', excerpt: 'Stay updated with the latest breakthroughs and innovations in oncology.', date: '02 May, 2025', readTime: '7 min read', imageUrl: '/blog-4.jpg' },
  { category: 'Cancer Guide', title: 'Nutrition & Diet During Cancer Treatment', excerpt: 'Foods that help boost immunity and support your recovery.', date: '30 Apr, 2025', readTime: '5 min read', imageUrl: '/blog-5.jpg' },
  { category: 'Expert Insights', title: 'Mental Wellness for Cancer Patients', excerpt: 'Tips and strategies to manage stress and improve mental well-being.', date: '28 Apr, 2025', readTime: '6 min read', imageUrl: '/blog-6.jpg' },
  { category: 'Patient Stories', title: 'Overcoming Challenges with the Right Support', excerpt: 'How expert guidance and family support make a difference.', date: '25 Apr, 2025', readTime: '4 min read', imageUrl: '/blog-7.jpg' },
  { category: 'Videos & Podcasts', title: 'Webinar: Immunotherapy Explained', excerpt: 'Our expert oncologists explain how immunotherapy works.', date: '22 Apr, 2025', readTime: 'Watch Now', imageUrl: '/blog-8.jpg', isVideo: true },
];

export default function Resources() {
  const { t } = useLang();
  const catLabel = (c) => (CAT_KEY[c] ? t(CAT_KEY[c]) : c);
  const [cat, setCat] = useState('All');
  const [posts, setPosts] = useState(FALLBACK);

  useEffect(() => {
    api('/blog', { auth: false }).then((d) => { if (Array.isArray(d)) setPosts(d); }).catch(() => {});
  }, []);

  const list = cat === 'All' ? posts : posts.filter((p) => p.category === cat);
  const counts = {};
  posts.forEach((p) => { counts[p.category] = (counts[p.category] || 0) + 1; });

  return (
    <>
      <Header active="resources" />
      <section className="rs">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb"><Link to="/">{t('nav.home')}</Link> <span>›</span> <Link to="/resources">{t('res.resources')}</Link> <span>›</span> {t('res.blogsStories')}</nav>

          <div className="rs-head">
            <h1>{t('res.h1')}</h1>
            <p>{t('res.sub')}</p>
          </div>

          <div className="chip-row">
            {CATS.map((c) => <button key={c} type="button" className={'chip' + (cat === c ? ' active' : '')} onClick={() => setCat(c)}>{catLabel(c)}</button>)}
          </div>

          <div className="rs-layout">
            <div className="rs-main">
            <div className="rs-grid">
              {list.map((p, i) => (
                <article className="rs-card" key={p.id || i}>
                  {p.isVideo && p.videoUrl ? (
                    <a className="rs-thumb rs-thumb-link" href={p.videoUrl} target="_blank" rel="noreferrer" aria-label={`Watch: ${p.title}`}>
                      {p.imageUrl && <img src={p.imageUrl} alt={p.title} loading="lazy" />}
                      <span className="rs-play">{Ico.play}</span>
                    </a>
                  ) : (
                    <div className="rs-thumb">
                      {p.imageUrl && <img src={p.imageUrl} alt={p.title} loading="lazy" />}
                      {p.isVideo && <span className="rs-play">{Ico.play}</span>}
                    </div>
                  )}
                  <div className="rs-body">
                    <span className="rs-cat">{catLabel(p.category)}</span>
                    <h3>{p.title}</h3>
                    <p>{p.excerpt}</p>
                    <div className="rs-meta"><span>{Ico.cal} {p.date}</span><span>{Ico.clock} {p.readTime}</span></div>
                  </div>
                </article>
              ))}
            </div>
            <div className="rs-pager">
              {['‹', '1', '2', '3', '…', '10', '›'].map((n, i) => <button key={i} type="button" className={'rs-page' + (n === '1' ? ' active' : '')}>{n}</button>)}
            </div>
            </div>

            <aside className="rs-side">
              <div className="rs-search"><span>{Ico.search}</span><input placeholder={t('res.searchArticles')} /></div>
              <div className="dash-card">
                <div className="dash-card-head"><h2>{t('res.categories')}</h2></div>
                <ul className="rs-cats">
                  {CATS.filter((c) => c !== 'All').map((c) => <li key={c}><button type="button" onClick={() => setCat(c)}>{catLabel(c)}<span>{counts[c] || 0}</span></button></li>)}
                </ul>
              </div>
              <div className="dash-card rs-quote">
                <h2>{t('res.inspiringStories')}</h2>
                <blockquote>{t('res.quote')}</blockquote>
                <p className="rs-quote-by"><strong>— Neha Verma</strong><br />{t('res.quoteBy')}</p>
              </div>
              <div className="rs-news">
                <h2>{t('res.stayInformed')}</h2>
                <p>{t('res.newsletterSub')}</p>
                <form onSubmit={(e) => e.preventDefault()}>
                  <input placeholder={t('res.emailPlaceholder')} />
                  <button type="submit" className="btn">{t('res.subscribe')} {Ico.send}</button>
                </form>
              </div>
            </aside>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
