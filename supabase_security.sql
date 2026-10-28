-- GÜVENLİK MİGRATION'I
-- ÖNCE: Sunucu ortamına SUPABASE_SERVICE_ROLE_KEY eklenmiş ve yeni kod deploy edilmiş olmalı.
-- (RLS açılınca anon key ile hiçbir şey okunamaz/yazılamaz; sunucu service_role ile RLS'i atlar.)

-- 1. Atomik satın alma: bakiye kontrolü + düşme + eşya ekleme tek transaction'da
--    (eskiden aynı anda iki istekle iki eşya tek fiyatına alınabiliyordu, eşya eklenemezse para iade edilmiyordu)
create or replace function public.buy_cosmetic(p_user_id uuid, p_cosmetic_id text, p_cosmetic_type text, p_price int)
returns void
language plpgsql
as $$
begin
  update public.profiles set sikke = sikke - p_price
  where id = p_user_id and sikke >= p_price;
  if not found then
    raise exception 'Yetersiz Sikke!';
  end if;

  insert into public.user_cosmetics (user_id, cosmetic_id, cosmetic_type)
  values (p_user_id, p_cosmetic_id, p_cosmetic_type);
exception
  when unique_violation then
    raise exception 'Bu eşyaya zaten sahipsiniz!'; -- blok geri alınır, sikke iade olur
end;
$$;

-- Fonksiyonu sadece sunucu (service_role) çağırabilsin; yoksa anon key ile fiyat 0 gönderilebilir
revoke execute on function public.buy_cosmetic(uuid, text, text, int) from public, anon, authenticated;
grant execute on function public.buy_cosmetic(uuid, text, text, int) to service_role;

-- 2. RLS'i aç (policy eklemiyoruz = anon/authenticated için tamamen kapalı; password_hash artık dışarıdan okunamaz)
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.game_history enable row level security;
alter table public.game_history_players enable row level security;
alter table public.user_cosmetics enable row level security;

-- KONTROL: hepsinde rls_acik = true olmalı
select tablename, rowsecurity as rls_acik from pg_tables where schemaname = 'public' order by 1;
