# ATLAS — Aligned Timeline Layout And Scheduling

A React + Vite Gantt chart / timeline planner. This is a component-based rewrite of the
original single-file `original.html` prototype, preserving all of its behavior.

## Features

- **Task bank & drag-and-drop** — create tasks, drag them onto the chart, reorder rows,
  and move bars across weeks.
- **Resizable bars & segments** — drag the edges to change duration; split bars into
  phase segments, insert gaps, and resize segment dividers.
- **Phases** — right-click a bar/segment to assign a phase (Product, Design, Engineering
  with sub-types, Data, QA, Test) and filter by phase.
- **Editable everything** — inline rename tasks & segments, change colors, tags, and
  durations from dropdowns; editable chart title.
- **Quarter / custom date ranges**, per-week notes, collapsible notes row, resizable
  label column.
- **Undo / redo** (Ctrl+Z / Ctrl+Shift+Z).
- **Export** to PNG (html2canvas) and styled Excel (xlsx-js-style).
- **Save / load** the whole board as JSON.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
```

## Project structure

```
index.html              Vite entry
src/
  main.jsx              React bootstrap
  App.jsx               State, undo/redo, drag-and-drop, exports, orchestration
  styles.css            Ported styles (dark theme)
  lib/
    constants.js        Colors, phase types, week options
    utils.js            Date / color / phase helpers
  components/
    Header.jsx          Title, date controls, export, undo/redo, save/load
    Sidebar.jsx         New-task form, tag manager, task bank
    GanttChart.jsx      Headers, notes row, rows, ghost row
    TaskBar.jsx         Bars, segments, resize handles, dividers
    Menus.jsx           Context menu + color/weeks/category dropdowns
    NoteModal.jsx       Per-week notes editor
    Toast.jsx           Transient notifications
    Portal.jsx          Viewport-aware popover positioning
    InlineEdit.jsx      Inline rename input

original.html           The original single-file prototype (kept for reference)
```
