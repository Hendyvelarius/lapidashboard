-- =============================================
-- STORED PROCEDURE: sp_Dashboard_GetSnapshot
-- Purpose: Get a specific snapshot by date or periode
-- =============================================

CREATE PROCEDURE sp_Dashboard_GetSnapshot
    @periode VARCHAR(6) = NULL,
    @snapshot_date DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    IF @snapshot_date IS NOT NULL
    BEGIN
        -- Get by specific date
        SELECT * FROM t_dashboard_snapshots WHERE snapshot_date = @snapshot_date;
    END
    ELSE IF @periode IS NOT NULL
    BEGIN
        -- Get latest snapshot for the periode (preferring month-end)
        SELECT TOP 1 * 
        FROM t_dashboard_snapshots 
        WHERE periode = @periode
        ORDER BY is_month_end DESC, snapshot_date DESC;
    END
    ELSE
    BEGIN
        -- Return empty if no parameters provided
        SELECT * FROM t_dashboard_snapshots WHERE 1 = 0;
    END
END;
