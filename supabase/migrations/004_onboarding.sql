-- Function to handle new user onboarding (create organization, profile, default location, settings)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_location_id UUID;
BEGIN
    -- Create organization
    INSERT INTO organizations (name, cnpj)
    VALUES (NEW.raw_user_meta_data->>'organization_name', NEW.raw_user_meta_data->>'cnpj')
    RETURNING id INTO v_org_id;

    -- Create profile as admin
    INSERT INTO profiles (id, organization_id, full_name, role)
    VALUES (NEW.id, v_org_id, NEW.raw_user_meta_data->>'full_name', 'admin');

    -- Create default stock location
    INSERT INTO stock_locations (organization_id, name, code, is_default)
    VALUES (v_org_id, 'Principal', 'PRINCIPAL', TRUE)
    RETURNING id INTO v_location_id;

    -- Create default settings
    INSERT INTO settings (organization_id)
    VALUES (v_org_id);

    RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to invite user
CREATE OR REPLACE FUNCTION invite_user(
    p_email TEXT,
    p_role user_role,
    p_invited_by UUID
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_invite_token UUID := uuid_generate_v4();
BEGIN
    SELECT organization_id INTO v_org_id FROM profiles WHERE id = p_invited_by;
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Inviter not found';
    END IF;

    -- Check if inviter is admin
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = p_invited_by AND organization_id = v_org_id AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Only admins can invite users';
    END IF;

    -- Insert invite (using auth.admin_invite_user_by_email would be better in production)
    -- For now, we create a placeholder profile that will be completed on signup
    INSERT INTO profiles (id, organization_id, full_name, role, active)
    VALUES (uuid_generate_v4(), v_org_id, p_email, p_role, FALSE)
    ON CONFLICT (id) DO NOTHING;

    RETURN v_invite_token;
END;
$$;