-- =============================================
-- m_tahapan_group -- stage groups for the step codes PIC added in Oct 2026
--
-- CAL-95's master route (Seq_ID 14, effective 2026-10-13) moved onto new step
-- codes: the PC preparation steps became WH steps 321-330 and the PN steps
-- 331-349. m_tahapan_group is keyed on kode_tahapan, so the new codes had no
-- group. Without one, getWIPData drops a batch until Terima BB has ended,
-- Production Monitoring and the batches report never see its production start,
-- and the stage views lose its Granulasi/Cetak/Coating/Kemas steps.
--
-- Each new code takes the group of the code it replaced in CAL-95's previous
-- route (batch I1D56). Old codes without a group (the BKP/BKS preparation
-- steps 144/218/146/171/219/185) leave their new codes unassigned too, as do
-- the new PPI steps 320 and 360-365, which have no predecessor.
--
-- Only inserts; a code that already has a group is left alone. Safe to rerun.
-- Roll back:
--   DELETE FROM m_tahapan_group WHERE kode_tahapan IN
--     ('321','322','323','324','331','332','333','334','335','336','337','338',
--      '339','340','341','342','343','344','345','346','347','348','349');
-- =============================================
INSERT INTO m_tahapan_group (kode_tahapan, tahapan_group)
SELECT CAST(m.new_code AS VARCHAR(50)), g.tahapan_group
FROM (VALUES
    (321, 142),  -- Penyiapan BB                              <- Penyiapan BB
    (322, 143),  -- Timbang BB                                <- Timbang BB
    (323, 217),  -- Approve Timbang BB                        <- Approve Timbang BB
    (324, 145),  -- Pengiriman BB                             <- Pengiriman Bahan Baku
    (325, 144),  -- Penyiapan BKP                             <- Penyiapan Bahan Kemas Primer
    (326, 218),  -- Approve Kesiapan BKP                      <- Approve Kesiapan Kemasan Primer
    (327, 146),  -- Pengiriman BKP                            <- Pengiriman Bahan Kemas Primer
    (328, 171),  -- Penyiapan BKS                             <- Penyiapan Bahan Kemas Sekunder
    (329, 219),  -- Approve Kesiapan BKS                      <- Approve Kesiapan Kemasan Sekunder
    (330, 185),  -- Pengiriman BKS                            <- Pengiriman Bahan Kemas Sekunder
    (331, 135),  -- Terima BB                                 <- Terima Bahan Baku
    (332, 212),  -- Approve Terima BB                         <- Approve Terima Bahan Baku
    (333, 1),    -- Change Over Granulasi                     <- Persiapan Granulasi
    (334, 7),    -- Granulasi                                 <- Granulasi 151-200
    (335, 18),   -- Change Over Final Mixing                  <- Persiapan Mixing
    (336, 24),   -- Mixing                                    <- Mixing 151-200
    (337, 31),   -- Cetak                                     <- Cetak 100001-200000
    (338, 35),   -- Cleaning Cetak                            <- Cleaning Mesin Cetak
    (339, 45),   -- Change Over Coating                       <- Persiapan Coating
    (340, 48),   -- Coating                                   <- Coating 8-16 jam
    (341, 136),  -- Terima BKP                                <- Terima Bahan Kemas Primer
    (342, 222),  -- Approve Terima BKP                        <- Approve Terima Bahan Kemas Primer
    (343, 53),   -- Change Over KP Stripping / Blistering     <- Change Over Stripping
    (344, 63),   -- KP Solid Stripping / Blistering           <- KP Solid 20001-30000 (Stripping)
    (345, 66),   -- Cleaning KP Solid Stripping / Blistering  <- Cleaning Kemas Primer Solid (Stripping)
    (346, 137),  -- Terima BKS                                <- Terima Bahan Kemas Sekunder
    (347, 223),  -- Approve Terima BKS                        <- Approve Terima Bahan Kemas Sekunder
    (348, 68),   -- Change Over Kemas Sekunder                <- Persiapan Kemas Sekunder
    (349, 99)    -- Kemas Sekunder Solid                      <- Kemas Sekunder Solid 25001-30000
) AS m(new_code, old_code)
JOIN m_tahapan_group g ON g.kode_tahapan = CAST(m.old_code AS VARCHAR(50))
WHERE NOT EXISTS (SELECT 1 FROM m_tahapan_group x WHERE x.kode_tahapan = CAST(m.new_code AS VARCHAR(50)));
