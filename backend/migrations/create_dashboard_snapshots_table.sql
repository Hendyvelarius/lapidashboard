-- =============================================
-- CREATE TABLE: t_dashboard_snapshots
-- Purpose: Store historical snapshots of dashboard data
-- =============================================
-- 
-- This table stores JSON snapshots of the summary dashboard data
-- allowing users to view historical data from previous periods.
-- 
-- Rules:
-- 1. Only one snapshot per day (same date overwrites)
-- 2. Month-end snapshots are marked with is_month_end = 1
-- 3. Auto-save runs at 18:00 on the last day of each month
--
-- INSTRUCTIONS FOR DBEAVER:
-- Run this file first to create the table.
-- Then run each sp_Dashboard_*.sql file separately for procedures.
-- =============================================

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 't_dashboard_snapshots')
BEGIN
    CREATE TABLE t_dashboard_snapshots (
        id INT IDENTITY(1,1) PRIMARY KEY,
        periode VARCHAR(6) NOT NULL,              -- YYYYMM format (e.g., '202512')
        snapshot_date DATE NOT NULL,              -- The actual date of the snapshot
        raw_data NVARCHAR(MAX) NOT NULL,          -- JSON blob containing all raw data
        processed_data NVARCHAR(MAX) NOT NULL,    -- JSON blob containing processed/calculated data
        created_at DATETIME DEFAULT GETDATE(),
        created_by VARCHAR(100) DEFAULT 'SYSTEM', -- Username or 'SYSTEM' for auto-save
        is_month_end BIT DEFAULT 0,               -- 1 = Official end-of-month snapshot
        notes NVARCHAR(500) NULL,                 -- Optional notes
        
        -- Ensure only one snapshot per date
        CONSTRAINT UQ_dashboard_snapshot_date UNIQUE (snapshot_date)
    );

    -- Create index on periode for faster lookups
    CREATE INDEX IX_dashboard_snapshots_periode ON t_dashboard_snapshots(periode);
    
    -- Create index on snapshot_date for faster lookups
    CREATE INDEX IX_dashboard_snapshots_date ON t_dashboard_snapshots(snapshot_date);

    PRINT 'Table t_dashboard_snapshots created successfully';
END
ELSE
BEGIN
    PRINT 'Table t_dashboard_snapshots already exists';
END;
