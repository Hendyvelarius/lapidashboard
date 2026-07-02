---
name: quality-historical-month-approach
description: How the "view previous months" feature for Quality/PN1/PN2 dashboards must be built
metadata:
  type: project
---

User wants Quality, PN1, and PN2 dashboards to let users view a previous month as a "pseudo snapshot" — month-end granularity only.

**Approach (decided by user):** NOT stored snapshots like SummaryDashboard. Instead, live **date-simulation**: re-query the real source tables but pin "today" to the selected month-end (e.g. 2026-05-31), and treat any event timestamp dated *after* that as not-yet-happened (null). So EndDate/StartDate/IdleStartDate/Process_Date later than the as-of date are nulled, and "days in stage" is computed relative to the as-of date, not `new Date()`.

**Why:** User explicitly rejected the snapshot-capture route; wants accurate simulation reconstructable on demand for any past month, not just months captured going forward.

**How to apply:**
- Most datasets the 3 dashboards use are inline SQL in [sqlModel.js](backend/src/models/sqlModel.js) and can take an `@asOf` param: `getWIPData`, `getLeadTime`, `getDailyProduction`, `getReleasedBatchesYTD`, `getProductGroupDept` (period mapping). productList/otcProducts are static.
- `forecastData` is loaded into QualityDashboard but never used in any computation — ignore it.
- The one opaque-proc dependency that matters: OF1 target `sp_Dashboard_OF1 'SummaryByProsesGroup'` (ofTargetData), drives the OF1 target chart. Needs per-period reconstruction — open question whether `r_target_of1_dashboard` stores history per period.
- Frontend: SummaryDashboard already proves the reference-date pattern (`historicalReferenceDate` threaded through processing fns). Mirror that into Quality/PN1/PN2, plus a month dropdown.
- `getWIPData` is the hardest: it filters by current-state flags on `t_rfid_batch_card` (`isActive=1 AND Batch_Status='Open'`). BOTH are current-state and not historized — in historical mode the entire `WHERE isActive=1 AND Batch_Status='Open'` must be dropped, relying instead on the date-gated step filters (steps 2–5, all gated `<= @asOf`) + nulling StartDate/EndDate after @asOf to decide WIP membership. Verified: dropping only Batch_Status collapsed past-month batch counts (134→18→5 going back); dropping both gives stable, realistic counts (~220–305/month matching live's 222). No future-dated values leak.

**Status (implemented as prototype on Quality only, 2026-06-12):** Backend `asOf` params done in [sqlModel.js](backend/src/models/sqlModel.js) + [SqlController.js](backend/src/controllers/SqlController.js) (cache keys suffixed with asOf). Frontend [QualityDashboard.jsx](frontend/src/components/QualityDashboard.jsx) has a month `<select>`, `referenceDate`/`selectedPeriode` state, `handlePeriodChange`, and an orange historical banner; all processing fns now use `referenceDate` and `calculateCalendarDaysTo(x, referenceDate)` (new helper in [workingDays.js](frontend/src/utils/workingDays.js)). OF1 target line still shows the live/current plan (Phase 2 = clone `sp_Dashboard_OF1` with a period param; proc is period-structured but has ~30+ GETDATE() refs to remap). PN1/PN2 not yet done — replicate once Quality is validated.
