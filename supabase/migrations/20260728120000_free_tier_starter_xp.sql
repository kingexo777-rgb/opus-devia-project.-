-- Add starter XP for free-tier users so they can use mentor chat without changing billing manager logic.
-- Update the auth signup trigger to seed a small earned XP balance for new users.
-- Also seed existing free-tier users who currently have zero XP.

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
  VALUES (NEW.id, 120);
  INSERT INTO public.user_performance (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Give starter XP to existing free-tier users with no XP balance.
UPDATE public.user_xp ux
SET earned = 120,
    updated_at = now()
FROM public.users u
WHERE ux.user_id = u.id
  AND u.tier = 'free'
  AND (ux.earned + ux.purchased + ux.rollover) = 0;
