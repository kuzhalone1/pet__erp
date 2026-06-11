ALTER TABLE pet_owners ADD COLUMN IF NOT EXISTS gl_account_id INTEGER REFERENCES gl_master(gl_id);

CREATE OR REPLACE FUNCTION create_owner_gl(p_owner_id INT, p_owner_code TEXT, p_owner_name TEXT)
RETURNS VOID AS $$
DECLARE
    v_gl_id INT;
BEGIN
    SELECT gl_account_id INTO v_gl_id FROM pet_owners WHERE owner_id = p_owner_id;
    IF v_gl_id IS NOT NULL THEN
        RETURN;
    END IF;

    INSERT INTO gl_master (gl_code, gl_name, group_name, sub_group)
    VALUES ('DEB-' || p_owner_code, p_owner_name, 'Assets', 'Debtors')
    ON CONFLICT (gl_code) DO NOTHING;

    SELECT gl_id INTO v_gl_id FROM gl_master WHERE gl_code = 'DEB-' || p_owner_code;

    UPDATE pet_owners SET gl_account_id = v_gl_id WHERE owner_id = p_owner_id;
END;
$$ LANGUAGE plpgsql;
