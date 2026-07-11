import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL 
  ? (import.meta.env.VITE_SUPABASE_URL.startsWith('http') 
      ? import.meta.env.VITE_SUPABASE_URL 
      : `https://${import.meta.env.VITE_SUPABASE_URL}.supabase.co`)
  : 'https://rjuyfwkhkhhfnnmznuiv.supabase.co';

const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_JVCub2oI5GqSSCQu-gf_Kw_zsoLliBw';

console.log("--- SUPABASE CLIENT INITIALIZATION ---");
console.log("Target URL:", supabaseUrl);
console.log("Target Key:", supabaseKey ? supabaseKey.substring(0, 12) + "..." : "undefined");
console.log("--------------------------------------");

export const supabase = createClient(supabaseUrl, supabaseKey);


