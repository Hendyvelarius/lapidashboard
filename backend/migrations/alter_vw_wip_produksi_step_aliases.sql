-- =============================================
-- vw_wip_produksi -- WIP start fallback matches the renamed Terima BB
--
-- Changes against vw_wip_produksi_before_step_aliases.sql (the definition
-- that was live before; run that file to roll back):
--
-- 1. mulaiProd matched 'Terima Bahan Baku' by name. It is the fallback that
--    admits a batch with no 'Timbang BB' step into WIP and dates its start.
--    CAL-95's new master route (Oct 2026) uses the new step 331 'Terima BB'
--    instead of 135, and t_alur_proses copies code and name when a route is
--    created. It now matches either name (TERIMA_BB in
--    backend/src/utils/routeSteps.js). Not by code: the join is not
--    aggregated, and code 135 also carries numbered rows ('Terima Bahan Baku
--    5') that would add a second, differently dated row for the same batch.
--    Results are unchanged for existing batches.
-- =============================================
ALTER VIEW [dbo].[vw_wip_produksi]
AS
WITH tmp AS (
    SELECT DISTINCT CAST(a.product_id+'_'+a.Batch_No +'_'+a.Batch_Date AS VARCHAR(255)) AS ID,
        a.nama_tahapan, CAST('Pending' AS VARCHAR(50)) AS Status, a.kode_tahapan, a.Urutan, a.dept
    FROM t_alur_proses a
    LEFT JOIN t_alur_proses b ON ISNULL(a.Prev_Step,'')=b.nama_tahapan AND a.Batch_No=b.Batch_No AND a.Batch_Date=b.Batch_Date AND a.Product_ID=b.Product_ID
    WHERE a.StartDate IS NULL AND a.EndDate IS NULL AND b.StatusPending IS NOT NULL AND b.nama_tahapan IS NOT NULL
    UNION ALL
    SELECT a.product_id+'_'+a.Batch_No +'_'+a.Batch_Date, a.nama_tahapan, 'On Progress', a.kode_tahapan, a.Urutan, a.dept
    FROM t_alur_proses a WHERE a.StartDate IS NOT NULL AND a.EndDate IS NULL
    UNION ALL
    SELECT a.product_id+'_'+a.Batch_No +'_'+a.Batch_Date, a.nama_tahapan, 'Idle', a.kode_tahapan, a.Urutan, a.dept
    FROM t_alur_proses a WHERE a.Display=1 AND a.StartDate IS NULL AND a.EndDate IS NULL
)
SELECT DISTINCT f.product_id, f.Product_Name, b.Batch_No,
    CONVERT(VARCHAR(10), ISNULL(tgl.EndDate, ISNULL(tgl.StartDate, mulaiProd.EndDate)), 120) + ' ' +
      CONVERT(VARCHAR(5), ISNULL(tgl.EndDate, ISNULL(tgl.StartDate, mulaiProd.EndDate)), 108) AS [Tgl Timbang],
    DATEDIFF(DAY, ISNULL(tgl.EndDate, ISNULL(tgl.StartDate, mulaiProd.EndDate)), GETDATE()) AS [Hari WIP],
    STUFF((SELECT ';' + t2.Status + '#(' + t2.dept + ') ' + t2.nama_tahapan FROM tmp t2
        WHERE t2.ID = b.product_id+'_'+b.Batch_No +'_'+b.Batch_Date ORDER BY t2.Urutan
        FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 1, '') AS [Tahapan Berjalan],
    CONVERT(VARCHAR(10), i.Process_Date, 120) + ' ' + CONVERT(VARCHAR(5), i.Process_Date, 108) AS [Close BPHP],
    CONVERT(VARCHAR(10), GETDATE(), 120) + ' ' + CONVERT(VARCHAR(5), GETDATE(), 108) AS [Tanggal Penarikan]
FROM t_alur_proses b
JOIN (SELECT DISTINCT Batch_No, Batch_Date, Product_ID FROM t_rfid_batch_card WHERE Batch_Status='Open' AND isActive=1 AND Batch_No<>'') c
    ON c.Batch_No=b.Batch_No AND c.Batch_Date=b.Batch_Date AND c.Product_ID=b.Product_ID
LEFT JOIN (SELECT Batch_No, Batch_Date, Product_ID, MAX(EndDate) EndDate FROM t_alur_proses
    WHERE LTRIM(RTRIM(nama_tahapan)) LIKE 'Timbang BB' AND EndDate IS NOT NULL GROUP BY Batch_No, Batch_Date, Product_ID) d
    ON d.Batch_Date=b.Batch_Date AND d.Batch_No=b.Batch_No AND d.Product_ID=b.Product_ID
LEFT JOIN (SELECT Batch_No, Batch_Date, Product_ID, EndDate FROM t_alur_proses
    WHERE LTRIM(RTRIM(nama_tahapan)) IN ('Terima Bahan Baku', 'Terima BB') AND EndDate IS NOT NULL) mulaiProd
    ON mulaiProd.Batch_Date=b.Batch_Date AND mulaiProd.Batch_No=b.Batch_No AND mulaiProd.Product_ID=b.Product_ID
-- NEW: anchor [Tgl Timbang]/[Hari WIP] on the step immediately AFTER 'Penyiapan BB'
-- (by urutan). Products that skip 'Timbang BB' (e.g. sterile injections) used to get a
-- NULL date; this gives every WIP batch a start date. Falls back to next-step StartDate,
-- then to 'Terima BB' (formerly 'Terima Bahan Baku') EndDate, for safety.
LEFT JOIN (
    SELECT s.Batch_No, s.Batch_Date, s.Product_ID, MAX(s.EndDate) AS EndDate, MAX(s.StartDate) AS StartDate
    FROM t_alur_proses s
    INNER JOIN (
        SELECT ap.Batch_No, ap.Batch_Date, ap.Product_ID, MIN(ap.urutan) AS NextUrutan
        FROM t_alur_proses ap
        INNER JOIN (
            SELECT Batch_No, Batch_Date, Product_ID, MIN(urutan) AS PenyiapanUrutan
            FROM t_alur_proses WHERE LTRIM(RTRIM(nama_tahapan)) = 'Penyiapan BB'
            GROUP BY Batch_No, Batch_Date, Product_ID
        ) pen ON pen.Batch_No=ap.Batch_No AND pen.Batch_Date=ap.Batch_Date AND pen.Product_ID=ap.Product_ID
        WHERE ap.urutan > pen.PenyiapanUrutan
        GROUP BY ap.Batch_No, ap.Batch_Date, ap.Product_ID
    ) nx ON nx.Batch_No=s.Batch_No AND nx.Batch_Date=s.Batch_Date AND nx.Product_ID=s.Product_ID AND nx.NextUrutan=s.urutan
    GROUP BY s.Batch_No, s.Batch_Date, s.Product_ID
) tgl ON tgl.Batch_Date=b.Batch_Date AND tgl.Batch_No=b.Batch_No AND tgl.Product_ID=b.Product_ID
JOIN m_product f ON f.Product_ID=b.Product_ID
LEFT JOIN (SELECT DNc_BatchNo, DNc_ProductID FROM t_dnc_product WHERE ISNULL(DNC_TempelLabel,'')<>'') g
    ON g.DNc_ProductID=b.Product_ID AND g.DNc_BatchNo=b.Batch_No
LEFT JOIN (SELECT BatchNo, ProductID, Process_Date FROM t_bphprekap_status WHERE Approver_No=2 AND YEAR(Process_Date)>=2023) i
    ON i.BatchNo=b.Batch_No AND i.ProductID=b.Product_ID
LEFT JOIN t_wip_batal wipbatal ON wipbatal.wip_batchno=b.Batch_No AND wipbatal.batchDate=b.Batch_Date AND wipbatal.wip_productID=b.Product_ID
WHERE (d.Batch_No IS NOT NULL OR mulaiProd.Batch_No IS NOT NULL)
    AND b.nama_tahapan LIKE '%tempel label%' AND b.EndDate IS NULL
    AND (f.Product_Name NOT LIKE '%Granulat%' AND g.DNc_BatchNo IS NULL)
    AND b.Batch_No NOT IN ('CY3A01','BI063','PI3L01') AND wipbatal.wip_batchno IS NULL
