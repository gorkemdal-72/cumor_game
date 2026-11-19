-- AVATARLAR: kuşanılan avatar profilde tutulur. Supabase SQL Editor'da bir kez çalıştır.
alter table public.profiles add column if not exists equipped_avatar text default 'default';
