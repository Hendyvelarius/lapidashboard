-- =============================================
-- MIGRATION: Copy existing snapshot data from lapifactory to LAPI_Report
--
-- Purpose: One-time migration to move all existing snapshot rows
--          from [lapifactory].[dbo].[t_dashboard_snapshots]
--          to   [LAPI_Report].[dbo].[t_dashboard_snapshots]
--
-- PREREQUISITES:
--   - Run setup_snapshots_LAPI_Report.sql first to create the table & SPs
--   - Both databases must be on the same server
--
-- INSTRUCTIONS:
--   1. Connect to the SQL Server instance in DBeaver / SSMS
--   2. Run this script once
--   3. Verify row counts match
--   4. (Optional) Drop the old table from lapifactory when ready
-- =============================================

SET IDENTITY_INSERT [LAPI_Report].[dbo].[t_dashboard_snapshots] ON;

-- Insert manual saves first (no uniqueness constraint issues)
INSERT INTO [LAPI_Report].[dbo].[t_dashboard_snapshots]
    (id, periode, snapshot_date, raw_data, processed_data, created_at, created_by, is_month_end, is_manual, notes)
SELECT
    id, periode, snapshot_date, raw_data, processed_data, created_at, created_by, is_month_end, 1, notes
FROM [lapifactory].[dbo].[t_dashboard_snapshots]
WHERE ISNULL(is_manual, 0) = 1;

-- Insert auto-saves, keeping only the latest row per date to respect the unique filtered index
INSERT INTO [LAPI_Report].[dbo].[t_dashboard_snapshots]
    (id, periode, snapshot_date, raw_data, processed_data, created_at, created_by, is_month_end, is_manual, notes)
SELECT
    s.id, s.periode, s.snapshot_date, s.raw_data, s.processed_data, s.created_at, s.created_by, s.is_month_end, 0, s.notes
FROM [lapifactory].[dbo].[t_dashboard_snapshots] s
INNER JOIN (
    SELECT snapshot_date, MAX(id) AS max_id
    FROM [lapifactory].[dbo].[t_dashboard_snapshots]
    WHERE ISNULL(is_manual, 0) = 0
    GROUP BY snapshot_date
) latest ON s.id = latest.max_id;

SET IDENTITY_INSERT [LAPI_Report].[dbo].[t_dashboard_snapshots] OFF;

-- Verify
SELECT 
    'lapifactory' AS [source], COUNT(*) AS row_count FROM [lapifactory].[dbo].[t_dashboard_snapshots]
UNION ALL
SELECT 
    'LAPI_Report' AS [source], COUNT(*) AS row_count FROM [LAPI_Report].[dbo].[t_dashboard_snapshots];

PRINT '✅ Snapshot data migration complete. Verify row counts above.';
GO
