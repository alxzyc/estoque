-- Function to create/update notification with deduplication
CREATE OR REPLACE FUNCTION upsert_notification(
    p_organization_id UUID,
    p_kind notification_kind,
    p_product_id UUID,
    p_user_id UUID DEFAULT NULL,
    p_payload JSONB DEFAULT NULL,
    p_dedupe_key TEXT
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO notifications (organization_id, kind, product_id, user_id, payload, dedupe_key)
    VALUES (p_organization_id, p_kind, p_product_id, p_user_id, p_payload, p_dedupe_key)
    ON CONFLICT (organization_id, dedupe_key, read_at) WHERE read_at IS NULL
    DO UPDATE SET 
        payload = EXCLUDED.payload,
        created_at = NOW();
END;
$$;

-- Function to check and create alerts after stock movement
CREATE OR REPLACE FUNCTION check_stock_alerts(
    p_product_id UUID,
    p_location_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_total_stock NUMERIC(14,3);
    v_min_stock INTEGER;
    v_product_name VARCHAR(200);
    v_product_sku VARCHAR(50);
    v_location_name VARCHAR(100);
    v_settings RECORD;
    v_org_id UUID;
BEGIN
    SELECT organization_id INTO v_org_id FROM products WHERE id = p_product_id;
    
    SELECT allow_negative_stock, expiring_threshold_days, unusual_qty_threshold_pct
    INTO v_settings
    FROM settings WHERE organization_id = v_org_id;

    -- Get total stock across all locations
    SELECT COALESCE(SUM(quantity), 0) INTO v_total_stock
    FROM product_stock WHERE product_id = p_product_id AND organization_id = v_org_id;

    SELECT min_stock, name, sku INTO v_min_stock, v_product_name, v_product_sku
    FROM products WHERE id = p_product_id;

    SELECT name INTO v_location_name FROM stock_locations WHERE id = p_location_id;

    -- Low stock alert
    IF v_total_stock > 0 AND v_total_stock <= v_min_stock AND v_min_stock > 0 THEN
        PERFORM upsert_notification(
            v_org_id, 'low_stock', p_product_id, NULL,
            jsonb_build_object(
                'product_name', v_product_name,
                'product_sku', v_product_sku,
                'total_stock', v_total_stock,
                'min_stock', v_min_stock,
                'location_name', v_location_name
            ),
            'low_stock:' || p_product_id || ':' || p_location_id
        );
    END IF;

    -- Out of stock alert
    IF v_total_stock <= 0 THEN
        PERFORM upsert_notification(
            v_org_id, 'out_of_stock', p_product_id, NULL,
            jsonb_build_object(
                'product_name', v_product_name,
                'product_sku', v_product_sku,
                'location_name', v_location_name
            ),
            'out_of_stock:' || p_product_id || ':' || p_location_id
        );
    END IF;

    -- Check expiring batches
    IF EXISTS (SELECT 1 FROM products WHERE id = p_product_id AND expires_tracking = TRUE) THEN
        PERFORM check_expiring_alerts(p_product_id, v_org_id);
    END IF;
END;
$$;

-- Function to check expiring alerts
CREATE OR REPLACE FUNCTION check_expiring_alerts(
    p_product_id UUID,
    p_org_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_threshold INTEGER;
    v_batch RECORD;
BEGIN
    SELECT expiring_threshold_days INTO v_threshold FROM settings WHERE organization_id = p_org_id;

    FOR v_batch IN
        SELECT sb.lot_code, sb.quantity, sb.expires_on, sb.location_id, sl.name as location_name,
               p.name as product_name, p.sku as product_sku
        FROM stock_batches sb
        JOIN stock_locations sl ON sl.id = sb.location_id
        JOIN products p ON p.id = sb.product_id
        WHERE sb.product_id = p_product_id
        AND sb.organization_id = p_org_id
        AND sb.quantity > 0
        AND sb.expires_on IS NOT NULL
        AND sb.expires_on <= (CURRENT_DATE + v_threshold)
        AND sb.expires_on >= CURRENT_DATE
    LOOP
        PERFORM upsert_notification(
            p_org_id, 'expiring', p_product_id, NULL,
            jsonb_build_object(
                'lot_code', v_batch.lot_code,
                'quantity', v_batch.quantity,
                'expires_on', v_batch.expires_on,
                'location_name', v_batch.location_name,
                'product_name', v_batch.product_name,
                'product_sku', v_batch.product_sku,
                'days_until_expiry', (v_batch.expires_on - CURRENT_DATE)
            ),
            'expiring:' || p_product_id || ':' || v_batch.location_id
        );
    END LOOP;
END;
$$;

-- Function to check unusual movement
CREATE OR REPLACE FUNCTION check_unusual_movement(
    p_product_id UUID,
    p_type movement_type,
    p_quantity NUMERIC(14,3),
    p_location_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_avg_quantity NUMERIC(14,3);
    v_threshold INTEGER;
    v_org_id UUID;
    v_product_name VARCHAR(200);
    v_product_sku VARCHAR(50);
    v_location_name VARCHAR(100);
BEGIN
    SELECT organization_id INTO v_org_id FROM products WHERE id = p_product_id;
    
    SELECT unusual_qty_threshold_pct INTO v_threshold FROM settings WHERE organization_id = v_org_id;

    -- Calculate 30-day average for this movement type
    SELECT COALESCE(AVG(quantity), 0) INTO v_avg_quantity
    FROM stock_movements
    WHERE product_id = p_product_id
    AND type = p_type
    AND created_at >= NOW() - INTERVAL '30 days'
    AND organization_id = v_org_id;

    IF v_avg_quantity > 0 AND p_quantity > v_avg_quantity * (v_threshold / 100.0) THEN
        SELECT name, sku INTO v_product_name, v_product_sku FROM products WHERE id = p_product_id;
        SELECT name INTO v_location_name FROM stock_locations WHERE id = p_location_id;

        PERFORM upsert_notification(
            v_org_id, 'unusual_movement', p_product_id, NULL,
            jsonb_build_object(
                'product_name', v_product_name,
                'product_sku', v_product_sku,
                'type', p_type,
                'quantity', p_quantity,
                'average_quantity', v_avg_quantity,
                'threshold_pct', v_threshold,
                'location_name', v_location_name
            ),
            'unusual_movement:' || p_product_id || ':' || p_location_id
        );
    END IF;
END;
$$;

-- Trigger to check alerts after movement
CREATE OR REPLACE FUNCTION trigger_check_alerts()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM check_stock_alerts(NEW.product_id, NEW.location_id);
    PERFORM check_unusual_movement(NEW.product_id, NEW.type, NEW.quantity, NEW.location_id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_check_alerts_after_movement
    AFTER INSERT ON stock_movements
    FOR EACH ROW EXECUTE FUNCTION trigger_check_alerts();

-- Periodic job to re-evaluate alerts (to be called by pg_cron or external scheduler)
CREATE OR REPLACE FUNCTION evaluate_all_alerts()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_product RECORD;
    v_batch RECORD;
    v_org_id UUID;
BEGIN
    FOR v_org_id IN SELECT id FROM organizations LOOP
        -- Check all products for low/out of stock
        FOR v_product IN
            SELECT p.id, p.name, p.sku, p.min_stock, COALESCE(SUM(ps.quantity), 0) as total_stock
            FROM products p
            LEFT JOIN product_stock ps ON ps.product_id = p.id AND ps.organization_id = v_org_id
            WHERE p.organization_id = v_org_id AND p.archived_at IS NULL
            GROUP BY p.id, p.name, p.sku, p.min_stock
        LOOP
            PERFORM check_stock_alerts(v_product.id, (
                SELECT location_id FROM product_stock 
                WHERE product_id = v_product.id AND organization_id = v_org_id 
                ORDER BY quantity DESC LIMIT 1
            ));
        END LOOP;

        -- Check all expiring batches
        FOR v_batch IN
            SELECT sb.product_id, sb.location_id
            FROM stock_batches sb
            JOIN products p ON p.id = sb.product_id
            WHERE sb.organization_id = v_org_id
            AND p.expires_tracking = TRUE
            AND sb.quantity > 0
            AND sb.expires_on IS NOT NULL
        LOOP
            PERFORM check_expiring_alerts(v_batch.product_id, v_org_id);
        END LOOP;
    END LOOP;
END;
$$;