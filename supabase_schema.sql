-- InvoicePe Schema for Supabase
-- Paste these commands in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- =========================================================================
-- 1. Create Tables (Guarantees tables exist before we configure policies or alter columns)
-- =========================================================================

-- Customers Table (Each user gets their own customer list)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT 'No Mobile',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for searching names and user_id filtering
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);
CREATE INDEX IF NOT EXISTS idx_customers_user ON customers (user_id);

-- Invoices Table (Each user gets their own invoices list)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    gst_amount NUMERIC NOT NULL DEFAULT 0,
    gst_rate NUMERIC NOT NULL DEFAULT 18,
    gst_type TEXT NOT NULL DEFAULT 'exclusive',
    status TEXT NOT NULL, -- 'Paid' / 'Pending' or 'paid' / 'pending'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for invoice querying and filtering
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices (customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices (user_id);

-- Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    rate NUMERIC NOT NULL DEFAULT 0,
    amount NUMERIC NOT NULL DEFAULT 0
);

-- Index for item lookup
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items (invoice_id);

-- Udhaar Table (Udhaar Book / Digital Khaata Book - WITH user_id for complete separation)
CREATE TABLE IF NOT EXISTS udhaar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT 'No Mobile',
    amount NUMERIC NOT NULL DEFAULT 0,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'Unpaid', -- 'Unpaid' / 'Paid'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for searching udhaar entries
CREATE INDEX IF NOT EXISTS idx_udhaar_customer ON udhaar (customer_name);
CREATE INDEX IF NOT EXISTS idx_udhaar_user ON udhaar (user_id);

-- Shop Profiles Table (Unique profile per user)
CREATE TABLE IF NOT EXISTS shop_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_name TEXT NOT NULL,
    owner_name TEXT,
    phone TEXT,
    address TEXT,
    upi_id TEXT NOT NULL,
    gstin TEXT,
    referral_code TEXT UNIQUE,
    pro_expires_at TIMESTAMPTZ,
    pro_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Referrals Table (To track successfully referred signups)
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- 2. Safe Alterations (Runs seamlessly whether tables are fresh or existing)
-- =========================================================================

-- Make sure user_id exists in the udhaar table
ALTER TABLE udhaar ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make sure the gst_rate and gst_type columns exist in invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_rate NUMERIC NOT NULL DEFAULT 18;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_type TEXT NOT NULL DEFAULT 'exclusive';

-- Make sure Pro columns exist in shop_profiles
ALTER TABLE shop_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE shop_profiles ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ;
ALTER TABLE shop_profiles ADD COLUMN IF NOT EXISTS pro_until TIMESTAMPTZ;

-- =========================================================================
-- 3. Row Level Security & Policies (Enables secure full user isolation)
-- =========================================================================

-- Enable RLS (Row Level Security)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE udhaar ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Customers Policies
DROP POLICY IF EXISTS "Users can select their own customers" ON customers;
DROP POLICY IF EXISTS "Users can insert their own customers" ON customers;
DROP POLICY IF EXISTS "Users can update their own customers" ON customers;
DROP POLICY IF EXISTS "Users can delete their own customers" ON customers;

CREATE POLICY "Users can select their own customers" ON customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own customers" ON customers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own customers" ON customers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own customers" ON customers FOR DELETE USING (auth.uid() = user_id);

-- Invoices Policies
DROP POLICY IF EXISTS "Users can select their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON invoices;

CREATE POLICY "Users can select their own invoices" ON invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own invoices" ON invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own invoices" ON invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own invoices" ON invoices FOR DELETE USING (auth.uid() = user_id);

-- Invoice Items Policies (Cascade from Invoices table)
DROP POLICY IF EXISTS "Users can select items of their own invoices" ON invoice_items;
DROP POLICY IF EXISTS "Users can insert items to their own invoices" ON invoice_items;
DROP POLICY IF EXISTS "Users can update items in their own invoices" ON invoice_items;
DROP POLICY IF EXISTS "Users can delete items in their own invoices" ON invoice_items;

CREATE POLICY "Users can select items of their own invoices" ON invoice_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
);
CREATE POLICY "Users can insert items to their own invoices" ON invoice_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
);
CREATE POLICY "Users can update items in their own invoices" ON invoice_items FOR UPDATE USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
);
CREATE POLICY "Users can delete items in their own invoices" ON invoice_items FOR DELETE USING (
    EXISTS (SELECT 1 FROM invoices WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid())
);

-- Udhaar Policies
DROP POLICY IF EXISTS "Users can select their own udhaar records" ON udhaar;
DROP POLICY IF EXISTS "Users can insert their own udhaar records" ON udhaar;
DROP POLICY IF EXISTS "Users can update their own udhaar records" ON udhaar;
DROP POLICY IF EXISTS "Users can delete their own udhaar records" ON udhaar;

CREATE POLICY "Users can select their own udhaar records" ON udhaar FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own udhaar records" ON udhaar FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own udhaar records" ON udhaar FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own udhaar records" ON udhaar FOR DELETE USING (auth.uid() = user_id);

-- Shop Profiles Policies
DROP POLICY IF EXISTS "Users can select their own shop profile" ON shop_profiles;
DROP POLICY IF EXISTS "Users can insert their own shop profile" ON shop_profiles;
DROP POLICY IF EXISTS "Users can update their own shop profile" ON shop_profiles;
DROP POLICY IF EXISTS "Users can delete their own shop profile" ON shop_profiles;

CREATE POLICY "Users can select their own shop profile" ON shop_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own shop profile" ON shop_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own shop profile" ON shop_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own shop profile" ON shop_profiles FOR DELETE USING (auth.uid() = user_id);

-- Referrals Policies
DROP POLICY IF EXISTS "Users can select referrals they made" ON referrals;
DROP POLICY IF EXISTS "Users can insert referrals they received or made" ON referrals;

CREATE POLICY "Users can select referrals they made" ON referrals FOR SELECT USING (auth.uid() = referrer_user_id);
CREATE POLICY "Users can insert referrals they received or made" ON referrals FOR INSERT WITH CHECK (auth.uid() = referred_user_id OR auth.uid() = referrer_user_id);



