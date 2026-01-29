-- Face Verification Functions for Supabase
-- These functions use pgvector for cosine similarity matching

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Function 1: match_face (1:N) - Find who this person is
-- Used by instructors to identify students from face capture
CREATE OR REPLACE FUNCTION match_face(
    query_embedding vector(512),
    match_threshold float DEFAULT 0.6,
    match_count int DEFAULT 1
)
RETURNS TABLE (
    user_id uuid,
    full_name text,
    reg_number text,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    -- Check if the caller is an instructor
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'instructor'
    ) THEN
        RAISE EXCEPTION 'Access denied: Only instructors can identify students.';
    END IF;

    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.full_name,
        p.reg_number,
        1 - (p.face_encoding <=> query_embedding) as similarity
    FROM profiles p
    WHERE 
        p.face_encoding IS NOT NULL
        AND p.is_face_registered = true
        AND 1 - (p.face_encoding <=> query_embedding) >= match_threshold
    ORDER BY p.face_encoding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function 2: verify_face_match (1:1) - Verify this person is who they claim to be
-- Used by students to mark their own attendance
CREATE OR REPLACE FUNCTION verify_face_match(
    user_id uuid,
    query_embedding vector(512),
    match_threshold float DEFAULT 0.6
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    stored_encoding vector(512);
    similarity_score float;
BEGIN
    -- Ensure user is verifying themselves
    IF auth.uid() != user_id THEN
        RAISE EXCEPTION 'Access denied: You can only verify your own face.';
    END IF;

    -- Fetch the stored face encoding for this user
    SELECT face_encoding INTO stored_encoding
    FROM profiles
    WHERE id = user_id
      AND is_face_registered = true
      AND face_encoding IS NOT NULL;
    
    -- If no face registered, return false
    IF stored_encoding IS NULL THEN
        RETURN false;
    END IF;
    
    -- Calculate cosine similarity (1 - cosine distance)
    similarity_score := 1 - (stored_encoding <=> query_embedding);
    
    -- Return true if similarity meets threshold
    RETURN similarity_score >= match_threshold;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION match_face(vector(512), float, int) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_face_match(uuid, vector(512), float) TO authenticated;

-- Grant execute to service_role for backend API calls
GRANT EXECUTE ON FUNCTION match_face(vector(512), float, int) TO service_role;
GRANT EXECUTE ON FUNCTION verify_face_match(uuid, vector(512), float) TO service_role;

-- Comments for documentation
COMMENT ON FUNCTION match_face IS 'Find matching faces from all registered users (1:N matching). Used by instructors to identify students.';
COMMENT ON FUNCTION verify_face_match IS 'Verify if a face matches a specific user (1:1 verification). Used by students for self-attendance.';
