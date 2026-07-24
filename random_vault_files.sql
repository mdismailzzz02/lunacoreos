CREATE OR REPLACE FUNCTION get_random_vault_files(p_collection_id UUID, p_limit INT)
RETURNS SETOF vault_files AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM vault_files
  WHERE collection_id = p_collection_id
  ORDER BY random()
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
