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
