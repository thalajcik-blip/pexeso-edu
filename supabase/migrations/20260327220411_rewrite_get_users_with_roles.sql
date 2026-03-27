DROP FUNCTION IF EXISTS get_users_with_roles();

CREATE OR REPLACE FUNCTION get_users_with_roles()
RETURNS TABLE (
  id           uuid,
  username     text,
  email        text,
  roles        text[],
  created_at   timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.username,
    a.email,
    p.roles,
    p.created_at
  FROM profiles p
  JOIN auth.users a ON a.id = p.id
  ORDER BY p.created_at DESC;
$$;
