import { createClient } from '@supabase/supabase-js';

const rawUrl = 'https://rjuyfwkhkhhfnnmznuiv.supabase.co/rest/v1/';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '');
const supabaseKey = 'sb_publishable_JVCub2oI5GqSSCQu-gf_Kw_zsoLliBw';

export const supabase = createClient(supabaseUrl, supabaseKey);

