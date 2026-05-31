import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({ baseURL: `${BASE}/api`, timeout: 90000 });

export const apiClient = {
  health: () => api.get('/health').then(r => r.data),

  convertText: (text, source_language, target_language) =>
    api.post('/convert/text', { text, source_language, target_language }).then(r => r.data),

  uploadDataset: (file, onProgress) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/convert/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => onProgress && e.total && onProgress(Math.round(e.loaded / e.total * 100)),
    }).then(r => r.data);
  },

  startConversion: (job_id, text_columns, source_language, target_language) =>
    api.post('/convert/start', { job_id, text_columns, source_language, target_language }).then(r => r.data),

  getJob:    id => api.get(`/jobs/${id}`).then(r => r.data),
  listJobs:  ()  => api.get('/jobs').then(r => r.data),
  deleteJob: id  => api.delete(`/jobs/${id}`).then(r => r.data),

  downloadUrl: (job_id, fmt) => `${BASE}/api/convert/download/${job_id}?fmt=${fmt}`,
};

export default apiClient;
