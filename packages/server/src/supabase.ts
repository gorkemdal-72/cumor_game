import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project-ref.supabase.co';
// Sunucu service_role kullanmalı: RLS açıkken anon key hiçbir şeye erişemez (anon key sadece istemci içindir)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'your-anon-key';

if (!process.env.SUPABASE_URL) {
    console.warn('⚠️ SUPABASE_URL ortam değişkeni ayarlanmamış! Geçici URL kullanılıyor.');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY yok, anon key kullanılıyor. RLS açılırsa sunucu veritabanına erişemez!');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔗 Supabase istemcisi başarıyla başlatıldı!');
