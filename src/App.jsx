import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import html2canvas from 'html2canvas';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import GanttChart from './components/GanttChart.jsx';
import NoteModal from './components/NoteModal.jsx';
import Toasts from './components/Toast.jsx';
import { ColorDropdown, WeeksDropdown, CategoryDropdown, SegmentMenu } from './components/Menus.jsx';
import {
  buildWeeks,
  formatShort,
  getQuarterRange,
  hexToRgbUpper,
  isoDate,
} from './lib/utils.js';

const now = new Date();
const INITIAL_QUARTER = Math.floor(now.getMonth() / 3) + 1;
const INITIAL_YEAR = now.getFullYear();
const initialRange = getQuarterRange(INITIAL_QUARTER, INITIAL_YEAR);

function captureSnapshot(d) {
  return JSON.stringify({
    tasks: d.tasks,
    chartRowIds: d.chartRowIds,
    weekNotes: d.weekNotes,
    categories: d.categories,
    nextId: d.nextId,
  });
}

export default function App() {
  const [data, setData] = useState({
    tasks: [],
    chartRowIds: [],
    weekNotes: {},
    categories: [],
    nextId: 1,
  });

  const [title, setTitle] = useState('ATLAS');
  const [dateMode, setDateMode] = useState('quarter');
  const [quarter, setQuarter] = useState(INITIAL_QUARTER);
  const [year, setYear] = useState(INITIAL_YEAR);
  const [startInput, setStartInput] = useState(isoDate(initialRange.start));
  const [endInput, setEndInput] = useState(isoDate(initialRange.end));
  const [appliedStart, setAppliedStart] = useState(isoDate(initialRange.start));
  const [appliedEnd, setAppliedEnd] = useState(isoDate(initialRange.end));
  const [labelWidth, setLabelWidth] = useState('200px');
  const [selectedColor, setSelectedColor] = useState('#6c5ce7');
  const [activePhaseFilter, setActivePhaseFilter] = useState(null);
  const [notesCollapsed, setNotesCollapsed] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Transient UI
  const [ghost, setGhost] = useState(null);
  const [weekHighlight, setWeekHighlight] = useState(null);
  const [dimRowIdx, setDimRowIdx] = useState(null);
  const [addRowActive, setAddRowActive] = useState(false);
  const [dropdown, setDropdown] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [noteModal, setNoteModal] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [exportingImage, setExportingImage] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const wrapperRef = useRef(null);
  const containerRef = useRef(null);
  const dragDataRef = useRef(null);
  const rowDragIdxRef = useRef(null);
  const ghostRef = useRef({ taskId: null, insertIdx: -1, startWi: -1 });
  const toastId = useRef(0);

  const weeks = useMemo(
    () => buildWeeks(new Date(appliedStart + 'T00:00:00'), new Date(appliedEnd + 'T00:00:00')),
    [appliedStart, appliedEnd]
  );

  const chartRows = useMemo(
    () => data.chartRowIds.map((id) => data.tasks.find((t) => t.id === id)).filter(Boolean),
    [data]
  );
  const bankTasks = useMemo(() => data.tasks.filter((t) => !t.placed), [data]);
  const findTask = useCallback((id) => data.tasks.find((t) => t.id === id), [data]);

  const years = useMemo(() => {
    const arr = [];
    for (let y = INITIAL_YEAR - 2; y <= INITIAL_YEAR + 3; y++) arr.push(y);
    return arr;
  }, []);

  const dateRangeText = useMemo(() => {
    if (!appliedStart || !appliedEnd) return '';
    return `${formatShort(new Date(appliedStart + 'T00:00:00'))} – ${formatShort(
      new Date(appliedEnd + 'T00:00:00')
    )}`;
  }, [appliedStart, appliedEnd]);

  const mutate = useCallback((fn) => {
    setData((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  }, []);

  /* ── Undo / redo ── */
  const undoStack = useRef([]);
  const redoStack = useRef([]);
  const lastSnapshot = useRef(null);
  const pendingSnapshot = useRef(null);
  const snapshotTimer = useRef(null);
  const isUndoingOrRedoing = useRef(false);

  const updateBtns = useCallback(() => {
    setCanUndo(undoStack.current.length > 0 || pendingSnapshot.current !== null);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  const flushUndo = useCallback(() => {
    clearTimeout(snapshotTimer.current);
    if (pendingSnapshot.current !== null) {
      undoStack.current.push(pendingSnapshot.current);
      pendingSnapshot.current = null;
      updateBtns();
    }
  }, [updateBtns]);

  useEffect(() => {
    const snap = captureSnapshot(data);
    if (isUndoingOrRedoing.current) {
      lastSnapshot.current = snap;
      isUndoingOrRedoing.current = false;
      updateBtns();
      return;
    }
    if (lastSnapshot.current === null) {
      lastSnapshot.current = snap;
      return;
    }
    if (snap === lastSnapshot.current) return;
    if (pendingSnapshot.current === null) pendingSnapshot.current = lastSnapshot.current;
    lastSnapshot.current = snap;
    redoStack.current = [];
    clearTimeout(snapshotTimer.current);
    snapshotTimer.current = setTimeout(() => {
      if (pendingSnapshot.current !== null) {
        undoStack.current.push(pendingSnapshot.current);
        pendingSnapshot.current = null;
        updateBtns();
      }
    }, 300);
    updateBtns();
  }, [data, updateBtns]);

  const restoreState = useCallback((state) => {
    const tasks = state.tasks || [];
    const chartRowIds = (state.chartRowIds || []).filter((id) => tasks.some((t) => t.id === id));
    setData({
      tasks,
      chartRowIds,
      weekNotes: state.weekNotes || {},
      categories: state.categories || [],
      nextId: state.nextId || 1,
    });
  }, []);

  const undo = useCallback(() => {
    flushUndo();
    if (undoStack.current.length === 0) return;
    isUndoingOrRedoing.current = true;
    redoStack.current.push(lastSnapshot.current);
    const snapStr = undoStack.current.pop();
    restoreState(JSON.parse(snapStr));
    lastSnapshot.current = snapStr;
    updateBtns();
  }, [flushUndo, restoreState, updateBtns]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    flushUndo();
    isUndoingOrRedoing.current = true;
    undoStack.current.push(lastSnapshot.current);
    const snapStr = redoStack.current.pop();
    restoreState(JSON.parse(snapStr));
    lastSnapshot.current = snapStr;
    updateBtns();
  }, [flushUndo, restoreState, updateBtns]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  useEffect(() => {
    document.documentElement.style.setProperty('--label-width', labelWidth);
  }, [labelWidth]);

  useEffect(() => {
    document.title = title;
  }, [title]);

  /* ── Toast ── */
  const showToast = useCallback((msg) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2000);
  }, []);

  /* ── Task / tag actions ── */
  const addTask = useCallback(
    ({ name, weeks: w, category, color }) => {
      mutate((d) => {
        d.tasks.push({ id: d.nextId, name, weeks: w, color, category, placed: false, startWeek: null });
        d.nextId += 1;
      });
      showToast(`"${name}" added to task bank`);
    },
    [mutate, showToast]
  );

  const renameTask = useCallback((id, name) => mutate((d) => {
    const t = d.tasks.find((x) => x.id === id);
    if (t) t.name = name;
  }), [mutate]);

  const setTaskWeeks = useCallback((id, w) => mutate((d) => {
    const t = d.tasks.find((x) => x.id === id);
    if (t) t.weeks = w;
  }), [mutate]);

  const setTaskColor = useCallback((id, color) => mutate((d) => {
    const t = d.tasks.find((x) => x.id === id);
    if (t) t.color = color;
  }), [mutate]);

  const setTaskCategory = useCallback((id, cat) => mutate((d) => {
    const t = d.tasks.find((x) => x.id === id);
    if (t) t.category = cat;
  }), [mutate]);

  const deleteTask = useCallback((id) => mutate((d) => {
    d.tasks = d.tasks.filter((t) => t.id !== id);
    d.chartRowIds = d.chartRowIds.filter((x) => x !== id);
  }), [mutate]);

  const removeRow = useCallback((rowIdx) => mutate((d) => {
    const id = d.chartRowIds[rowIdx];
    const t = d.tasks.find((x) => x.id === id);
    if (t) { t.placed = false; t.startWeek = null; }
    d.chartRowIds.splice(rowIdx, 1);
  }), [mutate]);

  const addCategory = useCallback((name) => mutate((d) => {
    if (!d.categories.includes(name)) d.categories.push(name);
  }), [mutate]);

  const removeCategory = useCallback((name) => mutate((d) => {
    d.categories = d.categories.filter((c) => c !== name);
  }), [mutate]);

  /* ── Segment / phase menu actions ── */
  const withTask = useCallback((id, fn) => mutate((d) => {
    const t = d.tasks.find((x) => x.id === id);
    if (t) fn(t, d);
  }), [mutate]);

  const menuActions = useMemo(() => ({
    splitTask: (id, splitWeek) => withTask(id, (t) => {
      t.segments = [
        { label: '', color: t.color, weeks: splitWeek },
        { label: '', color: t.color, weeks: t.weeks - splitWeek },
      ];
    }),
    setPhase: (id, label) => withTask(id, (t) => { t.phase = label; }),
    clearPhase: (id) => withTask(id, (t) => { delete t.phase; }),
    splitSegment: (id, segIdx, segSplitAt) => withTask(id, (t) => {
      const seg = t.segments[segIdx];
      const newSeg = { label: '', color: seg.color, weeks: seg.weeks - segSplitAt };
      seg.weeks = segSplitAt;
      t.segments.splice(segIdx + 1, 0, newSeg);
    }),
    insertGap: (id, segIdx, pos) => withTask(id, (t) => {
      const at = pos === 'before' ? segIdx : segIdx + 1;
      t.segments.splice(at, 0, { label: '', gap: true, color: t.color, weeks: 1 });
      t.weeks += 1;
    }),
    convertToGap: (id, segIdx) => withTask(id, (t) => {
      t.segments[segIdx].gap = true;
      t.segments[segIdx].label = '';
    }),
    removeSegment: (id, segIdx) => withTask(id, (t) => {
      const removedWeeks = t.segments[segIdx].weeks;
      t.segments.splice(segIdx, 1);
      const neighbor = segIdx < t.segments.length ? t.segments[segIdx] : t.segments[segIdx - 1];
      neighbor.weeks += removedWeeks;
      if (t.segments.length === 1) {
        t.color = t.segments[0].color;
        delete t.segments;
      }
    }),
    setSegmentPhase: (id, segIdx, label, color) => withTask(id, (t) => {
      const seg = t.segments[segIdx];
      seg.label = label;
      seg.color = color;
      delete seg.gap;
    }),
  }), [withTask]);

  const commitSegmentLabel = useCallback((id, segIdx, val) => withTask(id, (t) => {
    if (t.segments && t.segments[segIdx]) t.segments[segIdx].label = val;
  }), [withTask]);

  /* ── Dropdown / menu openers ── */
  const openColorDropdown = useCallback((rect, taskId) => setDropdown({ type: 'color', rect, taskId }), []);
  const openWeeksDropdown = useCallback((rect, taskId) => setDropdown({ type: 'weeks', rect, taskId }), []);
  const openCategoryDropdown = useCallback((rect, taskId) => setDropdown({ type: 'category', rect, taskId }), []);

  const showSegmentMenu = useCallback((e, task, segIdx, rowIdx) => {
    const rowCells = e.target.closest('.row-cells');
    let splitWeek = Math.floor(task.weeks / 2);
    if (rowCells) {
      const rect = rowCells.getBoundingClientRect();
      const cellWidth = rect.width / weeks.length;
      const clickWeek = Math.floor((e.clientX - rect.left) / cellWidth);
      splitWeek = Math.max(1, Math.min(clickWeek - task.startWeek, task.weeks - 1));
    }
    let segSplitAt = 0;
    if (segIdx >= 0 && task.segments) {
      const seg = task.segments[segIdx];
      segSplitAt = Math.floor(seg.weeks / 2);
      if (rowCells) {
        let segStart = task.startWeek;
        for (let i = 0; i < segIdx; i++) segStart += task.segments[i].weeks;
        const rect = rowCells.getBoundingClientRect();
        const cellWidth = rect.width / weeks.length;
        const clickWeek = Math.floor((e.clientX - rect.left) / cellWidth);
        segSplitAt = Math.max(1, Math.min(clickWeek - segStart, seg.weeks - 1));
      }
    }
    setContextMenu({ task, segIdx, rowIdx, x: e.clientX, y: e.clientY, splitWeek, segSplitAt });
  }, [weeks.length]);

  const openBarContextMenu = useCallback((e, task, rowIdx) => {
    e.preventDefault();
    let segIdx = -1;
    if (task.segments && task.segments.length) {
      const segs = e.currentTarget.querySelectorAll('.segment');
      let closest = 0;
      let closestDist = Infinity;
      segs.forEach((s, i) => {
        const r = s.getBoundingClientRect();
        const center = r.left + r.width / 2;
        const dist = Math.abs(e.clientX - center);
        if (dist < closestDist) { closestDist = dist; closest = i; }
      });
      segIdx = closest;
    }
    showSegmentMenu(e, task, segIdx, rowIdx);
  }, [showSegmentMenu]);

  /* ── Notes ── */
  const openNoteModal = useCallback((wi) => setNoteModal({ weekIdx: wi }), []);
  const saveNote = useCallback((wi, val) => {
    mutate((d) => {
      if (val) d.weekNotes[wi] = val;
      else delete d.weekNotes[wi];
    });
    setNoteModal(null);
  }, [mutate]);

  /* ── Dates ── */
  const applyDates = useCallback(() => {
    let s = startInput;
    let e = endInput;
    if (dateMode === 'quarter') {
      const { start, end } = getQuarterRange(quarter, year);
      s = isoDate(start);
      e = isoDate(end);
      setStartInput(s);
      setEndInput(e);
    }
    if (!s || !e) return;
    const newWeeks = buildWeeks(new Date(s + 'T00:00:00'), new Date(e + 'T00:00:00'));
    const removed = chartRows.filter(
      (t) => t.startWeek !== null && (t.startWeek >= newWeeks.length || t.startWeek + t.weeks - 1 >= newWeeks.length)
    );
    if (removed.length) {
      const removedIds = new Set(removed.map((t) => t.id));
      mutate((d) => {
        d.chartRowIds = d.chartRowIds.filter((id) => !removedIds.has(id));
        d.tasks.forEach((t) => {
          if (removedIds.has(t.id)) { t.placed = false; t.startWeek = null; }
        });
      });
      showToast(`Moved ${removed.length} task${removed.length > 1 ? 's' : ''} back to bank (out of range)`);
    }
    setAppliedStart(s);
    setAppliedEnd(e);
  }, [startInput, endInput, dateMode, quarter, year, chartRows, mutate, showToast]);

  /* ── Drag & drop plumbing ── */
  const showGhostRow = useCallback((taskId, insertIdx, startWi) => {
    ghostRef.current = { taskId, insertIdx, startWi };
    setGhost((prev) =>
      prev && prev.taskId === taskId && prev.insertIdx === insertIdx && prev.startWi === startWi
        ? prev
        : { taskId, insertIdx, startWi }
    );
  }, []);

  const removeGhostRow = useCallback(() => {
    ghostRef.current = { taskId: null, insertIdx: -1, startWi: -1 };
    setGhost(null);
  }, []);

  const resetDrag = useCallback(() => {
    dragDataRef.current = null;
    rowDragIdxRef.current = null;
    removeGhostRow();
    setWeekHighlight(null);
    setDimRowIdx(null);
    setAddRowActive(false);
  }, [removeGhostRow]);

  const getWeekFromX = useCallback((e, container) => {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const cellWidth = rect.width / weeks.length;
    return Math.max(0, Math.min(weeks.length - 1, Math.floor(x / cellWidth)));
  }, [weeks.length]);

  const getDropStartWeek = useCallback((e, container) => {
    const raw = getWeekFromX(e, container);
    const dd = dragDataRef.current;
    if (!dd) return raw;
    const task = findTask(dd.taskId);
    if (!task) return raw;
    const offset = dd.grabOffset || 0;
    const startWi = Math.max(0, raw - offset);
    return Math.min(startWi, weeks.length - task.weeks);
  }, [getWeekFromX, findTask, weeks.length]);

  const onBankDragStart = useCallback((e, taskId) => {
    const task = findTask(taskId);
    if (task && task.weeks > weeks.length) {
      e.preventDefault();
      showToast(`"${task.name}" is ${task.weeks}w but the chart only has ${weeks.length} weeks`);
      return;
    }
    dragDataRef.current = { source: 'bank', taskId };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    e.currentTarget.classList.add('dragging');

    const refCell = document.querySelector('.week-cell');
    if (refCell && task) {
      const cellWidth = refCell.getBoundingClientRect().width;
      const g = document.createElement('div');
      g.style.cssText = `position:fixed;left:-9999px;top:-9999px;width:${task.weeks * cellWidth - 4}px;height:32px;background:${task.color};border-radius:6px;display:flex;align-items:center;justify-content:center;padding:2px 12px;font-size:12px;font-weight:600;color:#fff;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;opacity:0.85;box-sizing:border-box;`;
      g.textContent = task.name;
      document.body.appendChild(g);
      e.dataTransfer.setDragImage(g, (task.weeks * cellWidth - 4) / 2, 16);
      requestAnimationFrame(() => g.remove());
    }
  }, [findTask, weeks.length, showToast]);

  const onBarDragStart = useCallback((e, taskId, rowIdx) => {
    e.stopPropagation();
    const task = findTask(taskId);
    const rowCells = e.currentTarget.closest('.row-cells');
    const rect = rowCells.getBoundingClientRect();
    const cellWidth = rect.width / weeks.length;
    const grabOffset = Math.floor((e.clientX - rect.left - task.startWeek * cellWidth) / cellWidth);
    dragDataRef.current = { source: 'chart', taskId, rowIdx, grabOffset: Math.max(0, grabOffset) };
    rowDragIdxRef.current = rowIdx;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  }, [findTask, weeks.length]);

  const onRowHandleDragStart = useCallback((e, rowIdx, taskId) => {
    e.stopPropagation();
    rowDragIdxRef.current = rowIdx;
    dragDataRef.current = { source: 'reorder', taskId, rowIdx };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    setDimRowIdx(rowIdx);
  }, []);

  const onDragEnd = useCallback(() => {
    document.querySelectorAll('.dragging').forEach((el) => el.classList.remove('dragging'));
    resetDrag();
  }, [resetDrag]);

  const onRowDragOver = useCallback((e, rowIdx) => {
    const dd = dragDataRef.current;
    if (!dd) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const task = findTask(dd.taskId);
    if (!task) return;
    const rowEl = e.currentTarget.closest('.gantt-row') || e.currentTarget;
    const cellsEl = rowEl.querySelector('.row-cells');
    if (!cellsEl) return;
    const rowRect = rowEl.getBoundingClientRect();
    const mid = rowRect.top + rowRect.height / 2;
    const insertIdx = e.clientY < mid ? rowIdx : rowIdx + 1;

    if (dd.source === 'bank') {
      const wi = getWeekFromX(e, cellsEl);
      const startWi = Math.max(0, Math.min(wi, weeks.length - task.weeks));
      setWeekHighlight(null);
      showGhostRow(dd.taskId, insertIdx, startWi);
    } else if (dd.source === 'chart') {
      e.stopPropagation();
      const startWi = getDropStartWeek(e, cellsEl);
      if (insertIdx === rowDragIdxRef.current || insertIdx === rowDragIdxRef.current + 1) {
        removeGhostRow();
        setDimRowIdx(null);
        setWeekHighlight({ rowIdx: rowDragIdxRef.current, startWi, weeks: task.weeks });
      } else {
        setWeekHighlight(null);
        setDimRowIdx(dd.rowIdx);
        showGhostRow(dd.taskId, insertIdx, startWi);
      }
    } else if (dd.source === 'reorder') {
      e.stopPropagation();
      if (insertIdx === rowDragIdxRef.current || insertIdx === rowDragIdxRef.current + 1) {
        removeGhostRow();
        return;
      }
      const startWi = task.startWeek !== null ? task.startWeek : 0;
      showGhostRow(dd.taskId, insertIdx, startWi);
    }
  }, [findTask, getWeekFromX, getDropStartWeek, weeks.length, showGhostRow, removeGhostRow]);

  const onRowDrop = useCallback((e, rowIdx) => {
    const dd = dragDataRef.current;
    if (!dd) return;
    const rowEl = e.currentTarget.closest('.gantt-row') || e.currentTarget;
    const cellsEl = rowEl.querySelector('.row-cells');

    if (dd.source === 'reorder' || dd.source === 'chart') {
      e.preventDefault();
      e.stopPropagation();
      const g = ghostRef.current;
      const savedGhostIdx = g.insertIdx;
      const savedStartWi = g.startWi;
      const task = findTask(dd.taskId);
      if (!task) { resetDrag(); return; }
      const origIdx = dd.rowIdx;
      let newStartWeek = null;
      if (dd.source === 'chart') {
        const startWi = savedGhostIdx >= 0 && savedStartWi >= 0 ? savedStartWi : getDropStartWeek(e, cellsEl);
        if (startWi + task.weeks > weeks.length) {
          showToast(`Not enough room — task needs ${task.weeks}w but only ${weeks.length - startWi} left`);
          resetDrag();
          return;
        }
        newStartWeek = startWi;
      }
      mutate((d) => {
        const t = d.tasks.find((x) => x.id === dd.taskId);
        if (dd.source === 'chart' && t) t.startWeek = newStartWeek;
        if (savedGhostIdx >= 0 && savedGhostIdx !== origIdx && savedGhostIdx !== origIdx + 1) {
          const [moved] = d.chartRowIds.splice(origIdx, 1);
          const at = savedGhostIdx > origIdx ? savedGhostIdx - 1 : savedGhostIdx;
          d.chartRowIds.splice(at, 0, moved);
        }
      });
      resetDrag();
      return;
    }

    // bank source
    e.preventDefault();
    const g = ghostRef.current;
    const savedGhostIdx = g.insertIdx;
    const task = findTask(dd.taskId);
    if (!task) { resetDrag(); return; }
    const raw = getWeekFromX(e, cellsEl);
    const startWi = Math.max(0, Math.min(raw, weeks.length - task.weeks));
    if (startWi + task.weeks > weeks.length) {
      showToast(`Not enough room — task needs ${task.weeks}w but only ${weeks.length - startWi} left`);
      resetDrag();
      return;
    }
    const insertIdx = savedGhostIdx >= 0 ? savedGhostIdx : rowIdx;
    mutate((d) => {
      const t = d.tasks.find((x) => x.id === dd.taskId);
      t.placed = true;
      t.startWeek = startWi;
      d.chartRowIds.splice(insertIdx, 0, t.id);
    });
    resetDrag();
  }, [findTask, getDropStartWeek, getWeekFromX, weeks.length, mutate, resetDrag, showToast]);

  const onBodyDragOver = useCallback((e) => {
    const g = ghostRef.current;
    const dd = dragDataRef.current;
    if (g.insertIdx < 0 || !dd) return;
    if (dd.source !== 'bank' && dd.source !== 'chart' && dd.source !== 'reorder') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const task = findTask(dd.taskId);
    if (task && dd.source !== 'reorder') {
      const ghostCells = e.currentTarget.querySelector('.ghost-row .row-cells');
      if (ghostCells) {
        const rect = ghostCells.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const cellWidth = rect.width / weeks.length;
        let wi;
        if (dd.source === 'chart') {
          const offset = dd.grabOffset || 0;
          wi = Math.max(0, Math.floor(x / cellWidth) - offset);
        } else {
          wi = Math.max(0, Math.min(weeks.length - 1, Math.floor(x / cellWidth)));
        }
        const startWi = Math.max(0, Math.min(wi, weeks.length - task.weeks));
        if (startWi !== g.startWi) showGhostRow(dd.taskId, g.insertIdx, startWi);
      }
    }
  }, [findTask, weeks.length, showGhostRow]);

  const onBodyDrop = useCallback((e) => {
    const g = ghostRef.current;
    const dd = dragDataRef.current;
    if (g.insertIdx < 0 || !dd) return;

    if (dd.source === 'chart' || dd.source === 'reorder') {
      e.preventDefault();
      const task = findTask(dd.taskId);
      if (!task) { resetDrag(); return; }
      const origIdx = dd.rowIdx;
      const insertIdx = g.insertIdx;
      const savedStartWi = g.startWi;
      let newStartWeek = null;
      if (dd.source === 'chart') {
        const startWi = savedStartWi >= 0 ? savedStartWi : (task.startWeek || 0);
        if (startWi + task.weeks > weeks.length) {
          showToast(`Not enough room — task needs ${task.weeks}w but only ${weeks.length - startWi} left`);
          resetDrag();
          return;
        }
        newStartWeek = startWi;
      }
      mutate((d) => {
        const t = d.tasks.find((x) => x.id === dd.taskId);
        if (dd.source === 'chart' && t) t.startWeek = newStartWeek;
        if (insertIdx !== origIdx && insertIdx !== origIdx + 1) {
          const [moved] = d.chartRowIds.splice(origIdx, 1);
          const at = insertIdx > origIdx ? insertIdx - 1 : insertIdx;
          d.chartRowIds.splice(at, 0, moved);
        }
      });
      resetDrag();
      return;
    }

    if (dd.source !== 'bank') return;
    e.preventDefault();
    const task = findTask(dd.taskId);
    if (!task) { resetDrag(); return; }
    const ghostCells = e.currentTarget.querySelector('.ghost-row .row-cells');
    let startWi = 0;
    if (ghostCells) {
      const rect = ghostCells.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const cellWidth = rect.width / weeks.length;
      const wi = Math.max(0, Math.min(weeks.length - 1, Math.floor(x / cellWidth)));
      startWi = Math.max(0, Math.min(wi, weeks.length - task.weeks));
    }
    const insertIdx = g.insertIdx;
    if (startWi + task.weeks > weeks.length) {
      showToast(`Not enough room — task needs ${task.weeks}w but only ${weeks.length - startWi} left`);
      resetDrag();
      return;
    }
    mutate((d) => {
      const t = d.tasks.find((x) => x.id === dd.taskId);
      t.placed = true;
      t.startWeek = startWi;
      d.chartRowIds.splice(insertIdx, 0, t.id);
    });
    resetDrag();
  }, [findTask, weeks.length, mutate, resetDrag, showToast]);

  const onAddRowDragOver = useCallback((e) => {
    e.preventDefault();
    const dd = dragDataRef.current;
    if (!dd) return;
    if (dd.source === 'reorder' || dd.source === 'chart') {
      const task = findTask(dd.taskId);
      if (task) {
        if (dd.source === 'chart') setDimRowIdx(dd.rowIdx);
        const startWi = task.startWeek !== null ? task.startWeek : 0;
        showGhostRow(dd.taskId, chartRows.length, startWi);
        setAddRowActive(false);
      }
    } else if (dd.source === 'bank') {
      removeGhostRow();
      setAddRowActive(true);
    }
  }, [findTask, chartRows.length, showGhostRow, removeGhostRow]);

  const onAddRowDragLeave = useCallback(() => setAddRowActive(false), []);

  const onAddRowDrop = useCallback((e) => {
    e.preventDefault();
    setAddRowActive(false);
    const dd = dragDataRef.current;
    const g = ghostRef.current;
    if (dd && (dd.source === 'reorder' || dd.source === 'chart')) {
      const savedGhostIdx = g.insertIdx;
      const savedStartWi = g.startWi;
      const task = findTask(dd.taskId);
      if (!task) { resetDrag(); return; }
      const origIdx = dd.rowIdx;
      mutate((d) => {
        const t = d.tasks.find((x) => x.id === dd.taskId);
        if (dd.source === 'chart' && t) t.startWeek = savedStartWi >= 0 ? savedStartWi : (t.startWeek || 0);
        if (savedGhostIdx >= 0 && savedGhostIdx !== origIdx && savedGhostIdx !== origIdx + 1) {
          const [moved] = d.chartRowIds.splice(origIdx, 1);
          const at = savedGhostIdx > origIdx ? savedGhostIdx - 1 : savedGhostIdx;
          d.chartRowIds.splice(at, 0, moved);
        }
      });
      resetDrag();
      return;
    }
    if (!dd || dd.source !== 'bank') return;
    const task = findTask(dd.taskId);
    if (!task) return;
    if (task.weeks > weeks.length) {
      showToast(`Not enough room — task needs ${task.weeks}w but chart has ${weeks.length}`);
      resetDrag();
      return;
    }
    mutate((d) => {
      const t = d.tasks.find((x) => x.id === dd.taskId);
      t.placed = true;
      t.startWeek = 0;
      d.chartRowIds.push(t.id);
    });
    resetDrag();
  }, [findTask, weeks.length, mutate, resetDrag, showToast]);

  /* ── Resize handles ── */
  const onResizeStart = useCallback((e, task, side) => {
    e.preventDefault();
    e.stopPropagation();
    const rowCells = e.target.closest('.row-cells');
    const rect = rowCells.getBoundingClientRect();
    const cellWidth = rect.width / weeks.length;
    const wlen = weeks.length;
    const taskId = task.id;
    const onMove = (ev) => {
      const x = ev.clientX - rect.left;
      const hoverWeek = Math.max(0, Math.min(wlen - 1, Math.floor(x / cellWidth)));
      setData((prev) => {
        const next = structuredClone(prev);
        const t = next.tasks.find((x2) => x2.id === taskId);
        if (!t) return prev;
        const hasSegs = t.segments && t.segments.length;
        if (side === 'right') {
          const newWeeks = hoverWeek - t.startWeek + 1;
          if (newWeeks >= 1 && t.startWeek + newWeeks <= wlen && t.weeks !== newWeeks) {
            const delta = newWeeks - t.weeks;
            if (hasSegs) {
              const last = t.segments[t.segments.length - 1];
              if (last.weeks + delta < 1) return prev;
              last.weeks += delta;
            }
            t.weeks = newWeeks;
            return next;
          }
          return prev;
        }
        const endWeek = t.startWeek + t.weeks - 1;
        if (hoverWeek >= 0 && hoverWeek <= endWeek) {
          const newWeeks = endWeek - hoverWeek + 1;
          if (t.weeks !== newWeeks || t.startWeek !== hoverWeek) {
            const delta = newWeeks - t.weeks;
            if (hasSegs) {
              const first = t.segments[0];
              if (first.weeks + delta < 1) return prev;
              first.weeks += delta;
            }
            t.weeks = newWeeks;
            t.startWeek = hoverWeek;
            return next;
          }
        }
        return prev;
      });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [weeks.length]);

  const onDividerResize = useCallback((e, task, dividerIdx) => {
    e.preventDefault();
    e.stopPropagation();
    const rowCells = e.target.closest('.row-cells');
    const rect = rowCells.getBoundingClientRect();
    const cellWidth = rect.width / weeks.length;
    const wlen = weeks.length;
    const taskId = task.id;
    let segStart = task.startWeek;
    for (let i = 0; i < dividerIdx; i++) segStart += task.segments[i].weeks;
    const totalWeeks = task.segments[dividerIdx].weeks + task.segments[dividerIdx + 1].weeks;
    const onMove = (ev) => {
      const x = ev.clientX - rect.left;
      const hoverWeek = Math.max(0, Math.min(wlen - 1, Math.floor(x / cellWidth)));
      const newLeft = hoverWeek - segStart;
      const newRight = totalWeeks - newLeft;
      setData((prev) => {
        const next = structuredClone(prev);
        const t = next.tasks.find((x2) => x2.id === taskId);
        if (!t || !t.segments) return prev;
        const L = t.segments[dividerIdx];
        const R = t.segments[dividerIdx + 1];
        if (newLeft >= 1 && newRight >= 1 && L.weeks !== newLeft) {
          L.weeks = newLeft;
          R.weeks = newRight;
          return next;
        }
        return prev;
      });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [weeks.length]);

  /* ── Label column resize ── */
  const onLabelResizeStart = useCallback((e) => {
    e.preventDefault();
    e.target.classList.add('resizing');
    const startWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--label-width'));
    const startX = e.clientX;
    const onMove = (ev) => {
      const delta = ev.clientX - startX;
      const newWidth = Math.max(100, Math.min(500, startWidth + delta));
      setLabelWidth(newWidth + 'px');
    };
    const onUp = (ev) => {
      ev.target && document.querySelectorAll('.label-resize-handle.resizing').forEach((el) => el.classList.remove('resizing'));
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  /* ── Export as image ── */
  const exportImage = useCallback(async () => {
    setExportingImage(true);
    document.body.classList.add('exporting');
    const wrapper = wrapperRef.current;
    const container = containerRef.current;
    const prevOverflow = wrapper.style.overflow;
    const prevScroll = wrapper.scrollLeft;
    wrapper.style.overflow = 'visible';
    wrapper.scrollLeft = 0;
    await new Promise((r) => setTimeout(r, 100));
    try {
      const canvas = await html2canvas(container, {
        backgroundColor: '#0f1117',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      const chartName = (title || 'Gantt Chart').replace(/[/\\?%*:|"<>]/g, '');
      link.download = `${chartName}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('Chart exported as PNG');
    } catch (err) {
      showToast('Export failed — see console for details');
      console.error('Export error:', err);
    } finally {
      document.body.classList.remove('exporting');
      wrapper.style.overflow = prevOverflow;
      wrapper.scrollLeft = prevScroll;
      setExportingImage(false);
    }
  }, [title, showToast]);

  /* ── Export as Excel ── */
  const exportExcel = useCallback(() => {
    setExportingExcel(true);
    try {
      const wb = XLSX.utils.book_new();
      const headerRow = ['Task', 'Tag', 'Weeks'];
      weeks.forEach((w, i) => headerRow.push(`W${i + 1}\n${formatShort(w.start)} – ${formatShort(w.end)}`));
      const rows = [headerRow];
      const merges = [];
      chartRows.forEach((t, ri) => {
        const r = [t.name, t.category || '', t.weeks + 'w'];
        weeks.forEach(() => r.push(''));
        rows.push(r);
        if (t.startWeek !== null) {
          if (t.segments && t.segments.length) {
            let sw = t.startWeek;
            t.segments.forEach((seg) => {
              if (seg.weeks > 1) merges.push({ s: { r: ri + 1, c: sw + 3 }, e: { r: ri + 1, c: sw + seg.weeks - 1 + 3 } });
              sw += seg.weeks;
            });
          } else if (t.weeks > 1) {
            merges.push({ s: { r: ri + 1, c: t.startWeek + 3 }, e: { r: ri + 1, c: t.startWeek + t.weeks - 1 + 3 } });
          }
        }
      });
      const notesRow = ['Notes', '', ''];
      let hasNotes = false;
      weeks.forEach((_, wi) => {
        const note = data.weekNotes[wi] || '';
        if (note) hasNotes = true;
        notesRow.push(note);
      });
      if (hasNotes) rows.push(notesRow);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!merges'] = merges;
      const colWidths = [{ wch: 22 }, { wch: 12 }, { wch: 6 }];
      weeks.forEach(() => colWidths.push({ wch: 16 }));
      ws['!cols'] = colWidths;

      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        fill: { patternType: 'solid', fgColor: { rgb: '1A1D27' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: '2E3345' } },
          bottom: { style: 'thin', color: { rgb: '2E3345' } },
          left: { style: 'thin', color: { rgb: '2E3345' } },
          right: { style: 'thin', color: { rgb: '2E3345' } },
        },
      };
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: 0, c: C });
        if (ws[addr]) ws[addr].s = headerStyle;
      }
      const taskCellStyle = (taskColor) => ({
        fill: { patternType: 'solid', fgColor: { rgb: taskColor } },
        border: {
          top: { style: 'thin', color: { rgb: '2E3345' } },
          bottom: { style: 'thin', color: { rgb: '2E3345' } },
          left: { style: 'thin', color: { rgb: '2E3345' } },
          right: { style: 'thin', color: { rgb: '2E3345' } },
        },
      });
      chartRows.forEach((t, ri) => {
        const excelRow = ri + 1;
        if (t.startWeek !== null) {
          if (t.segments && t.segments.length) {
            let sw = t.startWeek;
            t.segments.forEach((seg) => {
              const segStyle = taskCellStyle(hexToRgbUpper(seg.color));
              for (let wi = sw; wi < sw + seg.weeks; wi++) {
                const addr = XLSX.utils.encode_cell({ r: excelRow, c: wi + 3 });
                if (!ws[addr]) ws[addr] = { t: 's', v: '' };
                ws[addr].s = segStyle;
              }
              sw += seg.weeks;
            });
          } else {
            const style = taskCellStyle(hexToRgbUpper(t.color));
            for (let wi = t.startWeek; wi < t.startWeek + t.weeks; wi++) {
              const addr = XLSX.utils.encode_cell({ r: excelRow, c: wi + 3 });
              if (!ws[addr]) ws[addr] = { t: 's', v: '' };
              ws[addr].s = style;
            }
          }
        }
        const nameAddr = XLSX.utils.encode_cell({ r: excelRow, c: 0 });
        if (ws[nameAddr]) ws[nameAddr].s = { font: { bold: true, sz: 11 }, alignment: { vertical: 'center' } };
      });

      XLSX.utils.book_append_sheet(wb, ws, (title || 'Gantt Chart').substring(0, 31));
      const safeName = (title || 'Gantt Chart').replace(/[/\\?%*:|"<>]/g, '');
      XLSX.writeFile(wb, `${safeName}-${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Chart exported as Excel');
    } catch (err) {
      showToast('Excel export failed — see console');
      console.error('Excel export error:', err);
    } finally {
      setExportingExcel(false);
    }
  }, [weeks, chartRows, data.weekNotes, title, showToast]);

  /* ── Save / load config ── */
  const saveConfig = useCallback(() => {
    const state = {
      title,
      startDate: appliedStart,
      endDate: appliedEnd,
      tasks: data.tasks,
      chartRowIds: data.chartRowIds,
      weekNotes: data.weekNotes,
      categories: data.categories,
      labelWidth,
      nextId: data.nextId,
    };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    const configName = (title || 'Gantt Chart').replace(/[/\\?%*:|"<>]/g, '');
    link.download = `${configName}-${new Date().toISOString().split('T')[0]}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('Config saved as JSON');
  }, [title, appliedStart, appliedEnd, data, labelWidth, showToast]);

  const loadConfig = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const cfg = JSON.parse(ev.target.result);
        const tasks = cfg.tasks || [];
        const nextId = cfg.nextId || (tasks.length ? Math.max(...tasks.map((t) => t.id)) + 1 : 1);
        const chartRowIds = (cfg.chartRowIds || []).filter((id) => tasks.some((t) => t.id === id));
        undoStack.current = [];
        redoStack.current = [];
        pendingSnapshot.current = null;
        lastSnapshot.current = null;
        setCanUndo(false);
        setCanRedo(false);
        setData({ tasks, chartRowIds, weekNotes: cfg.weekNotes || {}, categories: cfg.categories || [], nextId });
        if (cfg.title) setTitle(cfg.title);
        if (cfg.startDate) { setStartInput(cfg.startDate); setAppliedStart(cfg.startDate); }
        if (cfg.endDate) { setEndInput(cfg.endDate); setAppliedEnd(cfg.endDate); }
        if (cfg.labelWidth) setLabelWidth(cfg.labelWidth);
        showToast('Config loaded');
      } catch (err) {
        showToast('Failed to load config — invalid file');
        console.error('Load config error:', err);
      }
    };
    reader.readAsText(file);
  }, [showToast]);

  const dropdownTask = dropdown ? findTask(dropdown.taskId) : null;

  return (
    <>
      <Header
        title={title}
        onTitleCommit={setTitle}
        dateMode={dateMode}
        setDateMode={setDateMode}
        quarter={quarter}
        setQuarter={setQuarter}
        year={year}
        setYear={setYear}
        years={years}
        startDate={startInput}
        endDate={endInput}
        setStartDate={setStartInput}
        setEndDate={setEndInput}
        onApply={applyDates}
        onExportImage={exportImage}
        onExportExcel={exportExcel}
        exportingImage={exportingImage}
        exportingExcel={exportingExcel}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onSaveConfig={saveConfig}
        onLoadConfig={loadConfig}
      />

      <div className="app">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
          categories={data.categories}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          onAddTask={addTask}
          onAddCategory={addCategory}
          onRemoveCategory={removeCategory}
          bankTasks={bankTasks}
          weeksLength={weeks.length}
          onBankDragStart={onBankDragStart}
          onDragEnd={onDragEnd}
          onDeleteTask={deleteTask}
          renameTask={renameTask}
          openColorDropdown={openColorDropdown}
          openWeeksDropdown={openWeeksDropdown}
          openCategoryDropdown={openCategoryDropdown}
        />

        <GanttChart
          wrapperRef={wrapperRef}
          containerRef={containerRef}
          weeks={weeks}
          chartRows={chartRows}
          weekNotes={data.weekNotes}
          notesCollapsed={notesCollapsed}
          activePhaseFilter={activePhaseFilter}
          chartName={title}
          dateRangeText={dateRangeText}
          setPhaseFilter={setActivePhaseFilter}
          toggleNotes={() => setNotesCollapsed((c) => !c)}
          openNoteModal={openNoteModal}
          onLabelResizeStart={onLabelResizeStart}
          ghost={ghost}
          weekHighlight={weekHighlight}
          dimRowIdx={dimRowIdx}
          addRowActive={addRowActive}
          findTask={findTask}
          onRowDragOver={onRowDragOver}
          onRowDrop={onRowDrop}
          onRowHandleDragStart={onRowHandleDragStart}
          onDragEnd={onDragEnd}
          onBodyDragOver={onBodyDragOver}
          onBodyDrop={onBodyDrop}
          onAddRowDragOver={onAddRowDragOver}
          onAddRowDragLeave={onAddRowDragLeave}
          onAddRowDrop={onAddRowDrop}
          removeRow={removeRow}
          renameTask={renameTask}
          openColorDropdown={openColorDropdown}
          openWeeksDropdown={openWeeksDropdown}
          openCategoryDropdown={openCategoryDropdown}
          bar={{
            onBarDragStart,
            onDragEnd,
            onResizeStart,
            onDividerResize,
            onBarContextMenu: openBarContextMenu,
            onSegmentContextMenu: showSegmentMenu,
            onCommitSegmentLabel: commitSegmentLabel,
          }}
        />
      </div>

      {dropdown && dropdownTask && dropdown.type === 'color' && (
        <ColorDropdown
          anchorRect={dropdown.rect}
          current={dropdownTask.color}
          onPick={(c) => setTaskColor(dropdown.taskId, c)}
          onClose={() => setDropdown(null)}
        />
      )}
      {dropdown && dropdownTask && dropdown.type === 'weeks' && (
        <WeeksDropdown
          anchorRect={dropdown.rect}
          current={dropdownTask.weeks}
          onPick={(w) => setTaskWeeks(dropdown.taskId, w)}
          onClose={() => setDropdown(null)}
        />
      )}
      {dropdown && dropdownTask && dropdown.type === 'category' && (
        <CategoryDropdown
          anchorRect={dropdown.rect}
          current={dropdownTask.category}
          categories={data.categories}
          onPick={(c) => setTaskCategory(dropdown.taskId, c)}
          onClose={() => setDropdown(null)}
        />
      )}

      {contextMenu && (
        <SegmentMenu menu={contextMenu} actions={menuActions} onClose={() => setContextMenu(null)} />
      )}

      {noteModal && (
        <NoteModal
          weekIdx={noteModal.weekIdx}
          week={weeks[noteModal.weekIdx]}
          initial={data.weekNotes[noteModal.weekIdx] || ''}
          onSave={(val) => saveNote(noteModal.weekIdx, val)}
          onClose={() => setNoteModal(null)}
        />
      )}

      <Toasts toasts={toasts} />
    </>
  );
}
