
-- 1. Өмнөх объектуудыг устгах (Цэвэр эхлэл)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.reps;
DROP TABLE IF EXISTS public.inventory;
DROP TABLE IF EXISTS public.users;

-- 2. Хэрэглэгчдийн хүснэгт (id нь заавал auth.users-тэй холбогдох албагүй)
CREATE TABLE public.users (
  id UUID PRIMARY KEY,
  username TEXT,
  "loginName" TEXT,
  role TEXT DEFAULT 'Sales Representative',
  "isActive" BOOLEAN DEFAULT true,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Бараа материалын хүснэгт
CREATE TABLE public.inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  stock INTEGER DEFAULT 0,
  "reorderPoint" INTEGER DEFAULT 5,
  price BIGINT DEFAULT 0,
  "originalCost" BIGINT DEFAULT 0,
  "imageUrl" TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Борлуулагчдын хүснэгт
CREATE TABLE public.reps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  region TEXT,
  avatar TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Захиалгын хүснэгт
CREATE TABLE public.orders (
  id TEXT PRIMARY KEY,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "customerAddress" TEXT,
  date DATE DEFAULT CURRENT_DATE,
  timestamp TIME DEFAULT CURRENT_TIME,
  amount BIGINT DEFAULT 0,
  profit BIGINT DEFAULT 0,
  status TEXT DEFAULT 'Илгээх',
  items JSONB DEFAULT '[]'::jsonb,
  "repId" TEXT,
  "processedBy" TEXT,
  "paymentMethod" TEXT,
  "deliveryDriver" TEXT,
  "cancelledReason" TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Аюулгүй байдлын тохиргоо (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all to authenticated" ON public.users FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to authenticated" ON public.inventory FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to authenticated" ON public.reps FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all to authenticated" ON public.orders FOR ALL TO authenticated USING (true);

-- 7. Trigger: Автомат профайл үүсгэх логик (Auth-аар орж ирсэн хэрэглэгчдэд)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  SELECT count(*) = 0 INTO is_first_user FROM public.users;
  
  INSERT INTO public.users (id, username, "loginName", role, "isActive")
  VALUES (
    new.id, 
    split_part(new.email, '@', 1), 
    split_part(new.email, '@', 1), 
    CASE WHEN is_first_user THEN 'Admin' ELSE 'Sales Representative' END, 
    true
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. Жишээ өгөгдөл оруулах
INSERT INTO public.inventory (id, name, sku, category, stock, "reorderPoint", price, "originalCost", "imageUrl") VALUES
('itm-1', 'Premium Tea', 'TEA-001', 'Ундаа', 15, 5, 12000, 8000, 'https://images.unsplash.com/photo-1544787210-2213d84ad960?q=80&w=300&h=300&auto=format&fit=crop'),
('itm-2', 'Organic Coffee', 'COF-002', 'Ундаа', 3, 5, 25000, 18000, 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?q=80&w=300&h=300&auto=format&fit=crop');
