/* ── Phase helpers ── */
export function isEngPhase(label) {
  return label === 'Engineering' || (label && label.startsWith('Eng: '));
}

export function phaseMatchesFilter(label, filter) {
  if (label === filter) return true;
  if (filter === 'Engineering' && isEngPhase(label)) return true;
  return false;
}

export function taskMatchesPhase(task, phase) {
  if (phaseMatchesFilter(task.phase, phase)) return true;
  if (task.segments) {
    return task.segments.some((seg) => !seg.gap && phaseMatchesFilter(seg.label, phase));
  }
  return false;
}

/* ── Color helpers ── */
export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

export function shiftBrightness(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + amount, g + amount, b + amount);
}

export function getSegShade(task, segIdx, totalSegs) {
  if (totalSegs <= 1) return task.color;
  const step = 30;
  const offset = (segIdx - (totalSegs - 1) / 2) * step;
  return shiftBrightness(task.color, offset);
}

/* xlsx wants a bare uppercase hex (no #) */
export function hexToRgbUpper(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return h.toUpperCase();
}

/* ── Date helpers ── */
export function mondayOf(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export function getQuarterRange(quarter, year) {
  const q = quarter !== undefined ? quarter : Math.floor(new Date().getMonth() / 3) + 1;
  const y = year !== undefined ? year : new Date().getFullYear();
  const qMonth = (q - 1) * 3;
  const start = new Date(y, qMonth, 1);
  const end = new Date(y, qMonth + 3, 0);
  return { start, end };
}

export function formatShort(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function isoDate(d) {
  return d.toISOString().split('T')[0];
}

export function buildWeeks(startDate, endDate) {
  const result = [];
  const current = mondayOf(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59);
  while (current <= end) {
    const weekEnd = new Date(current);
    weekEnd.setDate(weekEnd.getDate() + 6);
    result.push({ start: new Date(current), end: weekEnd });
    current.setDate(current.getDate() + 7);
  }
  return result;
}

export function isCurrentWeek(w) {
  const now = new Date();
  return now >= w.start && now <= w.end;
}
