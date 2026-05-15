
-- 1. Add parent_id to business_categories
ALTER TABLE public.business_categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.business_categories(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_business_categories_parent_id ON public.business_categories(parent_id);

-- 2. Pivot table for multi-specialty
CREATE TABLE IF NOT EXISTS public.business_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  category_id uuid NOT NULL REFERENCES public.business_categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_business_subcategories_business ON public.business_subcategories(business_id);
CREATE INDEX IF NOT EXISTS idx_business_subcategories_category ON public.business_subcategories(category_id);

ALTER TABLE public.business_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read subcats of published"
  ON public.business_subcategories FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_subcategories.business_id AND b.is_published));

CREATE POLICY "owners manage own subcats"
  ON public.business_subcategories FOR ALL
  USING (public.owns_business(auth.uid(), business_id))
  WITH CHECK (public.owns_business(auth.uid(), business_id));

CREATE POLICY "admins manage all subcats"
  ON public.business_subcategories FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- 3. Seed parent categories
INSERT INTO public.business_categories (name, slug, emoji, sort_order, is_active, parent_id) VALUES
  ('Burgers', 'burgers', '🍔', 10, true, NULL),
  ('BBQ', 'bbq', '🍖', 20, true, NULL),
  ('Tacos & Mexican', 'tacos-mexican', '🌮', 30, true, NULL),
  ('Pizza', 'pizza', '🍕', 40, true, NULL),
  ('Chicken', 'chicken', '🍗', 50, true, NULL),
  ('Seafood', 'seafood', '🦞', 60, true, NULL),
  ('Sandwiches', 'sandwiches', '🥪', 70, true, NULL),
  ('Breakfast & Brunch', 'breakfast-brunch', '🥞', 80, true, NULL),
  ('Desserts', 'desserts', '🧁', 90, true, NULL),
  ('Coffee & Drinks', 'coffee-drinks', '☕', 100, true, NULL),
  ('International', 'international', '🌍', 110, true, NULL),
  ('Vegan & Healthy', 'vegan-healthy', '🥗', 120, true, NULL),
  ('Specialty Catering', 'specialty-catering', '🎉', 130, true, NULL)
ON CONFLICT (slug) DO NOTHING;

-- 4. Seed subcategories
DO $$
DECLARE
  desserts_id uuid;
  drinks_id uuid;
  intl_id uuid;
  burgers_id uuid;
  chicken_id uuid;
BEGIN
  SELECT id INTO desserts_id FROM public.business_categories WHERE slug='desserts';
  SELECT id INTO drinks_id   FROM public.business_categories WHERE slug='coffee-drinks';
  SELECT id INTO intl_id     FROM public.business_categories WHERE slug='international';
  SELECT id INTO burgers_id  FROM public.business_categories WHERE slug='burgers';
  SELECT id INTO chicken_id  FROM public.business_categories WHERE slug='chicken';

  INSERT INTO public.business_categories (name, slug, emoji, sort_order, is_active, parent_id) VALUES
    ('Ice Cream',     'ice-cream',     '🍦', 10, true, desserts_id),
    ('Mini Donuts',   'mini-donuts',   '🍩', 20, true, desserts_id),
    ('Crepes',        'crepes',        '🥞', 30, true, desserts_id),
    ('Funnel Cakes',  'funnel-cakes',  '🍰', 40, true, desserts_id),
    ('Churros',       'churros',       '🥨', 50, true, desserts_id),
    ('Coffee',        'coffee',        '☕', 10, true, drinks_id),
    ('Espresso',      'espresso',      '☕', 20, true, drinks_id),
    ('Smoothies',     'smoothies',     '🥤', 30, true, drinks_id),
    ('Boba',          'boba',          '🧋', 40, true, drinks_id),
    ('Lemonade',      'lemonade',      '🍋', 50, true, drinks_id),
    ('Colombian',     'colombian',     '🇨🇴', 10, true, intl_id),
    ('Cuban',         'cuban',         '🇨🇺', 20, true, intl_id),
    ('Jamaican',      'jamaican',      '🇯🇲', 30, true, intl_id),
    ('Thai',          'thai',          '🇹🇭', 40, true, intl_id),
    ('Indian',        'indian',        '🇮🇳', 50, true, intl_id),
    ('Mediterranean', 'mediterranean', '🫒', 60, true, intl_id),
    ('Smash Burgers', 'smash-burgers', '🍔', 10, true, burgers_id),
    ('Sliders',       'sliders',       '🍔', 20, true, burgers_id),
    ('Hot Chicken',   'hot-chicken',   '🌶️', 10, true, chicken_id),
    ('Wings',         'wings',         '🍗', 20, true, chicken_id)
  ON CONFLICT (slug) DO NOTHING;
END $$;
