-- ==========================================================
-- JLLB CRM SAAS - DATABASE SCHEMA & SECURITIES CONFIGURATION
-- ==========================================================

-- 1. Create custom type for user roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('Admin', 'PM');
  END IF;
END$$;

-- 2. Create the public profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'PM',
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. RLS SELECT POLICY
-- Allow any authenticated CRM users to read other profiles (crucial for PM collaborative dashboards)
CREATE POLICY "Allow authenticated users to view profiles" 
  ON public.profiles 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- 5. RLS INSERT POLICY
-- Allow profiles to be inserted during user registration
CREATE POLICY "Allow profile inserts on signup"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 6. RLS UPDATE POLICY
-- Allow users to update their own profile records, BUT keep the "role" column completely immutable!
-- This blocks a compromised user account or a rogue PM from escalating their privileges.
CREATE POLICY "Allow users to update own profile except role" 
  ON public.profiles 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    (role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
  );

-- ==========================================================
-- CLIENTS, PROJECTS, AND TASKS MANAGEMENT
-- ==========================================================

-- 7. Create Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Create Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Planning',
  budget NUMERIC NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Create Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  hours_spent NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'To Do',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 11. Create Security Policies
-- Admins/PM data isolation query scoping is handled securely on the server-side Next.js API level,
-- but database-level policies act as standard safety backstops.
CREATE POLICY "Allow authenticated users select access" 
  ON public.clients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users modify access" 
  ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated projects select access" 
  ON public.projects FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated projects modify access" 
  ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated tasks select access" 
  ON public.tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated tasks modify access" 
  ON public.tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==========================================================
-- DUAL-LAYER LOGGING SYSTEM & IMMUTABLE AUDIT LOGS
-- ==========================================================

-- 12. Create Immutable Audit Logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID,
  user_email TEXT NOT NULL,
  user_role TEXT NOT NULL DEFAULT 'PM',
  action_type TEXT NOT NULL,
  table_name TEXT,
  row_id UUID,
  description TEXT NOT NULL
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 13. Audit Log RLS Policies
-- Allow authenticated administrators to read all chronological audit logs
CREATE POLICY "Allow authenticated admins to read audit logs" 
  ON public.audit_logs 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'Admin'
    )
  );

-- No user-facing INSERT, UPDATE or DELETE permissions are granted.
-- Logs are either generated by server service roles or database trigger functions (security definer bypasses RLS)
CREATE POLICY "Block manual insert, update, or deletes"
  ON public.audit_logs FOR ALL TO public USING (false) WITH CHECK (false);

-- 14. PostgreSQL trigger function to log native database mutations
CREATE OR REPLACE FUNCTION public.log_data_mutation()
RETURNS TRIGGER AS $$
DECLARE
  v_email TEXT;
  v_role TEXT;
  v_desc TEXT;
  v_row_id UUID;
BEGIN
  -- 1. Extract email and role from database profiles mapping
  IF auth.uid() IS NOT NULL THEN
    SELECT email, role::TEXT INTO v_email, v_role 
    FROM public.profiles 
    WHERE profiles.id = auth.uid();
  END IF;

  -- Fallback for database direct or system tasks
  IF v_email IS NULL THEN
    v_email := 'system@jllbmedia.com';
    v_role := 'Admin';
  END IF;

  -- 2. Determine targeted row ID and formatted description
  IF TG_OP = 'DELETE' THEN
    v_row_id := OLD.id;
    v_desc := 'Deleted ' || TG_TABLE_NAME || ' record: "' || OLD.name || '"';
  ELSE
    v_row_id := NEW.id;
    v_desc := TG_OP || 'D ' || TG_TABLE_NAME || ' record: "' || NEW.name || '"';
    IF TG_OP = 'UPDATE' THEN
      v_desc := 'Updated ' || TG_TABLE_NAME || ' record: "' || NEW.name || '"';
    ELSIF TG_OP = 'INSERT' THEN
      v_desc := 'Created ' || TG_TABLE_NAME || ' record: "' || NEW.name || '"';
    END IF;
  END IF;

  -- 3. Write native transaction to immutable log table
  INSERT INTO public.audit_logs (
    user_id,
    user_email,
    user_role,
    action_type,
    table_name,
    row_id,
    description
  ) VALUES (
    auth.uid(),
    v_email,
    v_role,
    TG_OP,
    TG_TABLE_NAME,
    v_row_id,
    v_desc
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Bind trigger logs to mutation tables
DROP TRIGGER IF EXISTS trigger_log_clients ON public.clients;
CREATE TRIGGER trigger_log_clients
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.log_data_mutation();

DROP TRIGGER IF EXISTS trigger_log_projects ON public.projects;
CREATE TRIGGER trigger_log_projects
  AFTER INSERT OR UPDATE OR DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.log_data_mutation();

DROP TRIGGER IF EXISTS trigger_log_tasks ON public.tasks;
CREATE TRIGGER trigger_log_tasks
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_data_mutation();


-- ==========================================================
-- BUDGETING SCHEMAS & CALCULATIONS EXTENSION
-- ==========================================================

-- 16. Ensure budgeting columns exist on projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS actual_hours NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS actual_cost NUMERIC NOT NULL DEFAULT 0;

-- 17. Ensure cost per hour column exists on tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS cost_per_hour NUMERIC NOT NULL DEFAULT 0;

-- 18. Project actuals automatic aggregation trigger function
CREATE OR REPLACE FUNCTION public.calculate_project_actuals()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
  ELSE
    v_project_id := NEW.project_id;
  END IF;

  IF v_project_id IS NOT NULL THEN
    UPDATE public.projects
    SET 
      actual_hours = COALESCE((
        SELECT SUM(hours_spent) 
        FROM public.tasks 
        WHERE project_id = v_project_id
      ), 0),
      actual_cost = COALESCE((
        SELECT SUM(hours_spent * cost_per_hour) 
        FROM public.tasks 
        WHERE project_id = v_project_id
      ), 0)
    WHERE id = v_project_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 19. Bind project actuals trigger to tasks mutation events
DROP TRIGGER IF EXISTS trigger_calculate_project_actuals ON public.tasks;
CREATE TRIGGER trigger_calculate_project_actuals
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.calculate_project_actuals();



