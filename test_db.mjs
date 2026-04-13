import { createClient } from '@supabase/supabase-js'; 
import dotenv from 'dotenv'; 
dotenv.config({path: '.env.local'}); 

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL; 
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 
const supabase = createClient(supabaseUrl, supabaseAnonKey); 

async function test() { 
  const res = await supabase.from('evaluation_periods').select('*'); 
  console.log('Periods:', res); 
  const res2 = await supabase.from('vw_gap_analysis').select('*'); 
  console.log('Gaps:', res2); 
} 

test();
