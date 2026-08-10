import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL || 'https://ddbxwyxgyjlpthenvbzc.supabase.co';
const key = process.env.SUPABASE_ANON_KEY || 'sb_publishable_kce73wwFdrmRfqtX0dWtHg_SAEcywz1';
const supabase = createClient(url, key);

const { data, error } = await supabase.from('students').select('id, ticket_id, ticket_number').limit(1).maybeSingle();
console.log(JSON.stringify({ data, error }, null, 2));

const { data: cols, error: colErr } = await supabase.rpc('pg_catalog_query', { query: "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='students' ORDER BY ordinal_position" }).catch(e => ({ data: null, error: e.toString() }));
console.log(JSON.stringify({ cols, colErr }, null, 2));
