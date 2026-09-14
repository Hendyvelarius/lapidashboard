-- =============================================
-- Processing Control Tower -- app-owned tables (LAPI_Report)
--
-- The backend creates these itself on first use
-- (backend/src/models/controlTowerModel.js -> ensureTables), so running this
-- script is optional. It is kept here so the schema is documented and can be
-- applied by hand on a database where the app user lacks CREATE TABLE.
-- =============================================

USE [LAPI_Report];
GO

-- Yellow-alert thresholds. One row per department plus '*' as the default.
-- Red (an instant tap: work time under 2 minutes) is fixed in code and is NOT
-- configurable here on purpose.
IF OBJECT_ID('dbo.ct_threshold', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.ct_threshold (
    dept            VARCHAR(10)   NOT NULL PRIMARY KEY,  -- '*' | PN1 | PN2 | PC | QC | QA | MC
    fast_ratio      DECIMAL(6,3)  NOT NULL,              -- yellow when actual/standard <= this (e.g. 0.5)
    slow_ratio      DECIMAL(6,3)  NOT NULL,              -- yellow when actual/standard >= this (e.g. 2.0)
    updated_by      VARCHAR(20)   NULL,
    updated_by_name NVARCHAR(100) NULL,
    updated_at      DATETIME      NOT NULL DEFAULT GETDATE()
  );
  INSERT INTO dbo.ct_threshold (dept, fast_ratio, slow_ratio) VALUES ('*', 0.5, 2.0);
END;
GO

-- One acknowledgement per logical process step (Batch_No, seq_id, No_urut).
-- The alert is snapshotted on the row so the record still reads correctly
-- after thresholds or master lead times change.
IF OBJECT_ID('dbo.ct_alert_ack', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.ct_alert_ack (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    batch_no      NVARCHAR(50)  NOT NULL,
    seq_id        INT           NOT NULL,
    no_urut       INT           NOT NULL,
    product_id    VARCHAR(50)   NULL,
    product_name  NVARCHAR(200) NULL,
    kode_tahapan  INT           NULL,
    nama_tahapan  NVARCHAR(200) NULL,
    dept          VARCHAR(10)   NULL,       -- resolved dept (PN1/PN2/PC/QC/QA/MC)
    severity      VARCHAR(10)   NULL,       -- red | yellow
    duration_min  DECIMAL(12,1) NULL,       -- summed working segments
    standard_min  INT           NULL,
    ratio_pct     DECIMAL(12,1) NULL,       -- actual / standard * 100
    start_date    DATETIME      NULL,
    end_date      DATETIME      NULL,
    pic           NVARCHAR(400) NULL,       -- worker names, '|' separated
    ack_status    VARCHAR(20)   NOT NULL,   -- mistap | valid | followup | other
    ack_note      NVARCHAR(1000) NULL,
    ack_by        VARCHAR(20)   NOT NULL,   -- log_NIK
    ack_by_name   NVARCHAR(100) NULL,
    ack_dept      VARCHAR(10)   NULL,
    ack_at        DATETIME      NOT NULL DEFAULT GETDATE()
  );
  CREATE UNIQUE INDEX UX_ct_alert_ack_step ON dbo.ct_alert_ack (batch_no, seq_id, no_urut);
  CREATE INDEX IX_ct_alert_ack_end ON dbo.ct_alert_ack (dept, end_date);
  CREATE INDEX IX_ct_alert_ack_at ON dbo.ct_alert_ack (ack_at);
END;
GO
