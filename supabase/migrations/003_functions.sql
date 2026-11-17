-- Function to apply stock movement (core transactional function)
CREATE OR REPLACE FUNCTION apply_stock_movement(
    p_product_id UUID,
    p_location_id UUID,
    p_type movement_type,
    p_quantity NUMERIC(14,3),
    p_reason VARCHAR(200),
    p_notes TEXT,
    p_supplier_id UUID,
    p_unit_cost NUMERIC(12,2),
    p_document_ref VARCHAR(100),
    p_transfer_group_id UUID,
    p_direction movement_direction,
    p_idempotency_key UUID,
    p_created_by UUID
) RETURNS TABLE(movement_id UUID, balance_after NUMERIC(14,3))
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_balance_before NUMERIC(14,3);
    v_balance_after NUMERIC(14,3);
    v_multiplier INTEGER;
    v_allow_negative BOOLEAN;
    v_existing_movement_id UUID;
    v_product_expires BOOLEAN;
    v_movement_id UUID;
BEGIN
    -- Check idempotency
    SELECT id INTO v_existing_movement_id 
    FROM stock_movements 
    WHERE idempotency_key = p_idempotency_key;
    
    IF v_existing_movement_id IS NOT NULL THEN
        RETURN QUERY SELECT v_existing_movement_id, balance_after 
        FROM stock_movements WHERE id = v_existing_movement_id;
        RETURN;
    END IF;

    -- Get organization_id and verify permissions
    SELECT organization_id INTO v_org_id 
    FROM profiles WHERE id = p_created_by;
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'User not found or not associated with organization';
    END IF;

    -- Get product info
    SELECT expires_tracking INTO v_product_expires 
    FROM products WHERE id = p_product_id AND organization_id = v_org_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Product not found';
    END IF;

    -- Get current balance with row lock
    SELECT quantity INTO v_balance_before 
    FROM product_stock 
    WHERE product_id = p_product_id AND location_id = p_location_id 
    FOR UPDATE;
    
    IF NOT FOUND THEN
        v_balance_before := 0;
    END IF;

    -- Check allow_negative_stock setting
    SELECT allow_negative_stock INTO v_allow_negative 
    FROM settings WHERE organization_id = v_org_id;
    
    IF NOT FOUND THEN
        v_allow_negative := FALSE;
    END IF;

    -- Determine multiplier based on movement type
    CASE p_type
        WHEN 'in' THEN v_multiplier := 1;
        WHEN 'out' THEN v_multiplier := -1;
        WHEN 'return' THEN v_multiplier := 1;
        WHEN 'loss' THEN v_multiplier := -1;
        WHEN 'transfer_out' THEN v_multiplier := -1;
        WHEN 'transfer_in' THEN v_multiplier := 1;
        WHEN 'adjustment' THEN 
            IF p_direction = 'increase' THEN v_multiplier := 1;
            ELSIF p_direction = 'decrease' THEN v_multiplier := -1;
            ELSE RAISE EXCEPTION 'Direction required for adjustment';
            END IF;
        ELSE RAISE EXCEPTION 'Invalid movement type';
    END CASE;

    v_balance_after := v_balance_before + (p_quantity * v_multiplier);

    -- Check negative stock
    IF NOT v_allow_negative AND v_balance_after < 0 THEN
        RAISE EXCEPTION 'Insufficient stock: current=%, requested=%', v_balance_before, p_quantity;
    END IF;

    -- Insert movement record
    INSERT INTO stock_movements (
        organization_id, product_id, location_id, type, direction,
        quantity, balance_before, balance_after, reason, notes,
        transfer_group_id, supplier_id, unit_cost, document_ref,
        idempotency_key, created_by
    ) VALUES (
        v_org_id, p_product_id, p_location_id, p_type, p_direction,
        p_quantity, v_balance_before, v_balance_after, p_reason, p_notes,
        p_transfer_group_id, p_supplier_id, p_unit_cost, p_document_ref,
        p_idempotency_key, p_created_by
    ) RETURNING id INTO v_movement_id;

    -- Update product_stock
    INSERT INTO product_stock (product_id, location_id, organization_id, quantity)
    VALUES (p_product_id, p_location_id, v_org_id, v_balance_after)
    ON CONFLICT (product_id, location_id) 
    DO UPDATE SET quantity = v_balance_after;

    -- Update weighted average cost for entries
    IF p_type IN ('in', 'return') AND p_unit_cost IS NOT NULL AND p_unit_cost > 0 THEN
        UPDATE products 
        SET cost_price = (
            SELECT CASE 
                WHEN SUM(ps.quantity) = 0 THEN p_unit_cost
                ELSE SUM(ps.quantity * p.cost_price + p_quantity * p_unit_cost) / (SUM(ps.quantity) + p_quantity)
            END
            FROM product_stock ps WHERE ps.product_id = p_product_id
        )
        WHERE id = p_product_id;
        
        -- Update supplier last_cost
        IF p_supplier_id IS NOT NULL THEN
            UPDATE product_suppliers 
            SET last_cost = p_unit_cost, is_preferred = TRUE
            WHERE product_id = p_product_id AND supplier_id = p_supplier_id;
        END IF;
    END IF;

    -- Log audit
    INSERT INTO audit_logs (organization_id, actor_id, action, entity, entity_id, after, ip, user_agent)
    VALUES (v_org_id, p_created_by, 'CREATE', 'stock_movement', v_movement_id, 
            jsonb_build_object('type', p_type, 'quantity', p_quantity, 'balance_after', v_balance_after),
            inet_client_addr(), current_setting('request.jwt.claims', true)::json->>'user_agent');

    RETURN QUERY SELECT v_movement_id, v_balance_after;
END;
$$;

-- Function to apply transfer (atomic transfer_out + transfer_in)
CREATE OR REPLACE FUNCTION apply_stock_transfer(
    p_product_id UUID,
    p_from_location_id UUID,
    p_to_location_id UUID,
    p_quantity NUMERIC(14,3),
    p_reason VARCHAR(200),
    p_notes TEXT,
    p_idempotency_key UUID,
    p_created_by UUID
) RETURNS TABLE(out_movement_id UUID, in_movement_id UUID)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_transfer_group_id UUID := uuid_generate_v4();
    v_out_result RECORD;
    v_in_result RECORD;
BEGIN
    IF p_from_location_id = p_to_location_id THEN
        RAISE EXCEPTION 'Origin and destination locations must be different';
    END IF;

    -- Apply transfer_out
    SELECT * INTO v_out_result FROM apply_stock_movement(
        p_product_id, p_from_location_id, 'transfer_out', p_quantity,
        p_reason, p_notes, NULL, NULL, NULL, v_transfer_group_id, NULL,
        p_idempotency_key || '-out', p_created_by
    );

    -- Apply transfer_in with different idempotency key
    SELECT * INTO v_in_result FROM apply_stock_movement(
        p_product_id, p_to_location_id, 'transfer_in', p_quantity,
        p_reason, p_notes, NULL, NULL, NULL, v_transfer_group_id, NULL,
        p_idempotency_key || '-in', p_created_by
    );

    RETURN QUERY SELECT v_out_result.movement_id, v_in_result.movement_id;
END;
$$;

-- Function to get product stock
CREATE OR REPLACE FUNCTION get_product_stock(
    p_product_id UUID,
    p_location_id UUID DEFAULT NULL
) RETURNS TABLE(
    product_id UUID,
    location_id UUID,
    location_name VARCHAR(100),
    quantity NUMERIC(14,3)
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT ps.product_id, ps.location_id, sl.name, ps.quantity
    FROM product_stock ps
    JOIN stock_locations sl ON sl.id = ps.location_id
    WHERE ps.product_id = p_product_id
    AND (p_location_id IS NULL OR ps.location_id = p_location_id)
    AND ps.organization_id = auth_org_id();
END;
$$;

-- Dashboard metrics function
CREATE OR REPLACE FUNCTION get_dashboard_metrics(
    p_location_id UUID DEFAULT NULL
) RETURNS TABLE(
    active_products BIGINT,
    total_units NUMERIC(14,3),
    low_stock_count BIGINT,
    out_of_stock_count BIGINT,
    inventory_value NUMERIC(14,2)
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT p.id) FILTER (WHERE p.archived_at IS NULL) as active_products,
        COALESCE(SUM(ps.quantity), 0) as total_units,
        COUNT(DISTINCT p.id) FILTER (
            WHERE p.archived_at IS NULL 
            AND p.min_stock > 0 
            AND COALESCE(SUM(ps.quantity) OVER (PARTITION BY p.id), 0) > 0
            AND COALESCE(SUM(ps.quantity) OVER (PARTITION BY p.id), 0) <= p.min_stock
        ) as low_stock_count,
        COUNT(DISTINCT p.id) FILTER (
            WHERE p.archived_at IS NULL 
            AND COALESCE(SUM(ps.quantity) OVER (PARTITION BY p.id), 0) <= 0
        ) as out_of_stock_count,
        COALESCE(SUM(ps.quantity * p.cost_price), 0) as inventory_value
    FROM products p
    LEFT JOIN product_stock ps ON ps.product_id = p.id 
        AND (p_location_id IS NULL OR ps.location_id = p_location_id)
        AND ps.organization_id = auth_org_id()
    WHERE p.organization_id = auth_org_id()
    AND p.archived_at IS NULL;
END;
$$;

-- Recent movements function
CREATE OR REPLACE FUNCTION get_recent_movements(
    p_limit INTEGER DEFAULT 10,
    p_location_id UUID DEFAULT NULL
) RETURNS TABLE(
    id UUID,
    product_name VARCHAR(200),
    product_sku VARCHAR(50),
    type movement_type,
    quantity NUMERIC(14,3),
    location_name VARCHAR(100),
    created_by_name VARCHAR(100),
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.id,
        p.name as product_name,
        p.sku as product_sku,
        sm.type,
        sm.quantity,
        sl.name as location_name,
        pr.full_name as created_by_name,
        sm.created_at
    FROM stock_movements sm
    JOIN products p ON p.id = sm.product_id
    JOIN stock_locations sl ON sl.id = sm.location_id
    JOIN profiles pr ON pr.id = sm.created_by
    WHERE sm.organization_id = auth_org_id()
    AND (p_location_id IS NULL OR sm.location_id = p_location_id)
    ORDER BY sm.created_at DESC
    LIMIT p_limit;
END;
$$;

-- Top selling products function
CREATE OR REPLACE FUNCTION get_top_selling_products(
    p_days INTEGER DEFAULT 30,
    p_limit INTEGER DEFAULT 10,
    p_location_id UUID DEFAULT NULL
) RETURNS TABLE(
    product_id UUID,
    product_name VARCHAR(200),
    product_sku VARCHAR(50),
    total_quantity NUMERIC(14,3)
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.product_id,
        p.name as product_name,
        p.sku as product_sku,
        SUM(sm.quantity) as total_quantity
    FROM stock_movements sm
    JOIN products p ON p.id = sm.product_id
    WHERE sm.organization_id = auth_org_id()
    AND sm.type = 'out'
    AND sm.created_at >= NOW() - (p_days || ' days')::interval
    AND (p_location_id IS NULL OR sm.location_id = p_location_id)
    GROUP BY sm.product_id, p.name, p.sku
    ORDER BY total_quantity DESC
    LIMIT p_limit;
END;
$$;

-- Movement chart data function
CREATE OR REPLACE FUNCTION get_movement_chart_data(
    p_days INTEGER DEFAULT 30,
    p_location_id UUID DEFAULT NULL
) RETURNS TABLE(
    date DATE,
    entries NUMERIC(14,3),
    exits NUMERIC(14,3)
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.date,
        COALESCE(SUM(sm.quantity) FILTER (WHERE sm.type IN ('in', 'return', 'transfer_in')), 0) as entries,
        COALESCE(SUM(sm.quantity) FILTER (WHERE sm.type IN ('out', 'loss', 'transfer_out')), 0) as exits
    FROM generate_series(
        (NOW() - (p_days || ' days')::interval)::date,
        NOW()::date,
        '1 day'
    ) d(date)
    LEFT JOIN stock_movements sm 
        ON sm.created_at::date = d.date
        AND sm.organization_id = auth_org_id()
        AND (p_location_id IS NULL OR sm.location_id = p_location_id)
    GROUP BY d.date
    ORDER BY d.date;
END;
$$;

-- Stock evolution function
CREATE OR REPLACE FUNCTION get_stock_evolution(
    p_days INTEGER DEFAULT 30,
    p_product_id UUID DEFAULT NULL,
    p_location_id UUID DEFAULT NULL
) RETURNS TABLE(
    date DATE,
    balance NUMERIC(14,3)
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_initial_balance NUMERIC(14,3);
BEGIN
    -- Get initial balance before the period
    SELECT COALESCE(SUM(
        CASE 
            WHEN sm.type IN ('in', 'return', 'transfer_in') THEN sm.quantity
            WHEN sm.type IN ('out', 'loss', 'transfer_out') THEN -sm.quantity
            WHEN sm.type = 'adjustment' AND sm.direction = 'increase' THEN sm.quantity
            WHEN sm.type = 'adjustment' AND sm.direction = 'decrease' THEN -sm.quantity
            ELSE 0
        END
    ), 0) INTO v_initial_balance
    FROM stock_movements sm
    WHERE sm.organization_id = auth_org_id()
    AND (p_product_id IS NULL OR sm.product_id = p_product_id)
    AND (p_location_id IS NULL OR sm.location_id = p_location_id)
    AND sm.created_at < (NOW() - (p_days || ' days')::interval);

    RETURN QUERY
    WITH daily_changes AS (
        SELECT 
            d.date,
            COALESCE(SUM(
                CASE 
                    WHEN sm.type IN ('in', 'return', 'transfer_in') THEN sm.quantity
                    WHEN sm.type IN ('out', 'loss', 'transfer_out') THEN -sm.quantity
                    WHEN sm.type = 'adjustment' AND sm.direction = 'increase' THEN sm.quantity
                    WHEN sm.type = 'adjustment' AND sm.direction = 'decrease' THEN -sm.quantity
                    ELSE 0
                END
            ), 0) as daily_change
        FROM generate_series(
            (NOW() - (p_days || ' days')::interval)::date,
            NOW()::date,
            '1 day'
        ) d(date)
        LEFT JOIN stock_movements sm 
            ON sm.created_at::date = d.date
            AND sm.organization_id = auth_org_id()
            AND (p_product_id IS NULL OR sm.product_id = p_product_id)
            AND (p_location_id IS NULL OR sm.location_id = p_location_id)
        GROUP BY d.date
    )
    SELECT 
        dc.date,
        v_initial_balance + SUM(dc.daily_change) OVER (ORDER BY dc.date ROWS UNBOUNDED PRECEDING) as balance
    FROM daily_changes dc
    ORDER BY dc.date;
END;
$$;

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for audit logging on products
CREATE OR REPLACE FUNCTION audit_products()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (organization_id, actor_id, action, entity, entity_id, after)
        VALUES (NEW.organization_id, NEW.created_by, 'CREATE', 'product', NEW.id, to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (organization_id, actor_id, action, entity, entity_id, before, after)
        VALUES (NEW.organization_id, NEW.created_by, 'UPDATE', 'product', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (organization_id, actor_id, action, entity, entity_id, before)
        VALUES (OLD.organization_id, OLD.created_by, 'DELETE', 'product', OLD.id, to_jsonb(OLD));
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_audit_products
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION audit_products();

-- Trigger for audit logging on suppliers
CREATE OR REPLACE FUNCTION audit_suppliers()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (organization_id, actor_id, action, entity, entity_id, after)
        VALUES (NEW.organization_id, auth.uid(), 'CREATE', 'supplier', NEW.id, to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (organization_id, actor_id, action, entity, entity_id, before, after)
        VALUES (NEW.organization_id, auth.uid(), 'UPDATE', 'supplier', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (organization_id, actor_id, action, entity, entity_id, before)
        VALUES (OLD.organization_id, auth.uid(), 'DELETE', 'supplier', OLD.id, to_jsonb(OLD));
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_audit_suppliers
    AFTER INSERT OR UPDATE OR DELETE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION audit_suppliers();

-- Trigger for audit logging on categories
CREATE OR REPLACE FUNCTION audit_categories()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (organization_id, actor_id, action, entity, entity_id, after)
        VALUES (NEW.organization_id, auth.uid(), 'CREATE', 'category', NEW.id, to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (organization_id, actor_id, action, entity, entity_id, before, after)
        VALUES (NEW.organization_id, auth.uid(), 'UPDATE', 'category', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (organization_id, actor_id, action, entity, entity_id, before)
        VALUES (OLD.organization_id, auth.uid(), 'DELETE', 'category', OLD.id, to_jsonb(OLD));
    END IF
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_audit_categories
    AFTER INSERT OR UPDATE OR DELETE ON categories
    FOR EACH ROW EXECUTE FUNCTION audit_categories();

-- Trigger for audit logging on profiles
CREATE OR REPLACE FUNCTION audit_profiles()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (organization_id, actor_id, action, entity, entity_id, after)
        VALUES (NEW.organization_id, auth.uid(), 'CREATE', 'profile', NEW.id, to_jsonb(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (organization_id, actor_id, action, entity, entity_id, before, after)
        VALUES (NEW.organization_id, auth.uid(), 'UPDATE', 'profile', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_audit_profiles
    AFTER INSERT OR UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION audit_profiles();