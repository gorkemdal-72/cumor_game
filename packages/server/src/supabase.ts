import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project-ref.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-anon-key';

if (!process.env.SUPABASE_URL) {
    console.warn('⚠️ SUPABASE_URL ortam değişkeni ayarlanmamış! Geçici URL kullanılıyor.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔗 Supabase istemcisi başarıyla başlatıldı!');
