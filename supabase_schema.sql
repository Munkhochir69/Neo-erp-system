
-- ==========================================
-- NEO ERP - FULL DATABASE SCHEMA
-- ==========================================

-- ХЭРЭВ ТА ХУУЧИН ДАТАГАА ХАДГАЛЖ ҮЛДЭХИЙГ ХҮСВЭЛ ДООРХ "DROP" КОМАНДУУДЫГ АЛГАСААД
-- ЗӨВХӨН ЭНЭ ХЭСГИЙГ АЖИЛЛУУЛНА УУ:
-- ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS "lastStatusUpdate" TEXT;


-- 1. ЦЭВЭРЛЭГЭЭ (Өмнөх бүх хүснэгт, функцүүдийг устгах)
-- АНХААР: Энэ хэсэг бүх датаг устгана!
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.order_comments CASCADE;
DROP TABLE IF EXISTS public.restock_history CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.inventory_batches CASCADE;
DROP TABLE IF EXISTS public.inventory CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.restock_templates CASCADE;

-- 2. ХҮСНЭГТҮҮД ҮҮСГЭХ

-- 2.1 Users (Хэрэглэгчид)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT,
  "loginName" TEXT,
  role TEXT DEFAULT 'Sales Representative', -- Admin, Sales Manager, Sales Representative
  "isActive" BOOLEAN DEFAULT true,
  avatar TEXT,
  password TEXT -- App compatibility column (Supabase Auth handles real passwords)
);

-- 2.2 Inventory (Бараа материал)
CREATE TABLE public.inventory (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT,
  stock NUMERIC DEFAULT 0,
  "reorderPoint" NUMERIC DEFAULT 5,
  price NUMERIC DEFAULT 0,
  "originalCost" NUMERIC DEFAULT 0,
  "discountPrice" NUMERIC DEFAULT 0, -- Хөнгөлөх дүн
  "discountPercent" NUMERIC DEFAULT 0, -- Хөнгөлөх хувь
  "imageUrl" TEXT
);

-- 2.3 Inventory Batches (FIFO систем - Өртөг тооцоолол)
CREATE TABLE public.inventory_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id TEXT REFERENCES public.inventory(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.4 Orders (Захиалгууд)
CREATE TABLE public.orders (
  id TEXT PRIMARY KEY,
  "customerName" TEXT,
  "customerPhone" TEXT,
  "customerAddress" TEXT,
  district TEXT,
  "customerLink" TEXT,
  date TEXT,
  timestamp TEXT,
  amount NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Хүргэлтэнд гаргах',
  "repId" UUID REFERENCES public.users(id),
  items JSONB,
  "cancelledReason" TEXT,
  "paymentMethod" TEXT,
  "deliveryDriver" TEXT,
  "processedBy" TEXT,
  "lastStatusUpdate" TEXT, -- Шинээр нэмэгдсэн багана
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.5 Restock History (Татан авалтын түүх)
CREATE TABLE public.restock_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id TEXT REFERENCES public.inventory(id),
  item_name TEXT,
  quantity NUMERIC DEFAULT 0,
  cost_yuan NUMERIC DEFAULT 0,
  mnt_cost NUMERIC DEFAULT 0,
  exchange_rate NUMERIC DEFAULT 0,
  extra_costs JSONB DEFAULT '[]'::jsonb, -- Нэмэлт зардлууд (Тээвэр, татвар г.м)
  restock_date TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2.6 Order Comments (Захиалгын хэлэлцүүлэг)
CREATE TABLE public.order_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "orderId" TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
  "userId" UUID REFERENCES public.users(id),
  username TEXT,
  "userAvatar" TEXT,
  text TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now()
);

-- 2.7 Notifications (Мэдэгдэл)
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "userId" UUID REFERENCES public.users(id),
  title TEXT,
  message TEXT,
  "isRead" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  type TEXT DEFAULT 'system',
  "orderId" TEXT
);

-- 2.8 Restock Templates (Татан авалтын загварууд)
CREATE TABLE public.restock_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  costs JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. SECURITY (RLS - Row Level Security)
-- ERP систем тул нэвтэрсэн бүх хэрэглэгчдэд өгөгдөл харагдах эрхийг нээж байна.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restock_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for authenticated users" ON public.users FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.inventory FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.inventory_batches FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.restock_history FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.order_comments FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.notifications FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.restock_templates FOR ALL TO authenticated USING (true);

-- 4. АВТОМАТААР ХЭРЭГЛЭГЧ ҮҮСГЭХ ЛОГИК (Trigger)
-- Supabase Auth дээр бүртгүүлсэн эхний хэрэглэгчийг 'Admin', бусдыг нь 'Sales Representative' болгоно.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  is_first_user BOOLEAN;
BEGIN
  -- Public.users хүснэгт хоосон эсэхийг шалгах
  SELECT NOT EXISTS (SELECT 1 FROM public.users) INTO is_first_user;

  INSERT INTO public.users (id, username, "loginName", role, "isActive")
  VALUES (
    new.id,
    new.email, -- Default username
    new.email, -- Default login name
    CASE WHEN is_first_user THEN 'Admin' ELSE 'Sales Representative' END,
    true
  );
  return new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger үүсгэх (өмнөх нь байвал устгаад шинээр үүсгэнэ)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
