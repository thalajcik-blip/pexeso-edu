-- Atomic XP update function — prevents lost updates under concurrent load
-- Replaces client-side read-modify-write in authStore.ts

CREATE OR REPLACE FUNCTION add_xp(p_user_id uuid, p_xp_delta integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_xp    integer;
  v_new_level integer;
  v_level_xp  integer[] := ARRAY[0, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000];
  i           integer;
BEGIN
  UPDATE profiles
    SET xp = xp + p_xp_delta
  WHERE id = p_user_id
  RETURNING xp INTO v_new_xp;

  -- Compute level from new XP
  v_new_level := 1;
  FOR i IN 1..array_length(v_level_xp, 1) LOOP
    IF v_new_xp >= v_level_xp[i] THEN v_new_level := i; END IF;
  END LOOP;
  v_new_level := LEAST(v_new_level, array_length(v_level_xp, 1));

  UPDATE profiles SET level = v_new_level WHERE id = p_user_id;

  RETURN jsonb_build_object('xp', v_new_xp, 'level', v_new_level);
END;
$$;
