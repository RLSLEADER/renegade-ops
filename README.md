-- ============================================================
-- RENEGADE LAND TITLE & LEASING — Supabase Database Schema
-- Run this in Supabase SQL Editor after creating your project
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USERS / ROLES ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'landman', 'sales')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── PERMITS / DB MINING ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS permits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  operator TEXT NOT NULL,
  source TEXT NOT NULL,
  county TEXT,
  state TEXT NOT NULL,
  sector TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  date DATE,
  flagged BOOLEAN DEFAULT false,
  added_to_crm BOOLEAN DEFAULT false,
  score INTEGER,
  urgency TEXT,
  fit_reason TEXT,
  notes TEXT,
  created_by UUID REFERENCES team_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── PROJECTS & ORDERS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client TEXT NOT NULL,
  type TEXT NOT NULL,
  state TEXT NOT NULL,
  sector TEXT NOT NULL,
  tracts INTEGER DEFAULT 1,
  assigned TEXT,
  assigned_id UUID REFERENCES team_members(id),
  due_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','pending','review','overdue','complete')),
  value NUMERIC DEFAULT 0,
  invoiced BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES team_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── VENDOR REGISTRATION ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company TEXT NOT NULL,
  type TEXT,
  states TEXT[] DEFAULT '{}',
  submitted DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','submitted','review','approved')),
  champion TEXT,
  champion_title TEXT,
  portal TEXT,
  next_step TEXT,
  insurance_ok BOOLEAN DEFAULT false,
  w9 BOOLEAN DEFAULT false,
  msa BOOLEAN DEFAULT false,
  duns BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES team_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RETAINER CLIENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retainers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client TEXT NOT NULL,
  type TEXT,
  fee NUMERIC DEFAULT 0,
  hours INTEGER DEFAULT 0,
  rush_orders INTEGER DEFAULT 0,
  sla TEXT,
  term TEXT,
  renew_date DATE,
  champion TEXT,
  champion_title TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retainer_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  retainer_id UUID REFERENCES retainers(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  received DATE,
  due_date DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retainer_pipeline (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  prospect TEXT NOT NULL,
  stage TEXT DEFAULT 'active',
  action TEXT,
  priority TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── PERIPHERAL LEADS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS peripheral_leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  state TEXT NOT NULL,
  basin TEXT,
  sector TEXT,
  client TEXT,
  scope TEXT,
  model TEXT,
  premium INTEGER DEFAULT 15,
  status TEXT DEFAULT 'qualifying',
  contacted DATE,
  notes TEXT,
  created_by UUID REFERENCES team_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── REVENUE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  month TEXT NOT NULL,
  sector TEXT NOT NULL,
  state TEXT NOT NULL,
  type TEXT NOT NULL,
  client TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  created_by UUID REFERENCES team_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── AGENT ACTIVITY LOG ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  action TEXT NOT NULL,
  tool TEXT,
  result JSONB,
  approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES team_members(id),
  created_by UUID REFERENCES team_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────
ALTER TABLE permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE retainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE retainer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE retainer_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE peripheral_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read/write (role enforcement in app)
CREATE POLICY "authenticated_all" ON permits FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON projects FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON vendors FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON retainers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON retainer_orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON retainer_pipeline FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON peripheral_leads FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON revenue FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON agent_log FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_all" ON team_members FOR ALL USING (auth.role() = 'authenticated');

-- ── UPDATED_AT TRIGGER ───────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON permits FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON retainers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON peripheral_leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── SEED: INSERT DEFAULT ADMIN ────────────────────────────────
-- Run this after signing up in your app to make yourself admin:
-- UPDATE team_members SET role = 'admin' WHERE email = 'your@email.com';

COMMENT ON TABLE permits IS 'DB Mining — permit and database feed entries';
COMMENT ON TABLE projects IS 'Projects & Orders — active title and leasing work';
COMMENT ON TABLE vendors IS 'Vendor Registration — company approval tracking';
COMMENT ON TABLE retainers IS 'Retainer Clients — monthly recurring relationships';
COMMENT ON TABLE peripheral_leads IS 'Peripheral Lead Router — out-of-territory leads';
COMMENT ON TABLE revenue IS 'Financial Dashboard — revenue entries by month/sector/state';
