-- =============================================
-- STORED PROCEDURE: sp_Dashboard_SaveSnapshot (UPDATED)
-- Purpose: Save or update a dashboard snapshot with manual save support
-- Run this file AFTER running the alter_snapshots_support_manual.sql migration
-- =============================================

-- Drop existing procedure first
IF EXISTS (SELECT * FROM sys.procedures WHERE name = 'sp_Dashboard_SaveSnapshot')
BEGIN
    DROP PROCEDURE sp_Dashboard_SaveSnapshot;
END;
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
    
    -- For auto-saves (is_manual = 0): Update existing or insert new
    -- For manual saves (is_manual = 1): Always insert new
    
    IF @is_manual = 0
    BEGIN
        -- Auto-save logic: only one per date
        IF EXISTS (SELECT 1 FROM t_dashboard_snapshots WHERE snapshot_date = @snapshot_date AND is_manual = 0)
        BEGIN
            -- Update existing auto-save
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
            -- Insert new auto-save
            INSERT INTO t_dashboard_snapshots (periode, snapshot_date, raw_data, processed_data, created_by, is_month_end, is_manual, notes)
            VALUES (@periode, @snapshot_date, @raw_data, @processed_data, @created_by, @is_month_end, 0, @notes);
            
            SELECT 'inserted' AS result, 1 AS affected_rows, SCOPE_IDENTITY() AS new_id;
        END
    END
    ELSE
    BEGIN
        -- Manual save: always insert new
        INSERT INTO t_dashboard_snapshots (periode, snapshot_date, raw_data, processed_data, created_by, is_month_end, is_manual, notes)
        VALUES (@periode, @snapshot_date, @raw_data, @processed_data, @created_by, @is_month_end, 1, @notes);
        
        SELECT 'inserted' AS result, 1 AS affected_rows, SCOPE_IDENTITY() AS new_id;
    END
END;
GO
