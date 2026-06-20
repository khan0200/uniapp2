-- ============================================================
-- User Management Security Definer Functions
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Add 'Head Manager' value to the user_role enum
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'Head Manager';

-- Drop old signatures to avoid overloads with enum types
DROP FUNCTION IF EXISTS public.create_new_user(TEXT, TEXT, TEXT, public.user_role);
DROP FUNCTION IF EXISTS public.create_new_user(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_existing_user(UUID, TEXT, TEXT, TEXT, public.user_role);
DROP FUNCTION IF EXISTS public.update_existing_user(UUID, TEXT, TEXT, TEXT, TEXT);

-- Drop and recreate RLS policies on profiles table for Head Manager support
DROP POLICY IF EXISTS "profiles: manager full select" ON public.profiles;
CREATE POLICY "profiles: manager full select"
  ON public.profiles
  FOR SELECT
  USING (public.get_user_role(auth.uid()) IN ('Manager', 'Head Manager'));

DROP POLICY IF EXISTS "profiles: manager full update" ON public.profiles;
CREATE POLICY "profiles: manager full update"
  ON public.profiles
  FOR UPDATE
  USING (
    public.get_user_role(auth.uid()) = 'Head Manager' OR 
    (public.get_user_role(auth.uid()) = 'Manager' AND public.get_user_role(id) != 'Head Manager')
  );

-- 1. Create User Function
CREATE OR REPLACE FUNCTION public.create_new_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_catalog
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_password TEXT;
BEGIN
  -- Check if the current user calling this is a Manager or Head Manager
  IF public.get_user_role(auth.uid()) NOT IN ('Manager', 'Head Manager') THEN
    RAISE EXCEPTION 'Only Managers and Head Managers can create new users.';
  END IF;

  -- Only Head Managers can assign the Head Manager role
  IF p_role = 'Head Manager' AND public.get_user_role(auth.uid()) != 'Head Manager' THEN
    RAISE EXCEPTION 'Only Head Managers can create a user with the Head Manager role.';
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

  -- Update profiles table role and details (it was created by on_auth_user_created trigger)
  UPDATE public.profiles
  SET role = p_role::public.user_role,
      full_name = p_full_name
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

  -- Update profile role and full_name
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

  -- Delete from auth.users (cascades to public.profiles)
  DELETE FROM auth.users
  WHERE id = p_user_id;
END;
$$;
