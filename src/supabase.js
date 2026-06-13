import { createClient } from '@supabase/supabase-js';

function getValidUrl(url) {
  if (typeof url !== 'string') return 'https://rjuyfwkhkhhfnnmznuiv.supabase.co';
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || !trimmed.startsWith('http')) {
    return 'https://rjuyfwkhkhhfnnmznuiv.supabase.co';
  }
  return trimmed.replace(/\/rest\/v1\/?$/, '');
}

function getValidKey(key) {
  if (typeof key !== 'string') return 'sb_publishable_JVCub2oI5GqSSCQu-gf_Kw_zsoLliBw';
  const trimmed = key.trim();
  if (
    !trimmed || 
    trimmed === 'undefined' || 
    trimmed === 'null' || 
    trimmed === 'ap-south-1' || 
    trimmed.startsWith('MY_')
  ) {
    return 'sb_publishable_JVCub2oI5GqSSCQu-gf_Kw_zsoLliBw';
  }
  return trimmed;
}

const envUrl = import.meta.env ? import.meta.env.VITE_SUPABASE_URL : undefined;
const envKey = import.meta.env ? import.meta.env.VITE_SUPABASE_KEY : undefined;

const supabaseUrl = getValidUrl(envUrl);
const supabaseKey = getValidKey(envKey);

export const supabase = createClient(supabaseUrl, supabaseKey);

