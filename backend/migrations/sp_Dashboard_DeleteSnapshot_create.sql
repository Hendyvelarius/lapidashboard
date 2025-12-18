-- =============================================
-- STORED PROCEDURE: sp_Dashboard_DeleteSnapshot
-- Purpose: Delete a specific snapshot
-- =============================================

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
