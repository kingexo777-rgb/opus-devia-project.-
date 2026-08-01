-- Base XP balance for all users
-- New accounts receive 1000 earned XP at signup.
-- Existing accounts with no XP balance receive 1000 earned XP.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name')
  );
  INSERT INTO public.user_xp (user_id, earned)
  VALUES (NEW.id, 1000);
  INSERT INTO public.user_performance (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Seed existing accounts that currently have no user_xp row.
INSERT INTO public.user_xp (user_id, earned, created_at, updated_at)
SELECT u.id, 1000, now(), now()
FROM public.users u
LEFT JOIN public.user_xp ux ON ux.user_id = u.id
WHERE ux.user_id IS NULL;

-- Seed existing accounts with zero total XP balance.
UPDATE public.user_xp ux
SET earned = 1000,
    updated_at = now()
FROM public.users u
WHERE ux.user_id = u.id
  AND (ux.earned + ux.purchased + ux.rollover) = 0;
