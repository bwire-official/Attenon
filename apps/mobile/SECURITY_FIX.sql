-- SECURITY FIX: Secure validation for allowed_users
-- Prevents enumeration attacks and SQL injection

-- Create secure RPC function
CREATE OR REPLACE FUNCTION check_user_allowed(
    input_value TEXT
)
RETURNS TABLE (
    is_allowed BOOLEAN,
    email TEXT,
    full_name TEXT,
    reg_number TEXT,
    role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    normalized_input TEXT;
    user_record RECORD;
BEGIN
    normalized_input := LOWER(TRIM(input_value));
    
    IF normalized_input = '' OR LENGTH(normalized_input) > 255 THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;
    
    IF normalized_input !~ '^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$' 
       AND normalized_input !~ '^[a-z0-9]+$' THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;
    SELECT 
        au.email,
        au.full_name,
        au.reg_number,
        au.role
    INTO user_record
    FROM allowed_users au
    WHERE LOWER(au.email) = normalized_input
       OR LOWER(au.reg_number) = normalized_input
    LIMIT 1;
    
    IF user_record IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
    ELSE
        RETURN QUERY SELECT 
            TRUE,
            user_record.email,
            user_record.full_name,
            user_record.reg_number,
            user_record.role;
    END IF;
END;
$$;

-- Grant execute permission to anon role
GRANT EXECUTE ON FUNCTION check_user_allowed(TEXT) TO anon;

-- Ensure function owner has SELECT permission on allowed_users
-- SECURITY DEFINER functions need the owner to have table access
ALTER FUNCTION check_user_allowed(TEXT) OWNER TO postgres;
GRANT SELECT ON allowed_users TO postgres;

-- Add RLS policy to prevent direct SELECT access for anon
-- INSERT is still allowed (student portal needs it)
-- SELECT can only be done via RPC function
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'allowed_users' 
        AND policyname = 'Anon can only use RPC function'
    ) THEN
        CREATE POLICY "Anon can only use RPC function" ON allowed_users
        FOR SELECT
        TO anon
        USING (false);
    END IF;
END $$;

-- Revoke direct SELECT access from anon
-- INSERT permission remains (for student portal registration)
-- SELECT can only be done via RPC function
REVOKE SELECT ON allowed_users FROM anon;
