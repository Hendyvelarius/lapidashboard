-- =============================================
-- STORED PROCEDURE: sp_Dashboard_SaveSnapshot
-- Purpose: Save or update a dashboard snapshot
-- Run this file AFTER creating the table
-- =============================================

IF OBJECT_ID('sp_Dashboard_SaveSnapshot', 'P') IS NOT NULL
    DROP PROCEDURE sp_Dashboard_SaveSnapshot;
