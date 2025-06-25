import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Estas son sus credenciales. Están correctas.
const SUPABASE_URL = 'https://xrxnmcyyfvkiwjbdaxcq.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhyeG5tY3l5ZnZraXdqYmRheGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyOTc0ODMsImV4cCI6MjA2NTg3MzQ4M30.v2Dald5hkkO39j3LNoU2_yHeAqqhh-BvtjgGcIS9_Tk';

// Se crea y se exporta el cliente de Supabase.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
