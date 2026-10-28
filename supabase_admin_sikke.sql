-- ADMİN SİKKE HEDİYESİ: bakiyeye atomik ekleme (aynı anda satın alma olsa bile bakiye karışmaz)
-- Supabase SQL Editor'da bir kez çalıştır.
create or replace function public.add_sikke(p_user_id uuid, p_amount int)
returns int
language plpgsql
as $$
declare
  new_balance int;
begin
  update public.profiles set sikke = sikke + p_amount
  where id = p_user_id
  returning sikke into new_balance;
  if not found then
    raise exception 'Kullanıcı bulunamadı!';
  end if;
  return new_balance;
end;
$$;

-- Sadece sunucu (service_role) çağırabilsin; yoksa herkes kendine sikke ekleyebilir
revoke execute on function public.add_sikke(uuid, int) from public, anon, authenticated;
grant execute on function public.add_sikke(uuid, int) to service_role;

