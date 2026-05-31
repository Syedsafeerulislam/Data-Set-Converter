import { useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileSpreadsheet, Play, Download,
  CheckCircle2, AlertCircle, Loader2, RefreshCw, X, ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '../services/api.js';
import { LANG_OPTIONS, LANGUAGES } from '../services/languages.js';

const STEPS = ['upload', 'configure', 'processing', 'done'];

export default function DatasetPage() {
  const [step,    setStep]    = useState('upload');
  const [job,     setJob]     = useState(null);
  const [srcLang, setSrcLang] = useState('auto');
  const [tgtLang, setTgtLang] = useState('roman_urdu');
  const [cols,    setCols]    = useState([]);
  const [uploading, setUp]    = useState(false);
  const [uploadPct, setUpPct] = useState(0);
  const [error,   setError]   = useState(null);
  const pollRef = useRef(null);

  // ── upload ──────────────────────────────────────────────────────
  const onDrop = async ([file]) => {
    if (!file) return;
    setUp(true); setError(null);
    try {
      const res = await apiClient.uploadDataset(file, setUpPct);
      setJob(res);
      // smart default cols
      const smartCols = res.preview?.length
        ? Object.keys(res.preview[0]).filter(c =>
            res.preview.some(r => typeof r[c]==='string' && r[c].length>10))
        : [];
      setCols(smartCols);
      setSrcLang(res.detected_language || 'auto');
      setStep('configure');
      toast.success(`${res.total_rows.toLocaleString()} rows ready`);
    } catch (e) {
      const msg = e.response?.data?.detail || e.message;
      setError(msg); toast.error(msg);
    } finally { setUp(false); setUpPct(0); }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: false,
    accept: {
      'text/csv': ['.csv'],
      'text/tab-separated-values': ['.tsv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
  });

  // ── start ───────────────────────────────────────────────────────
  const start = async () => {
    if (!cols.length) { toast.error('Select at least one column'); return; }
    if (srcLang !== 'auto' && srcLang === tgtLang) {
      toast.error('Source and target cannot be the same'); return;
    }
    try {
      await apiClient.startConversion(job.job_id, cols, srcLang, tgtLang);
      setStep('processing');
      poll(job.job_id);
    } catch (e) { toast.error(e.response?.data?.detail || e.message); }
  };

  // ── poll ────────────────────────────────────────────────────────
  const poll = id => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const j = await apiClient.getJob(id);
        setJob(p => ({ ...p, ...j }));
        if (j.status === 'completed') {
          clearInterval(pollRef.current);
          setStep('done');
          toast.success('✅ Conversion complete!');
        } else if (j.status === 'failed') {
          clearInterval(pollRef.current);
          setError(j.error);
          toast.error(j.error || 'Conversion failed');
          setStep('configure');
        }
      } catch {}
    }, 1800);
  };

  useEffect(() => () => pollRef.current && clearInterval(pollRef.current), []);

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStep('upload'); setJob(null); setCols([]);
    setSrcLang('auto'); setTgtLang('roman_urdu'); setError(null);
  };

  return (
    <div className="container fade-up">
      <div style={s.hdr}>
        <h1 style={s.h1}>Dataset <span className="gold-text">Converter</span></h1>
        <p style={s.sub}>Upload CSV or Excel → choose languages → download converted CSV + Excel</p>
      </div>

      <Stepper current={step} />

      <AnimatePresence mode="wait">

        {/* ── UPLOAD ── */}
        {step === 'upload' && (
          <motion.div key="upload" {...anim}>
            <div {...getRootProps()} style={{
              ...s.dropzone,
              ...(isDragActive ? s.dropActive : {}),
              ...(uploading ? { opacity:.65, pointerEvents:'none' } : {}),
            }}>
              <input {...getInputProps()} />
              <div style={s.dropIcon}>
                {uploading
                  ? <Loader2 size={36} color="#1a1240" style={{animation:'spin 1s linear infinite'}}/>
                  : <Upload size={36} color="#1a1240"/>}
              </div>
              <h3 style={s.dropTitle}>
                {uploading ? `Uploading… ${uploadPct}%` : isDragActive ? 'Drop it!' : 'Drag & drop your file'}
              </h3>
              <p style={s.dropSub}>CSV, TSV, XLSX, XLS  ·  Any language  ·  Max 150 MB</p>
              {uploading && (
                <div style={s.progWrap}>
                  <div style={{ ...s.progBar, width:`${uploadPct}%` }} />
                </div>
              )}
            </div>

            {error && <Err msg={error} />}

            <div style={s.hint}>
              💡 Supports Urdu (Nastaliq), English, and Roman Urdu datasets.
              Works with both comma-separated and tab-separated files.
            </div>
          </motion.div>
        )}

        {/* ── CONFIGURE ── */}
        {step === 'configure' && job && (
          <motion.div key="configure" {...anim}>
            <div style={s.cfgGrid}>
              {/* File info */}
              <div className="card">
                <h3 style={s.cardTitle}>📋 File Info</h3>
                <InfoRow label="File"      v={job.filename} />
                <InfoRow label="Rows"      v={job.total_rows.toLocaleString()} />
                <InfoRow label="Columns"   v={job.columns.length} />
                <InfoRow label="Detected"  v={<span className="badge">{job.detected_language}</span>} />
              </div>

              {/* Language settings */}
              <div className="card">
                <h3 style={s.cardTitle}>🌐 Language Settings</h3>

                <label>Source language (input)</label>
                <select value={srcLang} onChange={e => setSrcLang(e.target.value)} style={{marginBottom:14}}>
                  <option value="auto">🔍 Auto-detect</option>
                  {LANG_OPTIONS.map(l => (
                    <option key={l.value} value={l.value}>{l.flag} {l.label}</option>
                  ))}
                </select>

                <label>Target language (output)</label>
                <select value={tgtLang} onChange={e => setTgtLang(e.target.value)}>
                  {LANG_OPTIONS.map(l => (
                    <option key={l.value} value={l.value}
                            disabled={l.value === srcLang && srcLang !== 'auto'}>
                      {l.flag} {l.label}
                    </option>
                  ))}
                </select>

                {srcLang !== 'auto' && srcLang !== tgtLang && (
                  <div style={s.convRoute}>
                    {LANGUAGES[srcLang]?.label}
                    <ArrowRight size={14}/>
                    {LANGUAGES[tgtLang]?.label}
                  </div>
                )}
              </div>

              {/* Column picker */}
              <div className="card">
                <h3 style={s.cardTitle}>
                  📊 Text Columns ({cols.length}/{job.columns.length})
                </h3>
                <p style={{ fontSize:12, color:'var(--text-mute)', marginBottom:10 }}>
                  Select which columns to convert. Others are kept as-is.
                </p>
                <div style={s.colList}>
                  {job.columns.map(c => {
                    const on = cols.includes(c);
                    return (
                      <label key={c} style={{ ...s.colItem, ...(on ? s.colOn : {}) }}>
                        <input type="checkbox" checked={on}
                          style={{ width:'auto', accentColor:'var(--gold)' }}
                          onChange={() => setCols(p =>
                            p.includes(c) ? p.filter(x => x!==c) : [...p, c]
                          )}
                        />
                        <span style={{ fontSize:13 }}>{c}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Preview */}
            <PreviewTable rows={job.preview} />

            {error && <Err msg={error} />}

            <div style={s.actions}>
              <button onClick={reset} className="btn btn-secondary">
                <X size={15}/> Cancel
              </button>
              <button onClick={start} className="btn btn-primary"
                      disabled={!cols.length || (srcLang!=='auto' && srcLang===tgtLang)}>
                <Play size={15}/> Start Conversion
              </button>
            </div>
          </motion.div>
        )}

        {/* ── PROCESSING ── */}
        {step === 'processing' && job && (
          <motion.div key="processing" {...anim}
            className="card" style={{ textAlign:'center', padding:48 }}>
            <Loader2 size={52} color="var(--gold)" style={{animation:'spin 1.2s linear infinite'}}/>
            <h3 style={{ fontSize:24, fontWeight:700, margin:'18px 0 6px' }}>
              Converting…
            </h3>
            <p style={{ color:'var(--text-mute)', marginBottom:22 }}>
              {(job.processed_rows||0).toLocaleString()} / {job.total_rows.toLocaleString()} rows
            </p>
            <div style={s.barWrap}>
              <motion.div
                style={s.bar}
                animate={{ width:`${job.progress||0}%` }}
                transition={{ ease:'easeOut', duration:.4 }}
              />
            </div>
            <div style={{ fontSize:13, color:'var(--gold)', fontWeight:600, marginTop:8 }}>
              {Math.round(job.progress||0)}%
            </div>
            <p style={{ marginTop:16, fontSize:12, color:'var(--text-dim)' }}>
              {LANGUAGES[job.source_language]?.label || job.source_language}
              {' → '}
              {LANGUAGES[job.target_language]?.label || job.target_language}
              {' · '}
              Groq {job.source_language} batches
            </p>
          </motion.div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && job && (
          <motion.div key="done" {...anim}>
            <div className="card" style={{ textAlign:'center', padding:36 }}>
              <CheckCircle2 size={56} color="var(--success)" style={{ margin:'0 auto 16px' }}/>
              <h2 style={{ fontSize:28, fontWeight:800, marginBottom:8 }}>
                Done! 🎉
              </h2>
              <p style={{ color:'var(--text-mute)', marginBottom:28 }}>
                {job.total_rows.toLocaleString()} rows converted from{' '}
                <b>{LANGUAGES[job.source_language]?.label}</b> to{' '}
                <b>{LANGUAGES[job.target_language]?.label}</b>
              </p>

              <div style={{ display:'flex', justifyContent:'center', gap:12, flexWrap:'wrap' }}>
                <a href={apiClient.downloadUrl(job.job_id, 'csv')}
                   className="btn btn-primary" download style={{ fontSize:15 }}>
                  <FileSpreadsheet size={18}/> Download CSV
                </a>
                <a href={apiClient.downloadUrl(job.job_id, 'excel')}
                   className="btn btn-secondary" download style={{ fontSize:15 }}>
                  <Download size={18}/> Download Excel
                </a>
              </div>
            </div>

            <PreviewTable rows={job.preview} title="Preview — first 20 rows (converted)" />

            <div style={s.actions}>
              <button onClick={reset} className="btn btn-secondary">
                <RefreshCw size={15}/> Convert Another File
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

/* ── helpers ── */
const anim = {
  initial: { opacity:0, y:12  },
  animate: { opacity:1, y:0   },
  exit:    { opacity:0, y:-12 },
};

function Stepper({ current }) {
  const idx = STEPS.indexOf(current);
  return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:4, marginBottom:30, flexWrap:'wrap' }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ display:'flex', alignItems:'center' }}>
          <div style={{
            width:32, height:32, borderRadius:'50%', display:'flex',
            alignItems:'center', justifyContent:'center',
            fontWeight:700, fontSize:12,
            background: i === idx ? 'var(--gold)' : i < idx ? 'rgba(252,211,77,.2)' : 'var(--navy-darker)',
            border: `2px solid ${i <= idx ? 'var(--gold)' : 'var(--border)'}`,
            color: i === idx ? 'var(--navy-darker)' : i < idx ? 'var(--gold)' : 'var(--text-dim)',
          }}>
            {i < idx ? '✓' : i+1}
          </div>
          <span style={{
            margin:'0 8px 0 6px', fontSize:12, fontWeight:600, textTransform:'capitalize',
            color: i <= idx ? 'var(--gold)' : 'var(--text-dim)',
          }}>{s}</span>
          {i < STEPS.length-1 && (
            <div style={{ width:40, height:2, background: i<idx ? 'var(--gold)' : 'var(--border)' }} />
          )}
        </div>
      ))}
    </div>
  );
}

function InfoRow({ label, v }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'9px 0',
                  borderBottom:'1px solid var(--border)', fontSize:14 }}>
      <span style={{ color:'var(--text-mute)' }}>{label}</span>
      <span style={{ fontWeight:600 }}>{v}</span>
    </div>
  );
}

function PreviewTable({ rows, title='Preview — first 10 rows' }) {
  if (!rows?.length) return null;
  const cols = Object.keys(rows[0]);
  const isU = s => typeof s === 'string' && /[\u0600-\u06FF]/.test(s);
  return (
    <div className="card" style={{ marginTop:18, padding:0, overflow:'hidden' }}>
      <div style={{ padding:'12px 18px', background:'var(--navy-darker)',
                    fontWeight:700, fontSize:13, borderBottom:'1px solid var(--border)' }}>
        {title}
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c} style={{
                  padding:'9px 13px', textAlign:'left',
                  background:'var(--navy-darker)',
                  color: c.includes('_roman')||c.includes('_urdu')||c.includes('_english')
                    ? 'var(--gold)' : 'var(--text-mute)',
                  fontWeight:700, fontSize:11, textTransform:'uppercase',
                  letterSpacing:'.05em', borderBottom:'1px solid var(--border)',
                  whiteSpace:'nowrap',
                }}>
                  {c}{c.includes('_roman')||c.includes('_urdu')||c.includes('_english') ? ' ✨' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0,20).map((r,i) => (
              <tr key={i} style={{ background: i%2 ? 'rgba(0,0,0,.12)' : 'transparent' }}>
                {cols.map(c => (
                  <td key={c} style={{
                    padding:'9px 13px',
                    borderBottom:'1px solid rgba(252,211,77,.04)',
                    maxWidth:320, lineHeight: isU(r[c]) ? 2 : 1.5,
                    fontFamily: isU(r[c]) ? "'Noto Nastaliq Urdu',serif" : 'inherit',
                    direction: isU(r[c]) ? 'rtl' : 'ltr',
                    color: (c.includes('_roman')||c.includes('_urdu')||c.includes('_english'))
                      ? 'var(--gold)' : 'var(--text)',
                    fontSize: isU(r[c]) ? 14 : 12,
                  }}>
                    {String(r[c]??'').slice(0,240)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Err({ msg }) {
  return (
    <div style={{
      marginTop:14, padding:'11px 15px',
      background:'rgba(248,113,113,.08)', border:'1px solid rgba(248,113,113,.25)',
      borderRadius:10, color:'var(--danger)',
      display:'flex', alignItems:'center', gap:9, fontSize:13,
    }}>
      <AlertCircle size={16}/> {msg}
    </div>
  );
}

const s = {
  hdr: { textAlign:'center', marginBottom:28 },
  h1:  { fontSize:'clamp(28px,5vw,44px)', fontWeight:800, letterSpacing:'-.02em', marginBottom:8 },
  sub: { color:'var(--text-mute)', fontSize:15 },

  dropzone: {
    border:'2px dashed var(--border-strong)', borderRadius:16,
    padding:'55px 24px', textAlign:'center', cursor:'pointer',
    background:'rgba(252,211,77,.025)', transition:'all .25s',
  },
  dropActive: {
    background:'rgba(252,211,77,.07)',
    borderColor:'var(--gold)', transform:'scale(1.01)',
  },
  dropIcon: {
    width:72, height:72, margin:'0 auto 14px',
    background:'linear-gradient(135deg,var(--gold),var(--gold-deep))',
    borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
    boxShadow:'0 0 40px rgba(252,211,77,.28)',
  },
  dropTitle: { fontSize:20, fontWeight:700, marginBottom:6 },
  dropSub:   { color:'var(--text-mute)', fontSize:13 },
  progWrap:  { width:'55%', maxWidth:280, margin:'16px auto 0', height:5,
               background:'var(--navy-darker)', borderRadius:3, overflow:'hidden' },
  progBar:   { height:'100%', background:'var(--gold)', transition:'width .2s' },

  hint: {
    marginTop:16, padding:'12px 16px', fontSize:13,
    color:'var(--text-mute)',
    background:'rgba(96,165,250,.06)',
    border:'1px solid rgba(96,165,250,.18)',
    borderRadius:10,
  },

  cfgGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:16, marginBottom:16 },
  cardTitle: { fontSize:16, fontWeight:700, marginBottom:14 },

  convRoute: {
    display:'flex', alignItems:'center', gap:8, marginTop:10,
    padding:'7px 12px', background:'rgba(252,211,77,.08)',
    borderRadius:8, fontSize:13, fontWeight:600, color:'var(--gold)',
  },

  colList: {
    display:'flex', flexDirection:'column', gap:5,
    maxHeight:200, overflowY:'auto',
    padding:6, background:'var(--navy-darker)', borderRadius:10,
  },
  colItem: {
    display:'flex', alignItems:'center', gap:9,
    padding:'7px 10px', borderRadius:8, cursor:'pointer',
    transition:'all .15s', border:'1px solid transparent',
  },
  colOn: {
    background:'rgba(252,211,77,.08)',
    border:'1px solid var(--border-strong)',
  },

  actions: { display:'flex', justifyContent:'flex-end', gap:10, marginTop:20 },

  barWrap: {
    width:'100%', height:10, background:'var(--navy-darker)',
    borderRadius:5, overflow:'hidden', maxWidth:420, margin:'0 auto',
  },
  bar: {
    height:'100%',
    background:'linear-gradient(90deg,var(--gold-deep),var(--gold))',
    borderRadius:5,
  },
};
