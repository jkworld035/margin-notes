-- ============================================================
-- Migration: add bio column to an existing profiles table
-- Only run this if you already ran the original schema.sql
-- (i.e. your profiles table doesn't have a bio column yet).
-- Run in Supabase SQL Editor > New query.
-- ============================================================
alter table public.profiles
  add column if not exists bio text not null default '';
