-- 1. Tabloları Oluştur
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text,
  premium_until timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.coupons (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text not null,
  match_time timestamp with time zone not null,
  expires_at timestamp with time zone not null,
  is_premium boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.contact_messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete set null,
  name text not null,
  email text not null,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Yeni kullanıcı kayıt olduğunda profile tablosuna otomatik ekleme yapan tetikleyici (Trigger)
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Row Level Security (RLS) Aktifleştir
alter table public.profiles enable row level security;
alter table public.coupons enable row level security;
alter table public.contact_messages enable row level security;

-- 4. Güvenlik Kuralları (Policies)

-- Profil: Herkes kendi profilini görebilir ve güncelleyebilir.
create policy "Kullanıcılar kendi profilini görebilir" on public.profiles
  for select using ( auth.uid() = id );
create policy "Kullanıcılar kendi profilini güncelleyebilir" on public.profiles
  for update using ( auth.uid() = id );

-- Kuponlar: Sadece süresi geçmemiş kuponlar okunabilir. 
-- Ücretsiz kullanıcılar sadece "is_premium = false" olanları görür.
-- Premium süresi devam eden kullanıcılar tüm süresi geçmemiş kuponları görür.
create policy "Kupon okuma kuralı" on public.coupons
  for select using (
    expires_at > now() 
    and (
      is_premium = false 
      or 
      (auth.uid() in (
        select id from public.profiles 
        where premium_until > now()
      ))
    )
  );

-- İletişim: Herkes mesaj gönderebilir.
create policy "Herkes iletişim mesajı gönderebilir" on public.contact_messages
  for insert with check ( true );

-- (Not: Kupon ekleme, düzenleme ve silme işlemleri için Admin RLS kuralları 
-- sonradan yönetici paneli üzerinden eklenebilir veya Supabase Service Role Key kullanılabilir.)
