import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Download, RefreshCw, Inbox, FileSpreadsheet } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../services/api.js';
import { LANGUAGES } from '../services/languages.js';

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setJobs(await apiClient.listJobs()); }
    catch { toast.error('Could not load jobs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const remove = async id => {
    if (!confirm('Delete this job?')) return;
    try { await apiClient.deleteJob(id); setJobs(j => j.filter(x => x.job_id !== id)); toast.success('Deleted'); }
    catch { toast.error('Delete failed'); }
  };

  return (
    <div className="container fade-up">
      <div style={s.hdr}>
        <div>
          <h1 style={s.h1}>Conversion <span className="gold-text">Jobs</span></h1>
          <p style={s.sub}>All past and active dataset conversions</p>
        </div>
        <button onClick={load} className="btn btn-secondary"><RefreshCw size={15}/> Refresh</button>
      </div>

      {loading ? (
        <div style={s.empty}><div className="spinner"/></div>
      ) : !jobs.length ? (
        <div style={s.empty}>
          <Inbox size={44} color="var(--text-dim)"/>
          <h3 style={{ fontWeight:600, marginTop:12 }}>No jobs yet</h3>
          <p style={{ color:'var(--text-mute)', margin:'6px 0 16px' }}>Upload a dataset to get started</p>
          <Link to="/dataset" className="btn btn-primary"><FileSpreadsheet size={15}/> Convert a Dataset</Link>
        </div>
      ) : (
        <div style={s.grid}>
          {jobs.map((j, i) => (
            <motion.div key={j.job_id} className="card" style={s.card}
              initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
              transition={{ delay: i*0.04 }}>
              <div style={s.cardHead}>
                <div>
                  <div style={s.fname}>{j.filename}</div>
                  <div style={s.jid}>#{j.job_id}</div>
                </div>
                <StatusBadge status={j.status}/>
              </div>

              <div style={s.meta}>
                <span>{j.total_rows?.toLocaleString() || '—'} rows</span>
                <span>·</span>
                <span>{LANGUAGES[j.source_language]?.label || j.source_language}</span>
                <span>→</span>
                <span>{LANGUAGES[j.target_language]?.label || j.target_language}</span>
                <span>·</span>
                <span>{new Date(j.created_at).toLocaleString()}</span>
              </div>

              {j.status === 'processing' && (
                <div style={s.progWrap}>
                  <div style={{ ...s.prog, width:`${j.progress}%` }}/>
                </div>
              )}

              {j.status === 'failed' && (
                <div style={{ fontSize:12, color:'var(--danger)',
                              padding:'7px 10px', borderRadius:7,
                              background:'rgba(248,113,113,.08)', marginTop:4 }}>
                  ⚠ {j.error}
                </div>
              )}

              <div style={s.cardFoot}>
                {j.status === 'completed' && <>
                  <a href={apiClient.downloadUrl(j.job_id,'csv')} className="btn btn-primary"
                     download style={{ flex:1, justifyContent:'center', fontSize:13 }}>
                    <Download size={13}/> CSV
                  </a>
                  <a href={apiClient.downloadUrl(j.job_id,'excel')} className="btn btn-secondary"
                     download style={{ flex:1, justifyContent:'center', fontSize:13 }}>
                    <Download size={13}/> Excel
                  </a>
                </>}
                <button onClick={() => remove(j.job_id)} className="btn btn-ghost" title="Delete">
                  <Trash2 size={15}/>
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const m = {
    uploaded:   ['#a78bfa','rgba(167,139,250,.15)','Uploaded'],
    processing: ['var(--gold)','rgba(252,211,77,.15)','Processing'],
    completed:  ['var(--success)','rgba(74,222,128,.15)','Done ✓'],
    failed:     ['var(--danger)','rgba(248,113,113,.15)','Failed'],
  }[status] || ['#888','rgba(128,128,128,.1)','Unknown'];
  return (
    <span style={{
      padding:'3px 10px', borderRadius:999, fontSize:11, fontWeight:700,
      color:m[0], background:m[1], textTransform:'uppercase', letterSpacing:'.05em',
    }}>{m[2]}</span>
  );
}

const s = {
  hdr:  { display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:14, marginBottom:28 },
  h1:   { fontSize:36, fontWeight:800, letterSpacing:'-.02em' },
  sub:  { color:'var(--text-mute)', marginTop:5, fontSize:14 },
  empty:{ textAlign:'center', padding:60, display:'flex', flexDirection:'column', alignItems:'center' },
  grid: { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 },
  card: { display:'flex', flexDirection:'column', gap:10 },
  cardHead: { display:'flex', justifyContent:'space-between', alignItems:'flex-start' },
  fname:{ fontWeight:700, fontSize:14, wordBreak:'break-all' },
  jid:  { fontSize:10, color:'var(--text-dim)', fontFamily:"'JetBrains Mono',monospace", marginTop:2 },
  meta: { fontSize:11, color:'var(--text-mute)', display:'flex', gap:6, flexWrap:'wrap' },
  progWrap:{ height:5, background:'var(--navy-darker)', borderRadius:3, overflow:'hidden' },
  prog: { height:'100%', background:'var(--gold)', transition:'width .3s' },
  cardFoot:{ display:'flex', gap:7, marginTop:4 },
};
