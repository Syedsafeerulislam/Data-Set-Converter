import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeftRight, Zap, Copy, Check, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../services/api.js';
import { LANG_OPTIONS, LANGUAGES, textStyle } from '../services/languages.js';

const EXAMPLES = [
  { src: 'urdu',       tgt: 'roman_urdu', text: 'میں ٹھیک ہوں، آپ کیسے ہیں؟' },
  { src: 'english',    tgt: 'roman_urdu', text: 'The government announced new economic policies.' },
  { src: 'roman_urdu', tgt: 'urdu',       text: 'main bahut khush hoon aaj kal.' },
  { src: 'roman_urdu', tgt: 'english',    text: 'ap kahan rehte hain? mujhe batao.' },
  { src: 'urdu',       tgt: 'english',    text: 'پاکستان میں بارش کا موسم شروع ہو گیا ہے۔' },
  { src: 'english',    tgt: 'urdu',       text: 'Today the weather is very pleasant in Karachi.' },
];

export default function ConvertPage() {
  const [srcLang, setSrcLang] = useState('urdu');
  const [tgtLang, setTgtLang] = useState('roman_urdu');
  const [input,   setInput]   = useState('میں ٹھیک ہوں، آپ کیسے ہیں؟');
  const [output,  setOutput]  = useState('');
  const [loading, setLoading] = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [autoSrc, setAutoSrc] = useState(true);   // use auto-detect for source

  const swap = () => {
    const prev = srcLang;
    setSrcLang(tgtLang);
    setTgtLang(prev);
    setInput(output || input);
    setOutput('');
  };

  const loadExample = (ex) => {
    setSrcLang(ex.src); setTgtLang(ex.tgt);
    setInput(ex.text);  setOutput('');
  };

  const convert = async () => {
    if (!input.trim()) { toast.error('Enter some text'); return; }
    if (srcLang === tgtLang) { toast.error('Source and target cannot be the same'); return; }
    setLoading(true); setOutput('');
    try {
      const res = await apiClient.convertText(
        input,
        autoSrc ? 'auto' : srcLang,
        tgtLang,
      );
      setOutput(res.converted);
      // update detected src
      if (autoSrc && res.source_language !== srcLang) {
        setSrcLang(res.source_language);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message);
    } finally { setLoading(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true); setTimeout(() => setCopied(false), 1800);
    toast.success('Copied!');
  };

  return (
    <div className="container fade-up" style={{ maxWidth: 1100 }}>
      {/* Header */}
      <div style={s.header}>
        <h1 style={s.h1}>
          Text <span className="gold-text">Converter</span>
        </h1>
        <p style={s.sub}>
          Convert between <b>Urdu</b>, <b>English</b>, and <b>Roman Urdu</b> — all 6 directions
        </p>
      </div>

      {/* Lang selector bar */}
      <div className="card" style={s.bar}>
        <LangPicker
          label="From"
          value={srcLang}
          onChange={v => { setSrcLang(v); setOutput(''); }}
          exclude={tgtLang}
          autoMode={autoSrc}
          onAutoToggle={() => setAutoSrc(p => !p)}
        />

        <button onClick={swap} className="btn btn-secondary" style={s.swapBtn} title="Swap languages">
          <ArrowLeftRight size={18} />
        </button>

        <LangPicker
          label="To"
          value={tgtLang}
          onChange={v => { setTgtLang(v); setOutput(''); }}
          exclude={srcLang}
        />
      </div>

      {/* Input / Output */}
      <div style={s.grid}>
        {/* Input */}
        <div className="card" style={s.panel}>
          <div style={s.panelHead}>
            <span style={s.panelLabel}>
              {LANGUAGES[srcLang]?.flag} {LANGUAGES[srcLang]?.label}
              {autoSrc && <span style={s.autoTag}>auto-detect</span>}
            </span>
            <button onClick={() => { setInput(''); setOutput(''); }} className="btn btn-ghost"
                    title="Clear" style={{ padding: '4px 8px', fontSize: 12 }}>
              <RotateCcw size={13} /> Clear
            </button>
          </div>
          <textarea
            value={input}
            onChange={e => { setInput(e.target.value); setOutput(''); }}
            placeholder={`Type or paste ${LANGUAGES[srcLang]?.label} text here…`}
            rows={9}
            style={{ ...s.textarea, ...textStyle(input) }}
            onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') convert(); }}
          />
          <div style={s.panelFoot}>
            <span style={{ color:'var(--text-dim)', fontSize:12 }}>
              {input.length} chars · Ctrl+Enter to convert
            </span>
            <button
              onClick={convert}
              disabled={loading || !input.trim() || srcLang === tgtLang}
              className="btn btn-primary"
            >
              {loading
                ? <><span className="spinner" /> Converting…</>
                : <><Zap size={15} /> Convert <ArrowRight size={14} /></>}
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="card" style={s.panel}>
          <div style={s.panelHead}>
            <span style={s.panelLabel}>
              {LANGUAGES[tgtLang]?.flag} {LANGUAGES[tgtLang]?.label}
            </span>
            {output && (
              <button onClick={copy} className="btn btn-ghost"
                      style={{ padding: '4px 8px', fontSize: 12 }}>
                {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
              </button>
            )}
          </div>
          <div style={{ ...s.outputBox, ...textStyle(output) }}>
            {loading
              ? <LoadingDots />
              : output
                ? output
                : <span style={{ color:'var(--text-dim)' }}>
                    Output appears here…
                  </span>
            }
          </div>
          <div style={s.panelFoot}>
            <span style={{ color:'var(--text-dim)', fontSize:12 }}>
              {output ? `${output.length} chars` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* 6 conversion examples */}
      <section style={{ marginTop: 40 }}>
        <h2 style={s.exTitle}>Try an example</h2>
        <div style={s.exGrid}>
          {EXAMPLES.map((ex, i) => (
            <motion.button
              key={i}
              className="card"
              onClick={() => loadExample(ex)}
              style={s.exCard}
              whileHover={{ scale: 1.02, borderColor: 'var(--border-strong)' }}
              whileTap={{ scale: 0.98 }}
            >
              <div style={s.exRoute}>
                <span style={s.exLang}>{LANGUAGES[ex.src]?.label}</span>
                <ArrowRight size={12} color="var(--gold-deep)" />
                <span style={s.exLang}>{LANGUAGES[ex.tgt]?.label}</span>
              </div>
              <p style={{ ...s.exText, ...textStyle(ex.text) }}>{ex.text}</p>
            </motion.button>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ── Lang picker ── */
function LangPicker({ label, value, onChange, exclude, autoMode, onAutoToggle }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <label style={{ margin:0 }}>{label}</label>
        {onAutoToggle && (
          <button
            onClick={onAutoToggle}
            style={{
              fontSize:11, fontWeight:600, padding:'2px 8px',
              borderRadius:999, border:'1px solid var(--border)',
              background: autoMode ? 'rgba(252,211,77,.12)' : 'transparent',
              color: autoMode ? 'var(--gold)' : 'var(--text-dim)',
              cursor:'pointer',
            }}
          >
            {autoMode ? '⚡ Auto' : '🔒 Manual'}
          </button>
        )}
      </div>
      <div style={{ display:'flex', gap:8 }}>
        {LANG_OPTIONS.map(l => (
          <button
            key={l.value}
            onClick={() => onChange(l.value)}
            disabled={l.value === exclude}
            style={{
              flex:1, padding:'10px 8px',
              borderRadius:10, fontSize:13, fontWeight:600,
              border:`1px solid ${l.value === value ? 'var(--gold)' : 'var(--border)'}`,
              background: l.value === value
                ? 'linear-gradient(135deg,var(--gold),var(--gold-deep))'
                : 'var(--navy-darker)',
              color: l.value === value ? 'var(--navy-darker)' : 'var(--text-mute)',
              opacity: l.value === exclude ? .35 : 1,
              cursor: l.value === exclude ? 'not-allowed' : 'pointer',
              transition:'all .18s',
            }}
          >
            {l.flag} {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <div style={{ display:'flex', gap:6, alignItems:'center', padding:'8px 0' }}>
      {[0,1,2].map(i => (
        <motion.div key={i}
          style={{ width:8, height:8, borderRadius:'50%', background:'var(--gold)' }}
          animate={{ opacity:[.2,1,.2], y:[0,-6,0] }}
          transition={{ duration:1, delay:i*.15, repeat:Infinity }}
        />
      ))}
      <span style={{ color:'var(--text-mute)', fontSize:13, marginLeft:4 }}>Translating…</span>
    </div>
  );
}

const s = {
  header: { textAlign:'center', marginBottom:28 },
  h1: { fontSize:'clamp(30px,5vw,48px)', fontWeight:800, letterSpacing:'-.02em', marginBottom:8 },
  sub: { color:'var(--text-mute)', fontSize:16 },

  bar: {
    display:'flex', alignItems:'flex-end', gap:14, marginBottom:20,
    flexWrap:'wrap',
  },
  swapBtn: { padding:'10px 14px', alignSelf:'flex-end', marginBottom:1 },

  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))', gap:18 },
  panel: { display:'flex', flexDirection:'column', gap:10, padding:18 },
  panelHead: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
  },
  panelLabel: { fontWeight:700, fontSize:15, display:'flex', alignItems:'center', gap:7 },
  autoTag: {
    fontSize:10, fontWeight:600, padding:'2px 7px',
    borderRadius:999, background:'rgba(252,211,77,.1)',
    color:'var(--gold)', border:'1px solid var(--border)',
    marginLeft:4,
  },
  textarea: {
    flex:1, resize:'vertical', minHeight:200,
    background:'var(--navy-darker)',
  },
  outputBox: {
    flex:1, minHeight:200, padding:13,
    background:'var(--navy-darker)',
    border:'1px solid var(--border)',
    borderRadius:10, fontSize:15, lineHeight:1.75,
    color:'var(--gold)',
    fontFamily:"'JetBrains Mono',monospace",
    whiteSpace:'pre-wrap', wordBreak:'break-word',
    overflowY:'auto',
  },
  panelFoot: {
    display:'flex', justifyContent:'space-between', alignItems:'center',
  },

  exTitle: { fontSize:20, fontWeight:700, marginBottom:14 },
  exGrid: {
    display:'grid',
    gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',
    gap:12,
  },
  exCard: {
    textAlign:'left', padding:14, cursor:'pointer',
    border:'1px solid var(--border)', borderRadius:12,
    background:'var(--navy-card)', transition:'all .2s',
  },
  exRoute: {
    display:'flex', alignItems:'center', gap:6,
    marginBottom:7,
  },
  exLang: {
    fontSize:11, fontWeight:700, color:'var(--gold)',
    background:'rgba(252,211,77,.1)',
    padding:'2px 8px', borderRadius:999,
  },
  exText: {
    fontSize:13, color:'var(--text-mute)',
    lineHeight:1.6,
    display:'-webkit-box', WebkitLineClamp:2,
    WebkitBoxOrient:'vertical', overflow:'hidden',
  },
};
