CREATE OR REPLACE FUNCTION update_collection_counts()
RETURNS TRIGGER AS $$
DECLARE
    curr_parent_id TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        curr_parent_id := NEW.collection_id;
        WHILE curr_parent_id IS NOT NULL LOOP
            UPDATE vault_collections 
            SET file_count = file_count + 1, size_bytes = size_bytes + NEW.size_bytes 
            WHERE id = curr_parent_id
            RETURNING parent_id INTO curr_parent_id;
        END LOOP;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        curr_parent_id := OLD.collection_id;
        WHILE curr_parent_id IS NOT NULL LOOP
            UPDATE vault_collections 
            SET file_count = GREATEST(file_count - 1, 0), size_bytes = GREATEST(size_bytes - OLD.size_bytes, 0)
            WHERE id = curr_parent_id
            RETURNING parent_id INTO curr_parent_id;
        END LOOP;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_collection_counts_trigger ON vault_files;

CREATE TRIGGER update_collection_counts_trigger
AFTER INSERT OR DELETE ON vault_files
FOR EACH ROW
EXECUTE FUNCTION update_collection_counts();
