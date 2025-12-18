-- =============================================
-- STORED PROCEDURE: sp_Dashboard_GetAvailableSnapshots
-- Purpose: List all available periods with snapshots
-- =============================================

IF OBJECT_ID('sp_Dashboard_GetAvailableSnapshots', 'P') IS NOT NULL
    DROP PROCEDURE sp_Dashboard_GetAvailableSnapshots;
