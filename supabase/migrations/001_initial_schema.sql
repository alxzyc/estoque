-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Custom types
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'operator');
CREATE TYPE movement_type AS ENUM ('in', 'out', 'adjustment', 'return', 'loss', 'transfer_out', 'transfer_in');
CREATE TYPE movement_direction AS ENUM ('increase', 'decrease');
CREATE TYPE notification_kind AS ENUM ('low_stock', 'out_of_stock', 'expiring', 'unusual_movement', 'reorder');
CREATE TYPE product_unit AS ENUM ('un', 'kg', 'g', 'l', 'ml', 'm', 'cx', 'pct');

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    cnpj VARCHAR(18),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    full_name VARCHAR(100),
    role user_role NOT NULL DEFAULT 'operator',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, lower(name))
);

-- Suppliers table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    company_name VARCHAR(200) NOT NULL,
    cnpj VARCHAR(18),
    contact_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(255),
    address JSONB,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, cnpj)
);

-- Product-Supplier junction table
CREATE TABLE product_suppliers (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    supplier_sku VARCHAR(50),
    last_cost NUMERIC(12,2),
    is_preferred BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (product_id, supplier_id)
);

-- Stock Locations (Warehouses)
CREATE TABLE stock_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (organization_id, code)
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    barcode VARCHAR(13),
    description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    brand VARCHAR(100),
    primary_supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    cost_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    sale_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
    unit product_unit NOT NULL DEFAULT 'un',
    min_stock INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
    image_path TEXT,
    expires_tracking BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES profiles(id),
    version INTEGER NOT NULL DEFAULT 1,
    UNIQUE (organization_id, sku),
    UNIQUE (organization_id, barcode)
);

-- Product Stock (quantity per location)
CREATE TABLE product_stock (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES stock_locations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, location_id)
);

-- Stock Batches (for expiration tracking)
CREATE TABLE stock_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES stock_locations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    lot_code VARCHAR(50) NOT NULL,
    quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
    expires_on DATE,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stock Movements (immutable ledger)
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES stock_locations(id) ON DELETE CASCADE,
    type movement_type NOT NULL,
    direction movement_direction,
    quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
    balance_before NUMERIC(14,3) NOT NULL,
    balance_after NUMERIC(14,3) NOT NULL,
    reason VARCHAR(200),
    notes TEXT,
    transfer_group_id UUID,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    unit_cost NUMERIC(12,2),
    document_ref VARCHAR(100),
    reverses_movement_id UUID REFERENCES stock_movements(id) ON DELETE SET NULL,
    idempotency_key UUID NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    before JSONB,
    after JSONB,
    ip INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    kind notification_kind NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    payload JSONB,
    dedupe_key VARCHAR(200) NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organization_id, dedupe_key, read_at) WHERE read_at IS NULL
);

-- Settings (per organization)
CREATE TABLE settings (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    allow_negative_stock BOOLEAN NOT NULL DEFAULT FALSE,
    expiring_threshold_days INTEGER NOT NULL DEFAULT 30 CHECK (expiring_threshold_days > 0),
    unusual_qty_threshold_pct INTEGER NOT NULL DEFAULT 200 CHECK (unusual_qty_threshold_pct > 0),
    currency CHAR(3) NOT NULL DEFAULT 'BRL',
    timezone VARCHAR(50) NOT NULL DEFAULT 'America/Sao_Paulo'
);

-- Indexes for performance
CREATE INDEX idx_profiles_organization ON profiles(organization_id);
CREATE INDEX idx_categories_organization ON categories(organization_id);
CREATE INDEX idx_suppliers_organization ON suppliers(organization_id);
CREATE INDEX idx_products_organization ON products(organization_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_supplier ON products(primary_supplier_id);
CREATE INDEX idx_products_sku_trgm ON products USING gin (sku gin_trgm_ops);
CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX idx_product_stock_product ON product_stock(product_id);
CREATE INDEX idx_product_stock_location ON product_stock(location_id);
CREATE INDEX idx_stock_batches_product ON stock_batches(product_id);
CREATE INDEX idx_stock_batches_location ON stock_batches(location_id);
CREATE INDEX idx_stock_batches_expires ON stock_batches(expires_on) WHERE expires_on IS NOT NULL;
CREATE INDEX idx_stock_movements_organization ON stock_movements(organization_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_location ON stock_movements(location_id);
CREATE INDEX idx_stock_movements_created_at ON stock_movements(created_at);
CREATE INDEX idx_stock_movements_transfer_group ON stock_movements(transfer_group_id);
CREATE INDEX idx_audit_logs_organization ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX idx_notifications_organization ON notifications(organization_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_dedupe ON notifications(dedupe_key);
CREATE INDEX idx_notifications_unread ON notifications(organization_id, user_id) WHERE read_at IS NULL;