-- =============================================
-- MIGRATION: Setup snapshot objects in LAPI_Report database
-- 
-- Purpose: Create t_dashboard_snapshots table and all related
--          stored procedures in the LAPI_Report database.
--          This migrates the snapshot feature away from lapifactory.
--
-- INSTRUCTIONS:
--   1. Connect to LAPI_Report database in DBeaver / SSMS
--   2. Run this entire script
--   3. (Optional) Run migrate_snapshot_data_to_LAPI_Report.sql
--      to copy existing snapshot rows from lapifactory
-- =============================================

USE [LAPI_Report];
GO

-- =============================================
-- 1. CREATE TABLE
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 't_dashboard_snapshots')
BEGIN
    CREATE TABLE t_dashboard_snapshots (
        id INT IDENTITY(1,1) PRIMARY KEY,
        periode VARCHAR(6) NOT NULL,
        snapshot_date DATE NOT NULL,
        raw_data NVARCHAR(MAX) NOT NULL,
        processed_data NVARCHAR(MAX) NOT NULL,
        created_at DATETIME DEFAULT GETDATE(),
        created_by VARCHAR(100) DEFAULT 'SYSTEM',
        is_month_end BIT DEFAULT 0,
        is_manual BIT DEFAULT 0,
        notes NVARCHAR(500) NULL
    );

    CREATE INDEX IX_dashboard_snapshots_periode ON t_dashboard_snapshots(periode);
    CREATE INDEX IX_dashboard_snapshots_date ON t_dashboard_snapshots(snapshot_date);

    -- Filtered unique index: one auto-save per date, unlimited manual saves
    CREATE UNIQUE INDEX UQ_dashboard_snapshot_auto_per_date 
    ON t_dashboard_snapshots(snapshot_date)
    WHERE is_manual = 0;

    PRINT 'Table t_dashboard_snapshots created successfully in LAPI_Report';
END
ELSE
BEGIN
    PRINT 'Table t_dashboard_snapshots already exists in LAPI_Report';

    -- Make sure is_manual column exists (in case table was partially migrated)
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('t_dashboard_snapshots') AND name = 'is_manual')
    BEGIN
        ALTER TABLE t_dashboard_snapshots ADD is_manual BIT DEFAULT 0;
        PRINT 'Added is_manual column';
    END;
END;
GO

-- =============================================
-- 2. STORED PROCEDURE: sp_Dashboard_SaveSnapshot
-- =============================================
IF OBJECT_ID('sp_Dashboard_SaveSnapshot', 'P') IS NOT NULL
    DROP PROCEDURE sp_Dashboard_SaveSnapshot;
GO

CREATE PROCEDURE sp_Dashboard_SaveSnapshot
    @periode VARCHAR(6),
    @snapshot_date DATE,
    @raw_data NVARCHAR(MAX),
    @processed_data NVARCHAR(MAX),
    @created_by VARCHAR(100) = 'SYSTEM',
    @is_month_end BIT = 0,
    @is_manual BIT = 0,
    @notes NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @is_manual = 0
    BEGIN
        IF EXISTS (SELECT 1 FROM t_dashboard_snapshots WHERE snapshot_date = @snapshot_date AND is_manual = 0)
        BEGIN
            UPDATE t_dashboard_snapshots
            SET 
                periode = @periode,
                raw_data = @raw_data,
                processed_data = @processed_data,
                created_at = GETDATE(),
                created_by = @created_by,
                is_month_end = CASE WHEN @is_month_end = 1 THEN 1 ELSE is_month_end END,
                notes = ISNULL(@notes, notes)
            WHERE snapshot_date = @snapshot_date AND is_manual = 0;

            SELECT 'updated' AS result, @@ROWCOUNT AS affected_rows, NULL AS new_id;
        END
        ELSE
        BEGIN
            INSERT INTO t_dashboard_snapshots (periode, snapshot_date, raw_data, processed_data, created_by, is_month_end, is_manual, notes)
            VALUES (@periode, @snapshot_date, @raw_data, @processed_data, @created_by, @is_month_end, 0, @notes);

            SELECT 'inserted' AS result, 1 AS affected_rows, SCOPE_IDENTITY() AS new_id;
        END
    END
    ELSE
    BEGIN
        INSERT INTO t_dashboard_snapshots (periode, snapshot_date, raw_data, processed_data, created_by, is_month_end, is_manual, notes)
        VALUES (@periode, @snapshot_date, @raw_data, @processed_data, @created_by, @is_month_end, 1, @notes);

        SELECT 'inserted' AS result, 1 AS affected_rows, SCOPE_IDENTITY() AS new_id;
    END
END;
GO

-- =============================================
-- 3. STORED PROCEDURE: sp_Dashboard_GetSnapshot
-- =============================================
IF OBJECT_ID('sp_Dashboard_GetSnapshot', 'P') IS NOT NULL
    DROP PROCEDURE sp_Dashboard_GetSnapshot;
GO

CREATE PROCEDURE sp_Dashboard_GetSnapshot
    @periode VARCHAR(6) = NULL,
    @snapshot_date DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @snapshot_date IS NOT NULL
    BEGIN
        SELECT * FROM t_dashboard_snapshots WHERE snapshot_date = @snapshot_date;
    END
    ELSE IF @periode IS NOT NULL
    BEGIN
        SELECT TOP 1 * 
        FROM t_dashboard_snapshots 
        WHERE periode = @periode
        ORDER BY is_month_end DESC, snapshot_date DESC;
    END
    ELSE
    BEGIN
        SELECT * FROM t_dashboard_snapshots WHERE 1 = 0;
    END
END;
GO

-- =============================================
-- 4. STORED PROCEDURE: sp_Dashboard_GetAvailableSnapshots
-- =============================================
IF OBJECT_ID('sp_Dashboard_GetAvailableSnapshots', 'P') IS NOT NULL
    DROP PROCEDURE sp_Dashboard_GetAvailableSnapshots;
GO

CREATE PROCEDURE sp_Dashboard_GetAvailableSnapshots
AS
BEGIN
    SET NOCOUNT ON;

    -- Result Set 1: Period summaries (auto-saves only)
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

    -- Result Set 2: All auto-save dates
    SELECT 
        id, periode, snapshot_date, created_at,
        created_by, is_month_end, notes
    FROM t_dashboard_snapshots
    WHERE ISNULL(is_manual, 0) = 0
    ORDER BY snapshot_date DESC;

    -- Result Set 3: All manual saves
    SELECT 
        id, periode, snapshot_date, created_at,
        created_by, is_month_end, notes
    FROM t_dashboard_snapshots
    WHERE is_manual = 1
    ORDER BY created_at DESC;
END;
GO

-- =============================================
-- 5. STORED PROCEDURE: sp_Dashboard_DeleteSnapshot
-- =============================================
IF OBJECT_ID('sp_Dashboard_DeleteSnapshot', 'P') IS NOT NULL
    DROP PROCEDURE sp_Dashboard_DeleteSnapshot;
GO

CREATE PROCEDURE sp_Dashboard_DeleteSnapshot
    @id INT = NULL,
    @snapshot_date DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @id IS NOT NULL
    BEGIN
        DELETE FROM t_dashboard_snapshots WHERE id = @id;
    END
    ELSE IF @snapshot_date IS NOT NULL
    BEGIN
        DELETE FROM t_dashboard_snapshots WHERE snapshot_date = @snapshot_date;
    END

    SELECT @@ROWCOUNT AS deleted_rows;
END;
GO

PRINT '✅ All snapshot objects created successfully in LAPI_Report';
GO
