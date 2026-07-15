
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.media_type AS ENUM ('book', 'movie', 'tv');
CREATE TYPE public.tag_kind AS ENUM ('vibe', 'genre');
CREATE TYPE public.shelf_column AS ENUM ('priority', 'later', 'reading', 'done');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles (SEPARATE table, never on profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Auto-create profile + default 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Media items (shared catalog)
CREATE TABLE public.media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.media_type NOT NULL,
  title TEXT NOT NULL,
  year INT,
  external_id TEXT,        -- imdb id, google books volume id, etc
  cover_url TEXT,
  overview TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,  -- author, director, cast, runtime, page_count...
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (type, external_id)
);
GRANT SELECT, INSERT, UPDATE ON public.media_items TO authenticated;
GRANT ALL ON public.media_items TO service_role;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Media readable by authenticated" ON public.media_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can add media" ON public.media_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins update media" ON public.media_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_media_items_type ON public.media_items (type);
CREATE INDEX idx_media_items_title ON public.media_items (title);
CREATE TRIGGER trg_media_items_updated_at BEFORE UPDATE ON public.media_items
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Tags
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  kind public.tag_kind NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tags readable by authenticated" ON public.tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can add tags" ON public.tags FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Seed vibe & genre tags
INSERT INTO public.tags (slug, label, kind) VALUES
  ('cozy',        'Cozy',         'vibe'),
  ('rainy-day',   'Rainy Day',    'vibe'),
  ('mind-bending','Mind-bending', 'vibe'),
  ('nostalgic',   'Nostalgic',    'vibe'),
  ('slow-burn',   'Slow Burn',    'vibe'),
  ('bittersweet', 'Bittersweet',  'vibe'),
  ('warm',        'Warm',         'vibe'),
  ('melancholy',  'Melancholy',   'vibe'),
  ('whimsical',   'Whimsical',    'vibe'),
  ('escapist',    'Escapist',     'vibe'),
  ('literary',    'Literary',     'vibe'),
  ('atmospheric', 'Atmospheric',  'vibe'),
  ('fiction',     'Fiction',      'genre'),
  ('non-fiction', 'Non-fiction',  'genre'),
  ('mystery',     'Mystery',      'genre'),
  ('romance',     'Romance',      'genre'),
  ('sci-fi',      'Sci-Fi',       'genre'),
  ('fantasy',     'Fantasy',      'genre'),
  ('drama',       'Drama',        'genre'),
  ('comedy',      'Comedy',       'genre'),
  ('thriller',    'Thriller',     'genre');

-- Media <-> tags
CREATE TABLE public.media_tags (
  media_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  tag_id   UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  weight   NUMERIC NOT NULL DEFAULT 1.0,
  PRIMARY KEY (media_id, tag_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_tags TO authenticated;
GRANT ALL ON public.media_tags TO service_role;
ALTER TABLE public.media_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Media tags readable" ON public.media_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can tag media" ON public.media_tags FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update weights" ON public.media_tags FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can remove tags" ON public.media_tags FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE INDEX idx_media_tags_tag ON public.media_tags (tag_id);

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT,
  vibe_quote TEXT,
  consumed_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, media_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews readable by authenticated" ON public.reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own reviews (insert)" ON public.reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own reviews (update)" ON public.reviews FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users manage own reviews (delete)" ON public.reviews FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX idx_reviews_user ON public.reviews (user_id);
CREATE INDEX idx_reviews_media ON public.reviews (media_id);
CREATE INDEX idx_reviews_consumed_on ON public.reviews (user_id, consumed_on);
CREATE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Shelf items
CREATE TABLE public.shelf_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  column_key public.shelf_column NOT NULL DEFAULT 'later',
  position INT NOT NULL DEFAULT 0,
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, media_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shelf_items TO authenticated;
GRANT ALL ON public.shelf_items TO service_role;
ALTER TABLE public.shelf_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shelf own select" ON public.shelf_items FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Shelf own insert" ON public.shelf_items FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Shelf own update" ON public.shelf_items FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Shelf own delete" ON public.shelf_items FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX idx_shelf_user_col ON public.shelf_items (user_id, column_key, position);
CREATE TRIGGER trg_shelf_items_updated_at BEFORE UPDATE ON public.shelf_items
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- User tag preferences (vibe profile)
CREATE TABLE public.user_tag_preferences (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  affinity NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tag_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_tag_preferences TO authenticated;
GRANT ALL ON public.user_tag_preferences TO service_role;
ALTER TABLE public.user_tag_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prefs own select" ON public.user_tag_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Prefs own write" ON public.user_tag_preferences FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Recompute affinity from a user's high-rated reviews (rating >= 4).
CREATE OR REPLACE FUNCTION public.recompute_user_tag_preferences(_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.user_tag_preferences WHERE user_id = _user_id;
  INSERT INTO public.user_tag_preferences (user_id, tag_id, affinity)
  SELECT _user_id, mt.tag_id, SUM(mt.weight * (r.rating - 3))::NUMERIC
  FROM public.reviews r
  JOIN public.media_tags mt ON mt.media_id = r.media_id
  WHERE r.user_id = _user_id AND r.rating >= 4
  GROUP BY mt.tag_id
  HAVING SUM(mt.weight * (r.rating - 3)) > 0;
END;
$$;

-- Tag-overlap recommendations for a user, filtered to a media type,
-- requiring at least 2 shared VIBE tags.
CREATE OR REPLACE FUNCTION public.recommend_media(_user_id UUID, _type public.media_type, _limit INT DEFAULT 20)
RETURNS TABLE (media_id UUID, score NUMERIC, shared_vibes INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH prefs AS (
    SELECT p.tag_id, p.affinity, t.kind
    FROM public.user_tag_preferences p
    JOIN public.tags t ON t.id = p.tag_id
    WHERE p.user_id = _user_id
  ),
  seen AS (
    SELECT media_id FROM public.reviews WHERE user_id = _user_id
  )
  SELECT m.id AS media_id,
         SUM(prefs.affinity * mt.weight) AS score,
         COUNT(*) FILTER (WHERE prefs.kind = 'vibe')::INT AS shared_vibes
  FROM public.media_items m
  JOIN public.media_tags mt ON mt.media_id = m.id
  JOIN prefs ON prefs.tag_id = mt.tag_id
  WHERE m.type = _type
    AND m.id NOT IN (SELECT media_id FROM seen)
  GROUP BY m.id
  HAVING COUNT(*) FILTER (WHERE prefs.kind = 'vibe') >= 2
  ORDER BY score DESC
  LIMIT _limit;
$$;

-- Cross-media pairing: given a source media, find items of a different type
-- with the strongest vibe overlap.
CREATE OR REPLACE FUNCTION public.pair_cross_media(_source_id UUID, _limit INT DEFAULT 10)
RETURNS TABLE (media_id UUID, score NUMERIC, shared_vibes INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH src AS (
    SELECT type FROM public.media_items WHERE id = _source_id
  ),
  src_tags AS (
    SELECT mt.tag_id, mt.weight, t.kind
    FROM public.media_tags mt
    JOIN public.tags t ON t.id = mt.tag_id
    WHERE mt.media_id = _source_id
  )
  SELECT m.id,
         SUM(st.weight * mt.weight) AS score,
         COUNT(*) FILTER (WHERE st.kind = 'vibe')::INT AS shared_vibes
  FROM public.media_items m
  JOIN public.media_tags mt ON mt.media_id = m.id
  JOIN src_tags st ON st.tag_id = mt.tag_id
  WHERE m.type <> (SELECT type FROM src)
  GROUP BY m.id
  HAVING COUNT(*) FILTER (WHERE st.kind = 'vibe') >= 2
  ORDER BY score DESC
  LIMIT _limit;
$$;
