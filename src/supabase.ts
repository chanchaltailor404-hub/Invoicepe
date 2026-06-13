import { createClient } from '@supabase/supabase-js';

function getValidUrl(url: any): string {
  if (typeof url !== 'string') return 'https://rjuyfwkhkhhfnnmznuiv.supabase.co';
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || !trimmed.startsWith('http')) {
    return 'https://rjuyfwkhkhhfnnmznuiv.supabase.co';
  }
  return trimmed.replace(/\/rest\/v1\/?$/, '');
}

function getValidKey(key: any): string {
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

const envUrl = (import.meta as any).env ? (import.meta as any).env.VITE_SUPABASE_URL : undefined;
const envKey = (import.meta as any).env ? (import.meta as any).env.VITE_SUPABASE_KEY : undefined;

const supabaseUrl = getValidUrl(envUrl);
const supabaseKey = getValidKey(envKey);

console.log('--- SUPABASE CLIENT INITIALIZATION ---');
console.log('Target URL:', supabaseUrl);
console.log('Target Key:', supabaseKey ? (supabaseKey.substring(0, 12) + '...') : 'undefined');
console.log('--------------------------------------');

export const supabase = createClient(supabaseUrl, supabaseKey);


