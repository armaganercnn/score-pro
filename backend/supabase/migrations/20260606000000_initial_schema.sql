-- ==========================================
-- 1. EXTENSIONS & FUNCTIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper Function for Admin checks (Security Tightened)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ==========================================
-- 2. TABLES
-- ==========================================

-- users (standardized profile name)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  premium_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- admins
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- matches
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  match_date TIMESTAMP WITH TIME ZONE NOT NULL,
  league TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  total_odds NUMERIC(10,2) CHECK (total_odds > 0),
  is_premium BOOLEAN DEFAULT false NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'passive', 'won', 'lost', 'void')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- coupon_items
CREATE TABLE IF NOT EXISTS public.coupon_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  coupon_id UUID REFERENCES public.coupons ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches ON DELETE CASCADE,
  prediction TEXT NOT NULL,
  odds NUMERIC(10,2) NOT NULL CHECK (odds > 0),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'void')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- financial_transactions
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users ON DELETE RESTRICT, -- protect financial logs
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT DEFAULT 'TRY',
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'premium_purchase')),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- cms_pages
CREATE TABLE IF NOT EXISTS public.cms_pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  discount_percentage INTEGER CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users ON DELETE SET NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 3. TRIGGERS
-- ==========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'İsimsiz Kullanıcı'))
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email, 
    name = EXCLUDED.name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 4. ROW LEVEL SECURITY (RLS) & POLICIES
-- ==========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- ** users policies **
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins have full access to users" ON public.users FOR ALL USING (public.is_admin());

-- ** admins policies **
CREATE POLICY "Admins can read their own admin record" ON public.admins FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins have full access to admins table" ON public.admins FOR ALL USING (public.is_admin());

-- ** matches policies **
CREATE POLICY "Anyone can view matches" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Admins have full access to matches" ON public.matches FOR ALL USING (public.is_admin());

-- ** coupons policies (Public Access to metadata for kilitli view) **
CREATE POLICY "Coupons read access" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Admins have full access to coupons" ON public.coupons FOR ALL USING (public.is_admin());

-- ** coupon_items policies (Premium & Admin Restricted) **
CREATE POLICY "Coupon items read access" ON public.coupon_items FOR SELECT USING (
  public.is_admin()
  OR
  EXISTS (
    SELECT 1 FROM public.coupons c 
    WHERE c.id = public.coupon_items.coupon_id
    AND (
      c.is_premium = false 
      OR 
      EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() 
        AND u.premium_until > now()
      )
    )
  )
);
CREATE POLICY "Admins have full access to coupon_items" ON public.coupon_items FOR ALL USING (public.is_admin());

-- ** financial_transactions policies **
CREATE POLICY "Users can view their own transactions" ON public.financial_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions" ON public.financial_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins have full access to financial_transactions" ON public.financial_transactions FOR ALL USING (public.is_admin());

-- ** cms_pages policies **
CREATE POLICY "Anyone can view active cms pages" ON public.cms_pages FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admins have full access to cms_pages" ON public.cms_pages FOR ALL USING (public.is_admin());

-- ** campaigns policies **
CREATE POLICY "Anyone can view active campaigns" ON public.campaigns FOR SELECT USING (is_active = true OR public.is_admin());
CREATE POLICY "Admins have full access to campaigns" ON public.campaigns FOR ALL USING (public.is_admin());

-- ** support_tickets policies **
CREATE POLICY "Users can view their own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update (close) their own tickets" ON public.support_tickets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins have full access to support_tickets" ON public.support_tickets FOR ALL USING (public.is_admin());
