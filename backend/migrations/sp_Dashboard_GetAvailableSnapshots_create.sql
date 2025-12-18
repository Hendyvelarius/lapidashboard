-- =============================================
-- STORED PROCEDURE: sp_Dashboard_GetAvailableSnapshots
-- Purpose: List all available periods with snapshots
-- =============================================

CREATE PROCEDURE sp_Dashboard_GetAvailableSnapshots
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        periode,
        MIN(snapshot_date) AS first_snapshot,
        MAX(snapshot_date) AS last_snapshot,
        COUNT(*) AS snapshot_count,
        MAX(CAST(is_month_end AS INT)) AS has_month_end,
        MAX(created_at) AS last_updated
    FROM t_dashboard_snapshots
    GROUP BY periode
    ORDER BY periode DESC;
END;
