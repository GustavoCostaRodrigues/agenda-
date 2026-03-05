-- ==========================================================
-- AGENDA+ - USER SYNC (TRIGGER & MANUAL FIX)
-- ==========================================================

-- 1. FUNCTION to handle new user signup automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (email, name, role)
  VALUES (
    new.email, 
    COALESCE(new.raw_user_meta_data->>'name', 'Usuário Novo'), 
    COALESCE(new.raw_user_meta_data->>'role', 'staff')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TRIGGER to fire the function whenever a user is created in Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. MANUAL FIX for your current user (gustavo.shinko@gmail.com)
-- Execute this to link the existing Auth user to a Public Profile
INSERT INTO public.users (email, name, role)
VALUES ('gustavo.shinko@gmail.com', 'Gustavo Shinko', 'DEV')
ON CONFLICT (email) DO UPDATE 
SET role = 'DEV'; -- Garante que você tenha acesso de desenvolvedor
