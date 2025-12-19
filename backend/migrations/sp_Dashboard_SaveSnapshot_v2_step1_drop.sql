-- =============================================
-- STORED PROCEDURE: sp_Dashboard_SaveSnapshot (UPDATED)
-- Purpose: Save or update a dashboard snapshot with manual save support
-- 
-- INSTRUCTIONS FOR DBEAVER (SQL Server 2005-2008):
-- Run Step 1 first, then run Step 2 separately
-- =============================================

-- ============ STEP 1: DROP EXISTING PROCEDURE ============
-- Run this block first
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_Dashboard_SaveSnapshot')
    DROP PROCEDURE sp_Dashboard_SaveSnapshot
