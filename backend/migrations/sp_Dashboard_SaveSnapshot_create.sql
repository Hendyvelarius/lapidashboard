-- =============================================
-- STORED PROCEDURE: sp_Dashboard_SaveSnapshot
-- Purpose: Save or update a dashboard snapshot
-- Run this file AFTER running the _drop.sql file
-- =============================================

CREATE PROCEDURE sp_Dashboard_SaveSnapshot
    @periode VARCHAR(6),
    @snapshot_date DATE,
    @raw_data NVARCHAR(MAX),
    @processed_data NVARCHAR(MAX),
    @created_by VARCHAR(100) = 'SYSTEM',
    @is_month_end BIT = 0,
    @notes NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Check if snapshot for this date already exists
    IF EXISTS (SELECT 1 FROM t_dashboard_snapshots WHERE snapshot_date = @snapshot_date)
    BEGIN
        -- Update existing snapshot
        UPDATE t_dashboard_snapshots
        SET 
            periode = @periode,
            raw_data = @raw_data,
            processed_data = @processed_data,
            created_at = GETDATE(),
            created_by = @created_by,
            is_month_end = CASE WHEN @is_month_end = 1 THEN 1 ELSE is_month_end END,
            notes = ISNULL(@notes, notes)
        WHERE snapshot_date = @snapshot_date;
        
        SELECT 'updated' AS result, @@ROWCOUNT AS affected_rows;
    END
    ELSE
    BEGIN
        -- Insert new snapshot
        INSERT INTO t_dashboard_snapshots (periode, snapshot_date, raw_data, processed_data, created_by, is_month_end, notes)
        VALUES (@periode, @snapshot_date, @raw_data, @processed_data, @created_by, @is_month_end, @notes);
        
        SELECT 'inserted' AS result, SCOPE_IDENTITY() AS new_id;
    END
END;
