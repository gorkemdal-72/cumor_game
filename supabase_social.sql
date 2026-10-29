-- ARKADAŞLIK + PROFİL GİZLİLİĞİ + ŞİFREMİ UNUTTUM
-- Supabase SQL Editor'da çalıştır (yeni kodu deploy etmeden ÖNCE). Tekrar çalıştırmak zararsız.

-- 0. DÜZELTME: Boş (NULL) sikke bakiyeleri. NULL >= 0 karşılaştırması yanlış döndüğü için
--    admin ücretsiz alımda bile "Yetersiz Sikke!" alıyordu; hediye de NULL'a eklenemiyordu.
UPDATE public.profiles SET sikke = 0 WHERE sikke IS NULL;
ALTER TABLE public.profiles ALTER COLUMN sikke SET DEFAULT 0;
ALTER TABLE public.profiles ALTER COLUMN sikke SET NOT NULL;

-- 1. Profil görünürlüğü: herkese açık / sadece arkadaşlar / gizli
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile_visibility TEXT NOT NULL DEFAULT 'public'
  CHECK (profile_visibility IN ('public', 'friends', 'private'));

-- 2. Arkadaşlık: requester istek gönderir, addressee kabul edince status = 'accepted'
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (requester_id, addressee_id),
    CHECK (requester_id <> addressee_id)
);
CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON public.friendships (addressee_id);

-- Diğer tablolar gibi: sadece sunucu (service_role) erişir
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- 3. ŞİFREMİ UNUTTUM: e-postayla gönderilen 6 haneli kodun özeti (düz kod saklanmaz), son kullanma ve deneme sayısı
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS reset_code_hash TEXT,
ADD COLUMN IF NOT EXISTS reset_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reset_attempts INTEGER NOT NULL DEFAULT 0;

-- KONTROL
select column_name from information_schema.columns where table_name = 'profiles' and column_name in ('profile_visibility', 'reset_code_hash', 'reset_expires_at', 'reset_attempts')
union all
select 'friendships tablosu: ' || count(*) from information_schema.tables where table_name = 'friendships';
