-- =============================================
-- STORED PROCEDURE: sp_Dashboard_GetSnapshot
-- Purpose: Get a specific snapshot by date or periode
-- =============================================

IF OBJECT_ID('sp_Dashboard_GetSnapshot', 'P') IS NOT NULL
    DROP PROCEDURE sp_Dashboard_GetSnapshot;
