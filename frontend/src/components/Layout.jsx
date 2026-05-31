import { Outlet, NavLink, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Sparkles, Type, FileSpreadsheet, ListChecks, CheckCircle, XCircle, Loader } from 'lucide-react';
import apiClient from '../services/api.js';

export default function Layout() {
  const [status, setStatus] = useState('loading'); // loading | ok | error

  useEffect(() => {
    apiClient.health()
      .then(r => setStatus(r.groq_configured ? 'ok' : 'error'))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <>
      <header style={s.header}>
        <div className="container" style={s.inner}>
          <Link to="/" style={s.logo}>
            <div style={s.logoIcon}><Sparkles size={18} color="#1a1240" /></div>
            <div>
              <div style={s.logoName}>Roman Urdu AI</div>
              <div style={s.logoBy}>by DreamByte</div>
            </div>
          </Link>

          <nav style={s.nav}>
            <NL to="/" icon={<Type size={15}/>} label="Text Convert" />
            <NL to="/dataset" icon={<FileSpreadsheet size={15}/>} label="Dataset" />
            <NL to="/jobs" icon={<ListChecks size={15}/>} label="Jobs" />
          </nav>

          <div style={s.pill}>
            {status === 'loading' && <><Loader size={13} style={{animation:'spin .8s linear infinite'}}/> Connecting</>}
            {status === 'ok'      && <><CheckCircle size={13} color="var(--success)"/> Groq Ready</>}
            {status === 'error'   && <><XCircle size={13} color="var(--danger)"/> API Key Missing</>}
          </div>
        </div>
      </header>

      <main style={{ minHeight: 'calc(100vh - 130px)', padding: '36px 0' }}>
        <Outlet />
      </main>

      <footer style={s.footer}>
        <div className="container" style={s.footerInner}>
          <span>© 2026 DreamByte • Karachi 🇵🇰</span>
          <div style={{ display:'flex', gap:20 }}>
            <a href="https://console.groq.com/keys" target="_blank" rel="noopener">Get Groq Key</a>
            <a href="/docs" target="_blank" rel="noopener">API Docs</a>
          </div>
        </div>
      </footer>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

function NL({ to, icon, label }) {
  return (
    <NavLink to={to} end={to==='/'} style={({isActive}) => ({
      ...s.navItem,
      ...(isActive ? s.navActive : {}),
    })}>
      {icon}<span>{label}</span>
    </NavLink>
  );
}

const s = {
  header: {
    position:'sticky', top:0, zIndex:50,
    background:'rgba(10,6,32,.88)',
    backdropFilter:'blur(18px)',
    borderBottom:'1px solid var(--border)',
  },
  inner: {
    display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'14px 24px', gap:16, flexWrap:'wrap',
  },
  logo: { display:'flex', alignItems:'center', gap:11, color:'var(--text)' },
  logoIcon: {
    width:36, height:36,
    background:'linear-gradient(135deg,var(--gold),var(--gold-deep))',
    borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center',
    boxShadow:'0 4px 16px rgba(252,211,77,.28)',
  },
  logoName: { fontWeight:800, fontSize:15 },
  logoBy:   { fontSize:10, color:'var(--text-mute)', letterSpacing:'.06em' },
  nav: {
    display:'flex', gap:3,
    background:'var(--navy-darker)', padding:5, borderRadius:11,
    border:'1px solid var(--border)',
  },
  navItem: {
    display:'flex', alignItems:'center', gap:6,
    padding:'7px 13px', borderRadius:8,
    fontSize:13, fontWeight:500,
    color:'var(--text-mute)', textDecoration:'none',
    transition:'all .18s',
  },
  navActive: {
    background:'linear-gradient(135deg,var(--gold),var(--gold-deep))',
    color:'var(--navy-darker)', fontWeight:700,
  },
  pill: {
    display:'flex', alignItems:'center', gap:7,
    padding:'5px 13px', background:'var(--navy-darker)',
    borderRadius:999, border:'1px solid var(--border)',
    fontSize:12, color:'var(--text-mute)', fontWeight:500,
  },
  footer: {
    borderTop:'1px solid var(--border)',
    padding:'18px 0',
    background:'rgba(10,6,32,.5)',
  },
  footerInner: {
    display:'flex', justifyContent:'space-between',
    alignItems:'center', fontSize:12,
    color:'var(--text-mute)', flexWrap:'wrap', gap:10,
  },
};
