/**
 * Route steps the dashboards key on, under every code and name they have carried.
 * Mirror of backend/src/utils/routeSteps.js; keep the two in step.
 *
 * A batch's route rows copy kode_tahapan and nama_tahapan from the master route
 * when the route is created, so a batch keeps whatever its step was called at the
 * time. When PIC renames a step, or moves a product onto new step codes (CAL-95,
 * Oct 2026: the PC preparation steps became WH steps 321-330 and the PN steps
 * 331-349), batches from both eras run side by side. A step therefore matches if
 * its code OR its name is listed here. The names also catch a new code for a known
 * step before it is added, and rows that carry no code at all.
 */
export const ROUTE_STEPS = {
  // Timbang starts here. PC 142, WH 321.
  PENYIAPAN_BB: { codes: [142, 321], names: ['Penyiapan BB'] },
  // Timbang ends here. PC 145, WH 324.
  PENGIRIMAN_BB: { codes: [145, 324], names: ['Pengiriman Bahan Baku', 'Pengiriman BB'] },
  // Proses starts here. PN 135, PN 331.
  TERIMA_BB: { codes: [135, 331], names: ['Terima Bahan Baku', 'Terima BB'] },
  // QA release; the batch leaves WIP. Renamed in place (typo fix), same code.
  TEMPEL_LABEL_RELEASE: { codes: [170], names: ['Tempel Label Realese', 'Tempel Label Release'] },
};

// Trim + collapse internal whitespace, case-insensitive (SQL Server compares names
// case-insensitively, so the frontend does too).
const normName = (name) => (name == null ? '' : String(name).trim().replace(/\s+/g, ' ').toLowerCase());

const matchers = Object.fromEntries(
  Object.entries(ROUTE_STEPS).map(([key, { codes, names }]) => {
    const codeSet = new Set(codes);
    const nameSet = new Set(names.map(normName));
    return [key, (row) => codeSet.has(Number(row?.kode_tahapan)) || nameSet.has(normName(row?.nama_tahapan))];
  })
);

/** Whether a route row ({ kode_tahapan, nama_tahapan }) is step `key` of ROUTE_STEPS. */
export const isStep = (row, key) => {
  const match = matchers[key];
  if (!match) throw new Error(`Unknown route step: ${key}`);
  return match(row);
};

/** Whether a route row is the QA release step and has finished (the batch is released). */
export const isReleasedRow = (row) => isStep(row, 'TEMPEL_LABEL_RELEASE') && !!row.EndDate;
