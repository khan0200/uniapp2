-- ============================================================================
-- SQL Migration: Universities Shared Access, Redefining User Admin, and Seed 'sodiq'
-- Run this script in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Create Helper Function to check tenant of a user (New function)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_tenant(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT tenant_id FROM public.profiles
    WHERE id = user_id
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Redefine User Admin Security Definer Functions (Supports tenant boundaries)
-- ----------------------------------------------------------------------------

-- Drop old signatures to avoid parameter errors
DROP FUNCTION IF EXISTS public.create_new_user(TEXT, TEXT, TEXT, public.user_role);
DROP FUNCTION IF EXISTS public.create_new_user(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_new_user(TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_existing_user(UUID, TEXT, TEXT, TEXT, public.user_role);
DROP FUNCTION IF EXISTS public.update_existing_user(UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.delete_existing_user(UUID);

-- 1. Create User Function
CREATE OR REPLACE FUNCTION public.create_new_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT,
  p_tenant_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_catalog
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_password TEXT;
  v_caller_tenant TEXT;
BEGIN
  -- Determine caller tenant
  IF auth.uid() IS NOT NULL THEN
    -- Check if the current user calling this is a Manager or Head Manager
    IF public.get_user_role(auth.uid()) NOT IN ('Manager', 'Head Manager') THEN
      RAISE EXCEPTION 'Only Managers and Head Managers can create new users.';
    END IF;

    -- Only Head Managers can assign the Head Manager role
    IF p_role = 'Head Manager' AND public.get_user_role(auth.uid()) != 'Head Manager' THEN
      RAISE EXCEPTION 'Only Head Managers can create a user with the Head Manager role.';
    END IF;

    v_caller_tenant := public.get_user_tenant(auth.uid());
    IF v_caller_tenant IS NULL THEN
      RAISE EXCEPTION 'Caller tenant not found.';
    END IF;
  ELSE
    -- If run from database dashboard/migration (no auth session)
    v_caller_tenant := COALESCE(p_tenant_id, 'unibridge');
  END IF;

  -- Validate inputs
  IF p_email IS NULL OR p_email = '' THEN
    RAISE EXCEPTION 'Email is required.';
  END IF;
  IF p_password IS NULL OR p_password = '' THEN
    RAISE EXCEPTION 'Password is required.';
  END IF;
  IF p_full_name IS NULL OR p_full_name = '' THEN
    RAISE EXCEPTION 'Full name is required.';
  END IF;

  -- Generate encrypted password
  v_encrypted_password := crypt(p_password, gen_salt('bf'));

  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_password,
    NOW(),
    NULL,
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('full_name', p_full_name),
    FALSE,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- Update profiles table role, tenant_id, and details (it was created by on_auth_user_created trigger)
  UPDATE public.profiles
  SET role = p_role::public.user_role,
      full_name = p_full_name,
      tenant_id = v_caller_tenant
  WHERE id = v_user_id;

  RETURN v_user_id;
END;
$$;

-- 2. Update User Function
CREATE OR REPLACE FUNCTION public.update_existing_user(
  p_user_id UUID,
  p_email TEXT,
  p_password TEXT DEFAULT NULL,
  p_full_name TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_catalog
AS $$
BEGIN
  -- If authenticated user is calling, enforce tenant isolation
  IF auth.uid() IS NOT NULL THEN
    -- Check if the current user calling this is a Manager or Head Manager
    IF public.get_user_role(auth.uid()) NOT IN ('Manager', 'Head Manager') THEN
      RAISE EXCEPTION 'Only Managers and Head Managers can update users.';
    END IF;

    -- Standard Managers cannot modify Head Manager details
    IF public.get_user_role(p_user_id) = 'Head Manager' AND public.get_user_role(auth.uid()) != 'Head Manager' THEN
      RAISE EXCEPTION 'Managers cannot edit Head Manager profile or password.';
    END IF;

    -- Only Head Managers can assign the Head Manager role
    IF p_role = 'Head Manager' AND public.get_user_role(auth.uid()) != 'Head Manager' THEN
      RAISE EXCEPTION 'Only Head Managers can assign the Head Manager role.';
    END IF;

    -- Verify same tenant
    IF public.get_user_tenant(p_user_id) != public.get_user_tenant(auth.uid()) THEN
      RAISE EXCEPTION 'Cannot edit user from another tenant.';
    END IF;
  END IF;

  -- Update auth.users email & raw metadata
  UPDATE auth.users
  SET email = p_email,
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('full_name', COALESCE(p_full_name, raw_user_meta_data->>'full_name')),
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Update password if provided
  IF p_password IS NOT NULL AND p_password != '' THEN
    UPDATE auth.users
    SET encrypted_password = crypt(p_password, gen_salt('bf'))
    WHERE id = p_user_id;
  END IF;

  -- Update profile role, full_name, and email
  UPDATE public.profiles
  SET role = COALESCE(p_role::public.user_role, role),
      full_name = COALESCE(p_full_name, full_name),
      email = p_email,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- 3. Delete User Function
CREATE OR REPLACE FUNCTION public.delete_existing_user(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_catalog
AS $$
BEGIN
  -- If authenticated user is calling, enforce tenant isolation
  IF auth.uid() IS NOT NULL THEN
    -- Check if the current user calling this is a Manager or Head Manager
    IF public.get_user_role(auth.uid()) NOT IN ('Manager', 'Head Manager') THEN
      RAISE EXCEPTION 'Only Managers and Head Managers can delete users.';
    END IF;

    -- Standard Managers cannot delete Head Manager accounts
    IF public.get_user_role(p_user_id) = 'Head Manager' AND public.get_user_role(auth.uid()) != 'Head Manager' THEN
      RAISE EXCEPTION 'Managers cannot delete Head Manager accounts.';
    END IF;

    -- Prevent deleting yourself
    IF auth.uid() = p_user_id THEN
      RAISE EXCEPTION 'You cannot delete your own account.';
    END IF;

    -- Verify same tenant
    IF public.get_user_tenant(p_user_id) != public.get_user_tenant(auth.uid()) THEN
      RAISE EXCEPTION 'Cannot delete user from another tenant.';
    END IF;
  END IF;

  -- Delete from auth.users (cascades to public.profiles)
  DELETE FROM auth.users
  WHERE id = p_user_id;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. Trigger for Profiles on auth.users Signups (Updated to support default tenant)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'Admin', -- Default role
    COALESCE(NEW.raw_user_meta_data->>'tenant_id', 'unibridge') -- Default tenant
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Clean Up Universities Table & Setup Shared Access
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- 1. Drop old tenant-specific RLS policies (must happen before dropping the column they depend on)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'universities') THEN
    DROP POLICY IF EXISTS "universities: tenant select" ON public.universities;
    DROP POLICY IF EXISTS "universities: tenant modify" ON public.universities;
    DROP POLICY IF EXISTS "universities: shared select" ON public.universities;
    DROP POLICY IF EXISTS "universities: shared modify" ON public.universities;
  END IF;

  -- 2. Drop tenant_id column and defaults trigger on universities
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'universities') THEN
    ALTER TABLE public.universities DROP COLUMN IF EXISTS tenant_id;
    DROP TRIGGER IF EXISTS tr_set_univ_defaults ON public.universities;
  END IF;

  -- 3. Enable RLS and create the new shared RLS policies
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'universities') THEN
    ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "universities: shared select" ON public.universities FOR SELECT TO authenticated USING (true);
    CREATE POLICY "universities: shared modify" ON public.universities FOR ALL TO authenticated
      USING (public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'))
      WITH CHECK (public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Seed Initial Head Manager for New Tenant 'sodiq'
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'sodiq@gmail.com') THEN
    PERFORM public.create_new_user(
      'sodiq@gmail.com',     -- Email
      '00880088',            -- Password
      'SODIQ HEAD MANAGER',  -- Full Name
      'Head Manager',        -- Role
      'sodiq'                -- Tenant ID
    );
  END IF;
END $$;
