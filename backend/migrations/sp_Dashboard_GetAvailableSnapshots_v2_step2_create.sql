-- =============================================
-- STORED PROCEDURE: sp_Dashboard_GetAvailableSnapshots (UPDATED)
-- Purpose: List all available periods with detailed snapshot info
-- Separates automatic and manual saves
-- 
-- INSTRUCTIONS FOR DBEAVER (SQL Server 2005-2008):
-- Run sp_Dashboard_GetAvailableSnapshots_v2_step1_drop.sql first!
-- =============================================

CREATE PROCEDURE sp_Dashboard_GetAvailableSnapshots
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Return three result sets:
    -- 1. Periods with their auto-saves (calendar view data)
    -- 2. All dates with auto-saves (for calendar view)
    -- 3. All manual saves
    
    -- Result Set 1: Periods summary with dates that have auto-saves
    SELECT 
        periode,
        MIN(snapshot_date) AS first_snapshot,
        MAX(snapshot_date) AS last_snapshot,
        COUNT(*) AS snapshot_count,
        MAX(CAST(is_month_end AS INT)) AS has_month_end,
        MAX(created_at) AS last_updated
    FROM t_dashboard_snapshots
    WHERE ISNULL(is_manual, 0) = 0
    GROUP BY periode
    ORDER BY periode DESC;
    
    -- Result Set 2: All dates with auto-saves (for calendar view)
    SELECT 
        id,
        periode,
        snapshot_date,
        created_at,
        created_by,
        is_month_end,
        notes
    FROM t_dashboard_snapshots
    WHERE ISNULL(is_manual, 0) = 0
    ORDER BY snapshot_date DESC;
    
    -- Result Set 3: All manual saves
    SELECT 
        id,
        periode,
        snapshot_date,
        created_at,
        created_by,
        is_month_end,
        notes
    FROM t_dashboard_snapshots
    WHERE is_manual = 1
    ORDER BY created_at DESC;
END
