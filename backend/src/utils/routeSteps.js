/**
 * Route steps the dashboards key on, under every code and name they have carried.
 *
 * t_alur_proses copies kode_tahapan and nama_tahapan from the master route when a
 * batch's route is created, so a batch keeps whatever its step was called at the
 * time. When PIC renames a step in m_tahapan, or moves a product onto new step
 * codes (CAL-95, Oct 2026: the PC preparation steps became WH steps 321-330 and the
 * PN steps 331-349), batches from both eras run side by side. A step therefore
 * matches if its code OR its trimmed name is listed here. The names also catch a
 * new code for a known step before anyone adds that code to this list.
 *
 * Renames and new codes go here, and in the mirror at
 * frontend/src/config/routeSteps.js. The SQL objects inline the names only:
 * sp_Dashboard_OF1 and sp_Dashboard_WIP for APPROVE_TERIMA_BB, sp_Dashboard_WIP
 * for PERSIAPAN_KS, vw_wip_produksi for TERIMA_BB (backend/migrations/*_aliases.sql).
 * Step families matched by name prefix ("Kemas Sekunder ..." / "KS ...", "KP Solid
 * ...") are handled where they are used, in sqlModel.js and stageBoundaries.js. Their joins are not
 * all aggregated, and a code also carries numbered rows ("Terima Bahan Baku 5")
 * that would add a second row per batch there. Here every match sits inside
 * MIN/MAX/EXISTS, so code matching is safe.
 *
 * The MC tests (215/216) and the QC pickup/handover (138/141) are matched by code
 * in sqlModel.js; their codes have not changed.
 */
const ROUTE_STEPS = {
  // Timbang starts here. PC 142, WH 321.
  PENYIAPAN_BB: { codes: [142, 321], names: ['Penyiapan BB'] },
  // Timbang ends here. PC 145, WH 324.
  PENGIRIMAN_BB: { codes: [145, 324], names: ['Pengiriman Bahan Baku', 'Pengiriman BB'] },
  // Proses starts here. PN 135, PN 331.
  TERIMA_BB: { codes: [135, 331], names: ['Terima Bahan Baku', 'Terima BB'] },
  // OF1's Potong Stock flag and sp_Dashboard_WIP's Proses status. PN 212, PN 332.
  APPROVE_TERIMA_BB: { codes: [212, 332], names: ['Approve Terima Bahan Baku', 'Approve Terima BB'] },
  // sp_Dashboard_WIP's Kemas status. PN 68, PN 348; PIC plans to shorten 348 to "Change Over KS".
  PERSIAPAN_KS: { codes: [68, 348], names: ['Persiapan Kemas Sekunder', 'Change Over Kemas Sekunder', 'Change Over KS'] },
  // QA release; the batch leaves WIP. Renamed in place (typo fix), same code.
  TEMPEL_LABEL_RELEASE: { codes: [170], names: ['Tempel Label Realese', 'Tempel Label Release'] },
};

const sqlString = (s) => `'${String(s).replace(/'/g, "''")}'`;

/**
 * SQL predicate: the row aliased `alias` (a t_alur_proses row) is step `key`.
 *   stepIs('fa', 'TERIMA_BB')
 *   -> (fa.kode_tahapan IN (135, 331) OR LTRIM(RTRIM(fa.nama_tahapan)) IN ('Terima Bahan Baku', 'Terima BB'))
 */
function stepIs(alias, key) {
  const step = ROUTE_STEPS[key];
  if (!step) throw new Error(`Unknown route step: ${key}`);
  return `(${alias}.kode_tahapan IN (${step.codes.join(', ')})`
    + ` OR LTRIM(RTRIM(${alias}.nama_tahapan)) IN (${step.names.map(sqlString).join(', ')}))`;
}

module.exports = { ROUTE_STEPS, stepIs };
