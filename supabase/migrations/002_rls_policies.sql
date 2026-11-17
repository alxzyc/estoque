-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's organization_id
CREATE OR REPLACE FUNCTION auth_org_id() RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
    SELECT organization_id FROM profiles WHERE id = auth.uid()
$$;

-- Organizations policies
CREATE POLICY "Users can view own organization" ON organizations
    FOR SELECT USING (id = auth_org_id());

CREATE POLICY "Admins can update organization" ON organizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND organization_id = auth_org_id() AND role = 'admin'
        )
    );

-- Profiles policies
CREATE POLICY "Users can view profiles in own org" ON profiles
    FOR SELECT USING (organization_id = auth_org_id());

CREATE POLICY "Admins can manage profiles" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND organization_id = auth_org_id() AND role = 'admin'
        )
    );

-- Categories policies
CREATE POLICY "Users can view categories in own org" ON categories
    FOR SELECT USING (organization_id = auth_org_id());

CREATE POLICY "Managers and admins can manage categories" ON categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND organization_id = auth_org_id() AND role IN ('admin', 'manager')
        )
    );

-- Suppliers policies
CREATE POLICY "Users can view suppliers in own org" ON suppliers
    FOR SELECT USING (organization_id = auth_org_id());

CREATE POLICY "Managers and admins can manage suppliers" ON suppliers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND organization_id = auth_org_id() AND role IN ('admin', 'manager')
        )
    );

-- Product-Suppliers policies
CREATE POLICY "Users can view product_suppliers in own org" ON product_suppliers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM products p 
            WHERE p.id = product_suppliers.product_id AND p.organization_id = auth_org_id()
        )
    );

CREATE POLICY "Managers and admins can manage product_suppliers" ON product_suppliers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND organization_id = auth_org_id() AND role IN ('admin', 'manager')
        )
    );

-- Stock Locations policies
CREATE POLICY "Users can view locations in own org" ON stock_locations
    FOR SELECT USING (organization_id = auth_org_id());

CREATE POLICY "Managers and admins can manage locations" ON stock_locations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND organization_id = auth_org_id() AND role IN ('admin', 'manager')
        )
    );

-- Products policies
CREATE POLICY "Users can view products in own org" ON products
    FOR SELECT USING (organization_id = auth_org_id());

CREATE POLICY "Managers and admins can manage products" ON products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND organization_id = auth_org_id() AND role IN ('admin', 'manager')
        )
    );

-- Product Stock policies (read-only for users, write only via functions)
CREATE POLICY "Users can view stock in own org" ON product_stock
    FOR SELECT USING (organization_id = auth_org_id());

-- Stock Batches policies
CREATE POLICY "Users can view batches in own org" ON stock_batches
    FOR SELECT USING (organization_id = auth_org_id());

CREATE POLICY "Managers and admins can manage batches" ON stock_batches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND organization_id = auth_org_id() AND role IN ('admin', 'manager')
        )
    );

-- Stock Movements policies
CREATE POLICY "Users can view movements in own org" ON stock_movements
    FOR SELECT USING (organization_id = auth_org_id());

-- No INSERT/UPDATE/DELETE policies for stock_movements - only via SECURITY DEFINER functions

-- Audit Logs policies (admin only read)
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND organization_id = auth_org_id() AND role = 'admin'
        )
    );

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (
        organization_id = auth_org_id() 
        AND (user_id IS NULL OR user_id = auth.uid())
    );

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (
        organization_id = auth_org_id() 
        AND (user_id IS NULL OR user_id = auth.uid())
    );

-- Settings policies
CREATE POLICY "Users can view settings" ON settings
    FOR SELECT USING (organization_id = auth_org_id());

CREATE POLICY "Admins can update settings" ON settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND organization_id = auth_org_id() AND role = 'admin'
        )
    );