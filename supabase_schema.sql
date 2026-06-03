-- InvoicePe Schema for Supabase
-- Paste these commands in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Customers Table (Each user gets their own customer list)
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

-- 2. Invoices Table (Each user gets their own invoices list)
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

-- If table is already created, make sure the gst_rate and gst_type columns exist
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_rate NUMERIC NOT NULL DEFAULT 18;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gst_type TEXT NOT NULL DEFAULT 'exclusive';

-- Indexes for invoice querying and filtering
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices (customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices (user_id);

-- 3. Invoice Items Table
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

-- Enable RLS (Row Level Security) - Strict user-level separation
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for secure data isolation (User can only read/write their own records)

-- Customers Policies
CREATE POLICY "Users can select their own customers" ON customers 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customers" ON customers 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers" ON customers 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers" ON customers 
    FOR DELETE USING (auth.uid() = user_id);

-- Invoices Policies
CREATE POLICY "Users can select their own invoices" ON invoices 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own invoices" ON invoices 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices" ON invoices 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices" ON invoices 
    FOR DELETE USING (auth.uid() = user_id);

-- Invoice Items Policies (Cascade from Invoices table)
CREATE POLICY "Users can select items of their own invoices" ON invoice_items 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM invoices 
            WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert items to their own invoices" ON invoice_items 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices 
            WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update items in their own invoices" ON invoice_items 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM invoices 
            WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete items in their own invoices" ON invoice_items 
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM invoices 
            WHERE invoices.id = invoice_items.invoice_id AND invoices.user_id = auth.uid()
        )
    );
