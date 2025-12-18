-- =============================================
-- STORED PROCEDURE: sp_Dashboard_DeleteSnapshot
-- Purpose: Delete a specific snapshot
-- =============================================

IF OBJECT_ID('sp_Dashboard_DeleteSnapshot', 'P') IS NOT NULL
    DROP PROCEDURE sp_Dashboard_DeleteSnapshot;
