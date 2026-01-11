-- Enable PostGIS for spatial queries and UUID for IDs
create extension if not exists "postgis";
create extension if not exists "uuid-ossp";

-- Create specific enums
create type report_status as enum ('pending', 'verified', 'in_progress', 'resolved', 'rejected');

-- Main Reports Table
create table if not exists public.reports (
    id uuid default uuid_generate_v4() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- Reporter Info (optional if anonymous, but linked to auth.users if signed in)
    user_id uuid references auth.users(id),
    
    -- Image Data
    image_url text not null,
    
    -- Spatial Data (Lat/Long stored as Geography Point)
    location geography(POINT, 4326) not null,
    
    -- AI Classification Results
    issue_type text not null, -- e.g., "Pothole", "Broken Streetlight"
    severity_score integer check (severity_score >= 1 and severity_score <= 10),
    materials_required jsonb default '[]'::jsonb, -- AI extracted list
    estimated_labor_hours numeric(5, 2), -- AI estimated
    
    -- Status tracking
    status report_status default 'pending',
    
    -- Admin/Fiscal Data
    manual_inspection_cost_estimate numeric(10, 2) default 150.00 -- Default placeholder for calculus
);

-- Spatial Index for fast map clustering and neighborhood analytics
create index if not exists reports_location_idx on public.reports using gist (location);

-- RLS Policies (Row Level Security)
alter table public.reports enable row level security;

-- Policy: Everyone can read reports (Public Monitor)
create policy "Public reports are viewable by everyone"
    on public.reports for select
    using (true);

-- Policy: Authenticated users can insert reports (Reporter App)
-- Note: In a real app, might allow anon uploads too, but sticking to auth for robustness
create policy "Authenticated users can upload reports"
    on public.reports for insert
    with check (auth.role() = 'authenticated');

-- Policy: Only admins can update status (Simplified: assume service_role or specific admin claim)
-- Leaving user update restricted for now.

-- Create Storage Bucket for Reports
insert into storage.buckets (id, name, public) values ('reports', 'reports', true)
on conflict (id) do nothing;

create policy "Reports images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'reports' );

create policy "Authenticated users can upload images"
  on storage.objects for insert
  with check ( bucket_id = 'reports' and auth.role() = 'authenticated' );
