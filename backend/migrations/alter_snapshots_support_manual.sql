-- =============================================
-- ALTER TABLE: t_dashboard_snapshots
-- Purpose: Support multiple snapshots per date (manual saves)
-- =============================================
-- 
-- Changes:
-- 1. Add 'is_manual' column to distinguish manual vs automatic saves
-- 2. Remove unique constraint on snapshot_date
-- 3. Add new unique constraint: (snapshot_date, is_manual) for auto saves only
--    This allows one auto-save per date, but unlimited manual saves
-- =============================================

-- Step 1: Add is_manual column if it doesn't exist
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('t_dashboard_snapshots') AND name = 'is_manual')
BEGIN
    ALTER TABLE t_dashboard_snapshots
    ADD is_manual BIT DEFAULT 0;
    
    PRINT 'Added is_manual column';
END;

-- Step 2: Drop the old unique constraint on snapshot_date
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_dashboard_snapshot_date' AND object_id = OBJECT_ID('t_dashboard_snapshots'))
BEGIN
    ALTER TABLE t_dashboard_snapshots
    DROP CONSTRAINT UQ_dashboard_snapshot_date;
    
    PRINT 'Dropped old unique constraint UQ_dashboard_snapshot_date';
END;

-- Step 3: Create a filtered unique index for auto-saves only
-- This allows only one auto-save per date, but unlimited manual saves
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_dashboard_snapshot_auto_per_date' AND object_id = OBJECT_ID('t_dashboard_snapshots'))
BEGIN
    CREATE UNIQUE INDEX UQ_dashboard_snapshot_auto_per_date 
    ON t_dashboard_snapshots(snapshot_date)
    WHERE is_manual = 0;
    
    PRINT 'Created filtered unique index for auto-saves';
END;

-- Step 4: Create index on is_manual for faster filtering
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_dashboard_snapshots_is_manual' AND object_id = OBJECT_ID('t_dashboard_snapshots'))
BEGIN
    CREATE INDEX IX_dashboard_snapshots_is_manual ON t_dashboard_snapshots(is_manual);
    
    PRINT 'Created index on is_manual';
END;

PRINT 'Migration completed successfully';
