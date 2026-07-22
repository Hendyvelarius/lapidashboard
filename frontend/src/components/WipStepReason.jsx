import React from 'react';

/**
 * One-line explanation of *why* a WIP step has not started yet, shown on the step
 * cards inside the task-details modals (Production, PN1, PN2, Quality).
 *
 * The answer always comes from the step's `Prev_Step` — a semicolon-delimited list of
 * prerequisite step names, resolved against the batch's own steps:
 *
 *   - no Prev_Step            -> it is the route's entry point, nothing gates it
 *   - some prerequisites open -> those are the blockers, named with their own state
 *   - all prerequisites done  -> nothing gates it any more; it is queued, and the note
 *                                says when the last prerequisite finished
 *
 * Deliberately terse: at most two blockers are named, the rest collapse into "+N more".
 * A step that is in progress or completed renders nothing — the question doesn't apply.
 */

// Match stageBoundaries.js: trim + collapse internal whitespace before comparing names.
const norm = (name) => (name == null ? '' : String(name).trim().replace(/\s+/g, ' '));

// Step timestamps come back as SQL datetimes; the trailing Z would otherwise shift them
// by the local offset, so it is stripped and the value read as local time.
const parseStepDate = (value) => {
  if (!value) return null;
  const d = new Date(String(value).replace('Z', ''));
  return isNaN(d.getTime()) ? null : d;
};

const shortDate = (d) =>
  d ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' }) : null;

const daysSince = (d, now) =>
  d ? Math.max(0, Math.floor((now - d) / (1000 * 60 * 60 * 24))) : null;

const prevStepNames = (task) =>
  String(task?.Prev_Step || '')
    .split(';')
    .map(norm)
    .filter(Boolean);

const WipStepReason = ({ task, tasks }) => {
  const isCompleted = !!(task.StartDate && task.EndDate);
  const isInProgress = !!(task.StartDate && !task.EndDate);
  if (isCompleted || isInProgress) return null;

  const now = new Date();
  const names = prevStepNames(task);

  let text;
  let tone = '#6b7280';

  if (names.length === 0) {
    text = 'Tidak memiliki tahapan sebelumnya.';
  } else {
    // A prerequisite the batch never received is not a blocker: the route simply
    // skips it for this product, so it is counted separately and only mentioned
    // when it is the *only* thing standing between the step and a green light.
    const byName = new Map((tasks || []).map((t) => [norm(t.nama_tahapan), t]));
    const resolved = names.map((name) => ({ name, step: byName.get(name) || null }));
    const present = resolved.filter((r) => r.step);
    const missing = resolved.filter((r) => !r.step);
    const open = present.filter((r) => !r.step.EndDate);

    if (open.length > 0) {
      const describe = ({ name, step }) => {
        if (step.StartDate) {
          const started = parseStepDate(step.StartDate);
          return `${name} (In Progress${started ? ` sejak ${shortDate(started)}` : ''})`;
        }
        return `${name} (${step.IdleStartDate ? 'not started' : 'waiting'})`;
      };

      const shown = open.slice(0, 2).map(describe).join(', ');
      const rest = open.length > 2 ? ` +${open.length - 2} more` : '';
      text = `Belum bisa dimulai sebelum ${shown}${rest}.`;
      tone = '#b45309';
    } else if (present.length === 0) {
      text = `Tahapan ${missing.map((r) => r.name).join(', ')} bukan bagian dari rute batch ini.`;
    } else {
      // Everything it depends on has ended, so the wait is queueing, not dependency.
      const last = present.reduce((latest, r) => {
        const end = parseStepDate(r.step.EndDate);
        return end && (!latest.end || end > latest.end) ? { name: r.name, end } : latest;
      }, { name: null, end: null });
      const age = daysSince(last.end, now);
      const suffix = last.end
        ? ` - ${last.name} selesai ${shortDate(last.end)}${age !== null ? ` (${age}d ago)` : ''}`
        : '';
      text = `Ready: ${present.length} tahapan sebelumnya sudah selesai${suffix}.`;
      tone = '#0369a1';
    }
  }

  return (
    <div style={{
      marginTop: '8px',
      paddingTop: '8px',
      borderTop: '1px dashed #d1d5db',
      fontSize: '0.75rem',
      color: tone,
      lineHeight: 1.4,
    }}>
      {text}
    </div>
  );
};

export default WipStepReason;
