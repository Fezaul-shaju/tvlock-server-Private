const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

// ===== এই তিনটা তোমার Supabase এর info দিয়ে বদলাও =====
const SUPABASE_URL = 'https://xxxx.supabase.co';
const SUPABASE_KEY = 'eyJhbGci...service_role_key...';
// =======================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// POST /activate — code দিয়ে TV activate করো
app.post('/activate', async (req, res) => {
  const { device_id, code } = req.body;
  if (!device_id || !code) 
    return res.json({ status: 'error', msg: 'Missing fields' });

  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('device_id', device_id)
    .eq('code', code.toUpperCase())
    .single();

  if (!data) return res.json({ status: 'invalid' });
  if (data.is_locked) return res.json({ status: 'locked' });

  const expired = new Date() > new Date(data.expires_at);
  if (expired) return res.json({ status: 'expired' });

  // Activation time update করো
  await supabase.from('devices')
    .update({ activated_at: new Date().toISOString() })
    .eq('id', data.id);

  res.json({ status: 'ok', expires: data.expires_at });
});

// GET /check/:device_id — daily license check
app.get('/check/:device_id', async (req, res) => {
  const { data } = await supabase
    .from('devices')
    .select('expires_at, is_locked')
    .eq('device_id', req.params.device_id)
    .single();

  if (!data || data.is_locked) 
    return res.json({ valid: false, reason: 'locked' });

  const valid = new Date() < new Date(data.expires_at);
  res.json({ valid, expires: data.expires_at });
});

// GET /health — server চলছে কিনা check করো
app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
