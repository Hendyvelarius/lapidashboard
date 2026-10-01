-- =============================================
-- OF1 target audit -- app-owned table (LAPI_Report)
--
-- Records who changed m_target_of1_dashboard.PersenTarget and when. One row
-- per product whose value actually changed; all rows written by one save share
-- a save_id. Rows are written in the same transaction as the target update
-- (backend/src/models/sqlModel.js -> saveOF1TargetConfig), so a change can
-- never be committed without its audit entry.
--
-- The backend creates this table itself on first use (ensureOF1AuditTable),
-- so running this script is optional. It is kept here so the schema is
-- documented and can be applied by hand where the app user lacks CREATE TABLE.
-- =============================================

USE [LAPI_Report];
GO

IF OBJECT_ID('dbo.of1_target_audit', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.of1_target_audit (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    save_id         UNIQUEIDENTIFIER NOT NULL,       -- groups the rows written by one save
    periode         VARCHAR(6)       NOT NULL,       -- YYYYMM of the target that changed
    product_id      NVARCHAR(20)     NOT NULL,
    old_pct         INT              NULL,           -- NULL = product had no row (SP falls back to 130%)
    new_pct         INT              NULL,           -- NULL = row removed
    changed_by      VARCHAR(20)      NOT NULL,       -- log_NIK from the user's token
    changed_by_name NVARCHAR(100)    NULL,
    changed_by_dept VARCHAR(10)      NULL,
    client_ip       VARCHAR(64)      NULL,
    changed_at      DATETIME         NOT NULL DEFAULT GETDATE()
  );

  CREATE INDEX IX_of1_target_audit_periode ON dbo.of1_target_audit (periode, changed_at DESC);
  CREATE INDEX IX_of1_target_audit_product ON dbo.of1_target_audit (product_id, periode);
END;
GO
