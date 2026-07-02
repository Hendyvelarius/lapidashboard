/**
 * Stage Boundaries Utility (single source of truth for the redefined stage grouping)
 *
 * Management redefined how each production stage group's clock starts and stops,
 * based on specific process steps (`nama_tahapan`) and, for the Kemas groups, the
 * `Prev_Step` chain. This module implements those definitions once so that every live
 * WIP view (Production overview, PN1/PN2 line dashboards, Quality dashboard) computes
 * group boundaries identically.
 *
 * Definitions (per batch):
 *   Timbang        start = StartDate of "Penyiapan BB"
 *                  end   = EndDate   of "Pengiriman Bahan Baku"
 *   Proses         start = StartDate of "Terima Bahan Baku"
 *                  end   = same instant Kemas Primer starts (see below)
 *   Kemas Primer   Keyed off the batch's PRIMARY PACKAGING step (see isPackagingStep):
 *                  "KP Solid"/"Kemas Primer Solid" (solids), any "Filling ..." except
 *                  "Filling Kapsul" (liquid/injeksi bottle/vial/ampoule), or
 *                  "Filing/Filling Sachet" (sachet).
 *                  start = MAX EndDate of that packaging step's Prev_Step prerequisites
 *                          present in the batch (i.e. once ALL prereqs are done). If a
 *                          batch has NO packaging step (a few products, e.g. LABUMIN
 *                          KAPSUL / MUCOVY SIRUP), fall back to the old rule: MIN EndDate
 *                          among prevSteps of the "Kemas Primer" group.
 *                  end   = MAX EndDate of the packaging step(s), once all have ended
 *                          (fallback: all "Kemas Primer" group members ended).
 *   Kemas Sekunder Keyed off the batch's SECONDARY PACKAGING step (see
 *                  isSecondaryPackagingStep): a "Kemas Sekunder <Solid/Liquid/Injeksi ...>"
 *                  step (the actual secondary-packing work, NOT the "Terima Bahan Kemas
 *                  Sekunder" / "Persiapan Kemas Sekunder" / "Approve ..." admin steps).
 *                  start = MAX EndDate of that step's Prev_Step prerequisites present in the
 *                          batch (i.e. once ALL prereqs are done; typically "Terima Bahan
 *                          Kemas Sekunder" / "Persiapan Kemas Sekunder"). If a batch has NO
 *                          "Kemas Sekunder ..." step (e.g. LABUMIN KAPSUL), fall back to the
 *                          old rule: MIN EndDate among prevSteps of the "Kemas Sekunder" group.
 *                  end   = EndDate of "Pengiriman Obat Jadi"
 *   QC             start = StartDate of "Pickup Sample QC"
 *                  end   = EndDate   of "Penyerahan Hasil Uji QC"
 *   Mikro          start = MIN StartDate of "Pengujian MC" / "Pengujian Sterilitas MC"
 *                  end   = MAX EndDate   of "Pengujian MC" / "Pengujian Sterilitas MC"
 *   QA             start = MIN StartDate of "Penyerahan PPI ke QA" / "Penyerahan Hasil Uji QC"
 *                  end   = EndDate of "Tempel Label Realese"
 *
 * PCT-only combined group "Produksi" = Proses.start -> Kemas Sekunder.end
 *   (= StartDate of "Terima Bahan Baku" -> EndDate of "Pengiriman Obat Jadi").
 *
 * ROLLBACK: set USE_NEW_STAGE_LOGIC = false to make every consumer fall back to the
 * previous per-`tahapan_group` (MIN StartDate -> MAX EndDate / earliest IdleStartDate)
 * behaviour. Callers must gate the new code path on this flag.
 */

import { calculateCalendarDaysTo } from './workingDays';

// -------------------------------------------------------------------------------------
// Rollback switch — flip to false to restore the legacy stage-grouping behaviour.
// -------------------------------------------------------------------------------------
export const USE_NEW_STAGE_LOGIC = true;

// Display order for the 7 live-WIP groups.
export const GROUP_ORDER = [
  'Timbang',
  'Proses',
  'Kemas Primer',
  'Kemas Sekunder',
  'QC',
  'Mikro',
  'QA',
];

// PCT breakdown display order (Proses + Kemas Primer + Kemas Sekunder collapse to Produksi).
export const PCT_GROUP_ORDER = ['Timbang', 'Produksi', 'QC', 'Mikro', 'QA'];

// Named steps used by the boundary rules (canonical, single-spaced).
const STEP = {
  PENYIAPAN_BB: 'Penyiapan BB',
  PENGIRIMAN_BB: 'Pengiriman Bahan Baku',
  TERIMA_BAHAN_BAKU: 'Terima Bahan Baku',
  PICKUP_SAMPLE_QC: 'Pickup Sample QC',
  PENYERAHAN_HASIL_UJI_QC: 'Penyerahan Hasil Uji QC',
  PENGUJIAN_MC: 'Pengujian MC',
  PENGUJIAN_STERILITAS_MC: 'Pengujian Sterilitas MC',
  PENYERAHAN_PPI_KE_QA: 'Penyerahan PPI ke QA',
  // The PPI-handoff step is misspelled "Penyerahaan PPI ke QA" (double-a) in the source
  // data. Match both spellings so QA's window opens for batches that only carry the typo'd
  // variant (e.g. routes with no "Penyerahan Hasil Uji QC" step).
  PENYERAHAN_PPI_KE_QA_TYPO: 'Penyerahaan PPI ke QA',
  TEMPEL_LABEL_REALESE: 'Tempel Label Realese',
  PENGIRIMAN_OBAT_JADI: 'Pengiriman Obat Jadi',
};

// Which tahapan_group values roll up into each of the 7 display groups.
export const TAHAPAN_GROUP_TO_DISPLAY = {
  'Timbang': 'Timbang',
  'Terima Bahan': 'Proses',
  'Mixing': 'Proses',
  'Filling': 'Proses',
  'Granulasi': 'Proses',
  'Cetak': 'Proses',
  'Coating': 'Proses',
  'Kemas Primer': 'Kemas Primer',
  'Kemas Sekunder': 'Kemas Sekunder',
  'QC': 'QC',
  'Mikro': 'Mikro',
  'QA': 'QA',
};

// -------------------------------------------------------------------------------------
// Small helpers
// -------------------------------------------------------------------------------------

// Normalize a step name for comparison: trim + collapse internal whitespace.
const norm = (name) => (name == null ? '' : String(name).trim().replace(/\s+/g, ' '));

const toDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const minDate = (dates) => {
  let best = null;
  for (const raw of dates) {
    const d = toDate(raw);
    if (d && (!best || d < best)) best = d;
  }
  return best;
};

const maxDate = (dates) => {
  let best = null;
  for (const raw of dates) {
    const d = toDate(raw);
    if (d && (!best || d > best)) best = d;
  }
  return best;
};

// Collect StartDate values of entries whose (normalized) nama_tahapan is in `names`.
const startsOf = (entries, names) => {
  const set = new Set(names.map(norm));
  return entries.filter((e) => set.has(norm(e.nama_tahapan))).map((e) => e.StartDate);
};

// Collect EndDate values of entries whose (normalized) nama_tahapan is in `names`.
const endsOf = (entries, names) => {
  const set = new Set(names.map(norm));
  return entries.filter((e) => set.has(norm(e.nama_tahapan))).map((e) => e.EndDate);
};

/**
 * Build the set of prevStep names for a given tahapan_group within this batch.
 * `Prev_Step` is semicolon-delimited; we normalize each token.
 */
const prevStepNamesForGroup = (entries, tahapanGroup) => {
  const names = new Set();
  entries.forEach((e) => {
    if (e.tahapan_group !== tahapanGroup) return;
    const raw = e.Prev_Step;
    if (!raw) return;
    String(raw)
      .split(';')
      .map(norm)
      .filter(Boolean)
      .forEach((n) => names.add(n));
  });
  return names;
};

/**
 * Earliest (MIN) EndDate among the batch's steps whose name is a prevStep of the given
 * group. This is the instant the group becomes idle (its clock starts) and the instant
 * the preceding stage (Proses) ends.
 */
const earliestPrevStepEnd = (entries, tahapanGroup) => {
  const prevNames = prevStepNamesForGroup(entries, tahapanGroup);
  if (prevNames.size === 0) return null;
  const ends = entries
    .filter((e) => prevNames.has(norm(e.nama_tahapan)))
    .map((e) => e.EndDate);
  return minDate(ends);
};

/**
 * Identify a batch's PRIMARY PACKAGING step — the single step that marks the
 * Proses -> Kemas Primer transition. Solids use "KP Solid"/"Kemas Primer Solid"
 * (blistering/stripping); liquids/injeksi use a "Filling ..." step (Botol/Vial/Ampul)
 * EXCEPT "Filling Kapsul" (capsule filling = production); sachets use "Filing/Filling
 * Sachet" (note the one-L "Filing" typo present in the data).
 */
const isPackagingStep = (name) => {
  const n = norm(name).toLowerCase();
  if (!n) return false;
  if (n.startsWith('kp solid') || n.startsWith('kemas primer solid')) return true;
  if (n.startsWith('filing sachet') || n.startsWith('filling sachet')) return true;
  if (n.startsWith('filling ') && !n.startsWith('filling kapsul')) return true;
  return false;
};

const packagingSteps = (entries) => entries.filter((e) => isPackagingStep(e.nama_tahapan));

/**
 * Kemas Primer { start, end } derived from the packaging step:
 *   start = MAX EndDate of the packaging step's Prev_Step prerequisites present in the
 *           batch (once ALL prerequisites have ended); null while still waiting.
 *   end   = MAX EndDate of the packaging step(s), once all have ended; null otherwise.
 * Batches with no packaging step fall back to the legacy Kemas-Primer-group prevStep rule.
 */
const kemasPrimerBoundary = (entries) => {
  const pkg = packagingSteps(entries);

  if (pkg.length === 0) {
    // Fallback for products with no packaging step (e.g. LABUMIN KAPSUL, MUCOVY SIRUP).
    const kp = entries.filter((e) => e.tahapan_group === 'Kemas Primer');
    return {
      start: earliestPrevStepEnd(entries, 'Kemas Primer'),
      end: kp.length > 0 && kp.every((e) => e.EndDate) ? maxDate(kp.map((e) => e.EndDate)) : null,
    };
  }

  // Prerequisites of the packaging step(s), resolved against the batch's own steps.
  const prereqNames = new Set();
  pkg.forEach((e) => {
    if (!e.Prev_Step) return;
    String(e.Prev_Step).split(';').map(norm).filter(Boolean).forEach((n) => prereqNames.add(n));
  });
  const prereqEntries = entries.filter((e) => prereqNames.has(norm(e.nama_tahapan)));

  let start;
  if (prereqEntries.length > 0) {
    // All prerequisites must have ended before Kemas Primer starts.
    start = prereqEntries.every((e) => e.EndDate) ? maxDate(prereqEntries.map((e) => e.EndDate)) : null;
  } else {
    // No resolvable prerequisite (null/empty Prev_Step) -> use packaging's own start.
    start = minDate(pkg.map((e) => e.StartDate));
  }

  const end = pkg.every((e) => e.EndDate) ? maxDate(pkg.map((e) => e.EndDate)) : null;
  return { start, end };
};

/** Whether the batch's Kemas Primer packaging has physically started (StartDate). */
const kemasPrimerStarted = (entries, ref) => {
  const pkg = packagingSteps(entries);
  const list = pkg.length > 0 ? pkg : entries.filter((e) => e.tahapan_group === 'Kemas Primer');
  return list.some((e) => e.StartDate && (!ref || toDate(e.StartDate) <= ref));
};

/**
 * Identify a batch's SECONDARY PACKAGING step — the "Kemas Sekunder <...>" step that marks
 * the actual secondary-packing work (e.g. "Kemas Sekunder Solid 1-5000", "Kemas Sekunder
 * Liquid ...", "Kemas Sekunder Injeksi ..."). Mirrors isPackagingStep for Kemas Primer.
 * The admin/prep steps that live in the same group ("Terima Bahan Kemas Sekunder",
 * "Persiapan Kemas Sekunder", "Approve ...", "Cek kelengkapan PPI PN", etc.) are NOT the
 * packing step — they are its prerequisites.
 */
const isSecondaryPackagingStep = (name) => norm(name).toLowerCase().startsWith('kemas sekunder');

const secondaryPackagingSteps = (entries) => entries.filter((e) => isSecondaryPackagingStep(e.nama_tahapan));

/**
 * Kemas Sekunder { start, end } derived from the secondary packaging step:
 *   start = MAX EndDate of the "Kemas Sekunder ..." step's Prev_Step prerequisites present in
 *           the batch (once ALL prerequisites have ended); null while still waiting. Batches
 *           with no "Kemas Sekunder ..." step (e.g. LABUMIN KAPSUL) fall back to the legacy
 *           rule: MIN EndDate among prevSteps of the "Kemas Sekunder" group.
 *   end   = EndDate of "Pengiriman Obat Jadi". Some product routes never record that step
 *           (e.g. ARZOLA, some injeksi); for those, fall back to the MAX EndDate of the
 *           batch's other "Kemas Sekunder" group steps once they have ALL ended, so the
 *           stage still closes instead of leaving the batch stuck in Kemas Sekunder.
 */
const kemasSekunderBoundary = (entries) => {
  // Primary exit: EndDate of "Pengiriman Obat Jadi". Fallback (no such step in the route):
  // the last "Kemas Sekunder" group step to finish, once every group step has ended.
  const ksGroup = entries.filter((e) => e.tahapan_group === 'Kemas Sekunder');
  const fallbackEnd = ksGroup.length > 0 && ksGroup.every((e) => e.EndDate)
    ? maxDate(ksGroup.map((e) => e.EndDate))
    : null;
  const end = maxDate(endsOf(entries, [STEP.PENGIRIMAN_OBAT_JADI])) || fallbackEnd;
  const pkg = secondaryPackagingSteps(entries);

  if (pkg.length === 0) {
    // Fallback for products with no "Kemas Sekunder ..." step (e.g. LABUMIN KAPSUL).
    return { start: earliestPrevStepEnd(entries, 'Kemas Sekunder'), end };
  }

  // Prerequisites of the packing step(s), resolved against the batch's own steps.
  const prereqNames = new Set();
  pkg.forEach((e) => {
    if (!e.Prev_Step) return;
    String(e.Prev_Step).split(';').map(norm).filter(Boolean).forEach((n) => prereqNames.add(n));
  });
  const prereqEntries = entries.filter((e) => prereqNames.has(norm(e.nama_tahapan)));

  let start;
  if (prereqEntries.length > 0) {
    // All prerequisites must have ended before Kemas Sekunder starts.
    start = prereqEntries.every((e) => e.EndDate) ? maxDate(prereqEntries.map((e) => e.EndDate)) : null;
  } else {
    // No resolvable prerequisite (null/empty Prev_Step) -> use the packing step's own start.
    start = minDate(pkg.map((e) => e.StartDate));
  }

  return { start, end };
};

/** Whether the batch's Kemas Sekunder packing has physically started (StartDate). */
const kemasSekunderStarted = (entries, ref) => {
  const pkg = secondaryPackagingSteps(entries);
  const list = pkg.length > 0 ? pkg : entries.filter((e) => e.tahapan_group === 'Kemas Sekunder');
  return list.some((e) => e.StartDate && (!ref || toDate(e.StartDate) <= ref));
};

// -------------------------------------------------------------------------------------
// Core: compute { start, end } for each of the 7 groups from a batch's full entries.
// `batchEntries` must contain ALL steps of the batch (not just one group's steps).
// -------------------------------------------------------------------------------------
export const computeStageBoundaries = (batchEntries) => {
  const entries = Array.isArray(batchEntries) ? batchEntries : [];

  const kp = kemasPrimerBoundary(entries);
  const ks = kemasSekunderBoundary(entries);

  return {
    'Timbang': {
      start: minDate(startsOf(entries, [STEP.PENYIAPAN_BB])),
      end: maxDate(endsOf(entries, [STEP.PENGIRIMAN_BB])),
    },
    'Proses': {
      start: minDate(startsOf(entries, [STEP.TERIMA_BAHAN_BAKU])),
      end: kp.start, // Proses ends when Kemas Primer starts (packaging prereqs all done)
    },
    'Kemas Primer': {
      start: kp.start,
      end: kp.end,
    },
    'Kemas Sekunder': {
      start: ks.start,
      end: ks.end,
    },
    'QC': {
      start: minDate(startsOf(entries, [STEP.PICKUP_SAMPLE_QC])),
      end: maxDate(endsOf(entries, [STEP.PENYERAHAN_HASIL_UJI_QC])),
    },
    'Mikro': {
      start: minDate(startsOf(entries, [STEP.PENGUJIAN_MC, STEP.PENGUJIAN_STERILITAS_MC])),
      end: maxDate(endsOf(entries, [STEP.PENGUJIAN_MC, STEP.PENGUJIAN_STERILITAS_MC])),
    },
    'QA': {
      start: minDate(startsOf(entries, [STEP.PENYERAHAN_PPI_KE_QA, STEP.PENYERAHAN_PPI_KE_QA_TYPO, STEP.PENYERAHAN_HASIL_UJI_QC])),
      end: maxDate(endsOf(entries, [STEP.TEMPEL_LABEL_REALESE])),
    },
  };
};

/**
 * The start Date for a single display group, or null if it has not started.
 */
export const groupStartFor = (batchEntries, group) => {
  const boundaries = computeStageBoundaries(batchEntries);
  return boundaries[group] ? boundaries[group].start : null;
};

/**
 * Whether any step belonging to the display `group` has physically started (StartDate),
 * as of `ref` (optional). Used to split members into in-progress vs waiting.
 */
const displayGroupHasStartedStep = (entries, group, ref) => {
  // Kemas Primer "started" = the primary packaging step has started (it may live in the
  // Filling group for non-solids, so a plain tahapan_group check would miss it).
  if (group === 'Kemas Primer') return kemasPrimerStarted(entries, ref);
  // Kemas Sekunder "started" = the secondary packing step ("Kemas Sekunder ...") has started,
  // not merely the Terima Bahan / Persiapan admin steps that open its window.
  if (group === 'Kemas Sekunder') return kemasSekunderStarted(entries, ref);
  // QA is a document-review stage: its steps ("Cek Dokumen ... oleh QA", "Approve Realese",
  // "Tempel Label Realese") NEVER record a StartDate — they are tracked via Display=1 /
  // IdleStartDate once QC/MC results are handed to QA. A StartDate-based check therefore never
  // fires for QA and wrongly parks every batch in "waiting" (in-progress count = 0). A batch is
  // genuinely "in QA" as soon as its QA window is open (Penyerahan Hasil Uji QC / PPI ke QA
  // started), which getStageMembership has already verified before calling this — so report it
  // as started.
  if (group === 'QA') return true;
  return entries.some((e) =>
    TAHAPAN_GROUP_TO_DISPLAY[e.tahapan_group] === group &&
    e.StartDate &&
    (!ref || toDate(e.StartDate) <= ref)
  );
};

/**
 * Membership of a batch in a display `group` per the redefined stage windows.
 * Returns:
 *   'in_progress' - the group's window is open AND a step of the group has started
 *   'waiting'     - the group's window is open (its clock/idle has started) but no step
 *                   of the group has physically started yet
 *   null          - the batch is not in this stage (window not started, or already ended)
 *
 * A batch can be a member of several groups at once (windows overlap by design).
 * `referenceDate` (optional) evaluates membership "as of" that date for historical views.
 */
export const getStageMembership = (batchEntries, group, referenceDate = null) => {
  const boundaries = computeStageBoundaries(batchEntries);
  const gb = boundaries[group];
  if (!gb) return null;

  const ref = referenceDate ? toDate(referenceDate) : null;
  const startD = toDate(gb.start);
  const endD = toDate(gb.end);

  const started = startD && (!ref || startD <= ref);
  const ended = endD && (!ref || endD <= ref);

  if (!started || ended) return null; // not yet in this stage, or already past it

  return displayGroupHasStartedStep(batchEntries, group, ref) ? 'in_progress' : 'waiting';
};

/**
 * Days a batch has spent in a given display group, measured from the group's start to
 * `referenceDate` (defaults to today). Returns 0 when the group has not started.
 * Used by the live WIP views for "days in current stage".
 */
export const computeDaysInStageForGroup = (batchEntries, group, referenceDate) => {
  const start = groupStartFor(batchEntries, group);
  if (!start) return 0;
  return calculateCalendarDaysTo(start, referenceDate);
};

/**
 * Calendar-day duration of each group (start -> end). `null` when start or end missing.
 * Handy for completed-batch style breakdowns computed in JS.
 */
export const computeStageDurationDays = (batchEntries) => {
  const boundaries = computeStageBoundaries(batchEntries);
  const out = {};
  Object.keys(boundaries).forEach((group) => {
    const { start, end } = boundaries[group];
    if (start && end) {
      const days = Math.floor((toDate(end) - toDate(start)) / (1000 * 60 * 60 * 24));
      out[group] = Math.max(0, days);
    } else {
      out[group] = null;
    }
  });
  return out;
};

export default {
  USE_NEW_STAGE_LOGIC,
  GROUP_ORDER,
  PCT_GROUP_ORDER,
  TAHAPAN_GROUP_TO_DISPLAY,
  computeStageBoundaries,
  groupStartFor,
  getStageMembership,
  computeDaysInStageForGroup,
  computeStageDurationDays,
};
