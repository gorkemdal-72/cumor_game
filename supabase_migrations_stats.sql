-- 1. game_history_players tablosuna oyun içi istatistikleri ekliyoruz
ALTER TABLE public.game_history_players
ADD COLUMN IF NOT EXISTS sabotages_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS robbed_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trades_made INTEGER DEFAULT 0;

-- 2. profiles tablosuna oyuncunun kazandığı toplam ödülleri (başarımları) ekliyoruz
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS award_gaddar INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS award_sanssiz INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS award_borsa INTEGER DEFAULT 0;

-- 3. Profil istatistikleri + mağaza kolonları (schema'daki CREATE TABLE IF NOT EXISTS mevcut tabloya bunları eklemez)
ALTER TABLE public.game_history
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS total_vp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_playtime_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sikke INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS equipped_building TEXT DEFAULT 'default';

CREATE TABLE IF NOT EXISTS public.user_cosmetics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cosmetic_id TEXT NOT NULL,
    cosmetic_type TEXT NOT NULL,
    acquired_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, cosmetic_id)
);

-- 4. Misafir kazanan da kaydedilebilsin (adım 2'de kod tarafı bunu kullanacak)
ALTER TABLE public.game_history ALTER COLUMN winner_id DROP NOT NULL;

-- KONTROL: Çalıştırdıktan sonra kolonları listele
select table_name, column_name from information_schema.columns
where table_schema = 'public' and table_name in ('profiles', 'game_history', 'game_history_players')
order by 1, 2;
