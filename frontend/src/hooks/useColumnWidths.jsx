import React, { useState, useEffect, useCallback, useRef } from 'react';

// Excel-like column sizing for a <table>: drag the header edge to resize,
// double-click it to auto-fit the widest cell, widths persist per browser.
//
//   const cols = useColumnWidths('ct-alert-log', [{ key: 'batch', label: 'Batch', width: 90 }, ...]);
//   <table style={cols.tableStyle}><colgroup>{cols.colgroup}</colgroup>
//     <thead><tr>{cols.columns.map((c) => <ColHeader key={c.key} col={c} cols={cols} />)}<th /></tr></thead>
//
// A trailing filler column (no width) absorbs leftover space so user widths are
// honoured exactly; when they exceed the container the wrapper scrolls sideways.

const MIN_WIDTH = 32;

function loadWidths(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return saved && typeof saved === 'object' ? saved : {};
  } catch { return {}; }
}

export function useColumnWidths(storageKey, columns) {
  const defaults = Object.fromEntries(columns.map((c) => [c.key, c.width]));
  const [overrides, setOverrides] = useState(() => loadWidths(storageKey));

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(overrides)); } catch { /* storage unavailable */ }
  }, [storageKey, overrides]);

  const widthOf = (key) => {
    const w = overrides[key];
    return Number.isFinite(w) && w >= MIN_WIDTH ? w : defaults[key];
  };

  const setWidth = useCallback((key, w) => {
    setOverrides((prev) => ({ ...prev, [key]: Math.max(MIN_WIDTH, Math.round(w)) }));
  }, []);
  const resetAll = useCallback(() => setOverrides({}), []);
  const isDefault = Object.keys(overrides).length === 0;

  const resolved = columns.map((c) => ({ ...c, width: widthOf(c.key) }));
  const total = resolved.reduce((s, c) => s + c.width, 0);

  const colgroup = resolved.map((c) => <col key={c.key} style={{ width: c.width }} />).concat(<col key="__fill" />);
  const tableStyle = { tableLayout: 'fixed', width: '100%', minWidth: total };

  return { columns: resolved, colgroup, tableStyle, setWidth, resetAll, isDefault, widthOf };
}

// Measures the widest content in a column (cells are nowrap + overflow hidden,
// so scrollWidth is the full text width) — Excel's double-click auto-fit.
function autoFitWidth(th) {
  const table = th.closest('table');
  const idx = th.cellIndex;
  let max = th.scrollWidth;
  table.querySelectorAll('tbody tr').forEach((tr) => {
    const td = tr.cells[idx];
    if (td && td.colSpan === 1) max = Math.max(max, td.scrollWidth);
  });
  return max + 2;
}

export function ColHeader({ col, cols, className = '', children, ...rest }) {
  const drag = useRef(null);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, w: col.width };
    document.body.classList.add('ct-col-resizing');
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    cols.setWidth(col.key, drag.current.w + (e.clientX - drag.current.x));
  };
  const onPointerUp = (e) => {
    if (!drag.current) return;
    drag.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    document.body.classList.remove('ct-col-resizing');
  };
  const onDoubleClick = (e) => {
    e.stopPropagation();
    cols.setWidth(col.key, autoFitWidth(e.currentTarget.closest('th')));
  };

  return (
    <th className={`ct-th-resizable ${col.className || ''} ${className}`.trim()} {...rest}>
      <span className="ct-th-label">{children ?? col.label}</span>
      <span
        className="ct-col-resizer"
        title="Geser untuk mengubah lebar · klik dua kali untuk auto-fit"
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick} onClick={(e) => e.stopPropagation()}
      />
    </th>
  );
}
