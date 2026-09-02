-- Security Fixes for LunaCoreOS

-- 1. Secure Guest Codes (Revoke public table access and use RPC)
-- First, drop the insecure SELECT policy that allows anyone to read all codes
DROP POLICY IF EXISTS "Anon can read codes" ON guest_codes;

-- Create an RPC (Remote Procedure Call) that runs with SECURITY DEFINER
-- This means the function runs with the privileges of the creator (postgres/admin),
-- bypassing RLS, so it can check the code without exposing the table to anon.
CREATE OR REPLACE FUNCTION verify_guest_code(input_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_valid boolean;
BEGIN
  -- Check if code exists and is unused
  SELECT EXISTS (
    SELECT 1 FROM guest_codes
    WHERE code = input_code AND used = false
  ) INTO is_valid;

  IF is_valid THEN
    -- Automatically mark it as used immediately to prevent reuse race conditions
    UPDATE guest_codes
    SET used = true
    WHERE code = input_code;
    
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Grant execute permission to anon
GRANT EXECUTE ON FUNCTION verify_guest_code(text) TO anon;
GRANT EXECUTE ON FUNCTION verify_guest_code(text) TO authenticated;
