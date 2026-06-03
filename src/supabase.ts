import { createClient } from '@supabase/supabase-js';

const rawUrl = 'https://rjuyfwkhkhhfnnmznuiv.supabase.co/rest/v1/';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '');
const supabaseKey = 'sb_publishable_JVCub2oI5GqSSCQu-gf_Kw_zsoLliBw';

console.log('--- SUPABASE CLIENT INITIALIZATION ---');
console.log('Target URL:', supabaseUrl);
console.log('Target Key:', supabaseKey.substring(0, 12) + '...');
console.log('--------------------------------------');

export const supabase = createClient(supabaseUrl, supabaseKey);


