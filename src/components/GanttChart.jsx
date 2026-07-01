import { useState } from 'react';
import { PHASE_TYPES } from '../lib/constants.js';
import { formatShort, isCurrentWeek, phaseMatchesFilter } from '../lib/utils.js';
import TaskBar from './TaskBar.jsx';
import InlineEdit from './InlineEdit.jsx';

function RowLabel({ task, rowIdx, onRowHandleDragStart, onDragEnd, removeRow, renameTask, openColorDropdown, openWeeksDropdown, openCategoryDropdown }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="row-label">
      <span
        className="drag-handle"
        draggable
        title="Drag to reorder"
        onDragStart={(e) => onRowHandleDragStart(e, rowIdx, task.id)}
        onDragEnd={onDragEnd}
      >
        ⠿
      </span>
      <span
        className="row-color-dot"
        style={{ background: task.color }}
        onClick={(e) => {
          e.stopPropagation();
          openColorDropdown(e.currentTarget.getBoundingClientRect(), task.id);
        }}
      />
      <span className="row-name-group">
        <span
          className={'category-badge' + (task.category ? '' : ' no-cat')}
          title="Change tag"
          onClick={(e) => {
            e.stopPropagation();
            openCategoryDropdown(e.currentTarget.getBoundingClientRect(), task.id);
          }}
        >
          {task.category ? task.category : '+ tag'}
        </span>
        {editing ? (
          <span className="row-task-name">
            <InlineEdit
              initial={task.name}
              onCommit={(val) => renameTask(task.id, val)}
              onDone={() => setEditing(false)}
            />
          </span>
        ) : (
          <span className="row-task-name" onDoubleClick={() => setEditing(true)}>
            {task.name}
          </span>
        )}
      </span>
      <span
        className="row-weeks"
        onClick={(e) => {
          e.stopPropagation();
          openWeeksDropdown(e.currentTarget.getBoundingClientRect(), task.id);
        }}
      >
        {task.weeks}w
      </span>
      <button className="remove-row-btn" title="Remove from chart" onClick={() => removeRow(rowIdx)}>
        &times;
      </button>
    </div>
  );
}

function GhostBar({ task, weeksLength, startWi }) {
  const hasSegs = task.segments && task.segments.length;
  const hasGap = hasSegs && task.segments.some((s) => s.gap);
  const style = {
    left: `calc(${startWi} * (100% / ${weeksLength}))`,
    width: `calc(${task.weeks} * (100% / ${weeksLength}) - 4px)`,
    background: hasGap ? 'transparent' : task.color,
  };
  let cumW = 0;
  return (
    <div className={'task-bar' + (hasSegs ? ' segmented' : '')} style={style}>
      {hasSegs &&
        task.segments.map((seg, si) => {
          const segStyle = { left: `calc(${cumW / task.weeks} * (100% + 4px))` };
          if (si < task.segments.length - 1) {
            segStyle.width = `calc(${seg.weeks / task.weeks} * (100% + 4px))`;
          } else {
            segStyle.right = 0;
          }
          if (!seg.gap) segStyle.background = seg.color;
          const el = (
            <div
              key={si}
              className={'segment' + (seg.gap ? ' segment-gap' : '')}
              style={segStyle}
            >
              <span className="seg-label">{seg.gap ? '' : seg.label}</span>
            </div>
          );
          cumW += seg.weeks;
          return el;
        })}
      <span className="bar-label">{task.phase || ''}</span>
    </div>
  );
}

export default function GanttChart({
  wrapperRef,
  containerRef,
  weeks,
  chartRows,
  weekNotes,
  notesCollapsed,
  activePhaseFilter,
  chartName,
  dateRangeText,
  setPhaseFilter,
  toggleNotes,
  openNoteModal,
  onLabelResizeStart,
  ghost,
  weekHighlight,
  dimRowIdx,
  addRowActive,
  findTask,
  onRowDragOver,
  onRowDrop,
  onRowHandleDragStart,
  onDragEnd,
  onBodyDragOver,
  onBodyDrop,
  onAddRowDragOver,
  onAddRowDragLeave,
  onAddRowDrop,
  removeRow,
  renameTask,
  openColorDropdown,
  openWeeksDropdown,
  openCategoryDropdown,
  bar,
}) {
  const weeksLength = weeks.length;
  const ghostTask = ghost ? findTask(ghost.taskId) : null;

  const renderCells = (rowIdx) => (
    <div className="row-cells">
      {weeks.map((w, wi) => {
        const highlighted =
          weekHighlight &&
          weekHighlight.rowIdx === rowIdx &&
          wi >= weekHighlight.startWi &&
          wi < weekHighlight.startWi + weekHighlight.weeks;
        return (
          <div
            key={wi}
            className={'week-cell' + (isCurrentWeek(w) ? ' today-col' : '') + (highlighted ? ' drag-over' : '')}
          />
        );
      })}
      {(() => {
        const row = chartRows[rowIdx];
        if (row && row.startWeek !== null && row.startWeek !== undefined) {
          return (
            <TaskBar
              task={row}
              rowIdx={rowIdx}
              weeksLength={weeksLength}
              activePhaseFilter={activePhaseFilter}
              {...bar}
            />
          );
        }
        return null;
      })()}
    </div>
  );

  const rowsOut = [];
  chartRows.forEach((task, rowIdx) => {
    if (ghost && ghost.insertIdx === rowIdx) {
      rowsOut.push(renderGhostRow());
    }
    let dimmed = false;
    if (activePhaseFilter) {
      if (task.segments && task.segments.length) {
        dimmed = !task.segments.some((seg) => !seg.gap && phaseMatchesFilter(seg.label, activePhaseFilter));
      } else {
        dimmed = !phaseMatchesFilter(task.phase, activePhaseFilter);
      }
    }
    rowsOut.push(
      <div
        key={task.id}
        className={
          'gantt-row' + (dimmed ? ' phase-dimmed' : '') + (dimRowIdx === rowIdx ? ' row-dragging' : '')
        }
        onDragOver={(e) => onRowDragOver(e, rowIdx)}
        onDrop={(e) => onRowDrop(e, rowIdx)}
      >
        <RowLabel
          task={task}
          rowIdx={rowIdx}
          onRowHandleDragStart={onRowHandleDragStart}
          onDragEnd={onDragEnd}
          removeRow={removeRow}
          renameTask={renameTask}
          openColorDropdown={openColorDropdown}
          openWeeksDropdown={openWeeksDropdown}
          openCategoryDropdown={openCategoryDropdown}
        />
        {renderCells(rowIdx)}
      </div>
    );
  });
  if (ghost && ghost.insertIdx >= chartRows.length) {
    rowsOut.push(renderGhostRow());
  }

  function renderGhostRow() {
    if (!ghostTask) return null;
    return (
      <div className="gantt-row ghost-row" key="__ghost__">
        <div className="row-label">
          <span style={{ width: 14, flexShrink: 0 }} />
          <span className="row-color-dot" style={{ background: ghostTask.color }} />
          <span className="row-name-group">
            <span className="row-task-name">{ghostTask.name}</span>
          </span>
          <span className="row-weeks">{ghostTask.weeks}w</span>
        </div>
        <div className="row-cells">
          {weeks.map((w, wi) => (
            <div key={wi} className="week-cell" />
          ))}
          <GhostBar task={ghostTask} weeksLength={weeksLength} startWi={ghost.startWi} />
        </div>
      </div>
    );
  }

  return (
    <div className="gantt-wrapper" ref={wrapperRef}>
      <div className="gantt-container" ref={containerRef}>
        <div className="export-title">
          <div>{chartName}</div>
          <div className="export-date-range">{dateRangeText}</div>
        </div>

        <div className="phase-filter-bar">
          <span className="filter-label">Phase</span>
          <div className="phase-filter-btns">
            {PHASE_TYPES.map((phase) => (
              <button
                key={phase.label}
                className={'phase-filter-btn' + (activePhaseFilter === phase.label ? ' active' : '')}
                onClick={() => setPhaseFilter(activePhaseFilter === phase.label ? null : phase.label)}
              >
                {phase.label}
              </button>
            ))}
          </div>
        </div>

        <div className="gantt-header" id="ganttHeader">
          <div className="row-label-spacer">
            Tasks
            <div className="label-resize-handle" onMouseDown={onLabelResizeStart} />
          </div>
          <div className="week-columns">
            {weeks.map((w, i) => {
              const hasNote = !!weekNotes[i];
              return (
                <div key={i} className={'week-col-header' + (isCurrentWeek(w) ? ' today-col' : '')}>
                  <div className="week-label">
                    W{i + 1}
                    {hasNote && <span className="header-note-dot" />}
                  </div>
                  <div className="week-dates">
                    {formatShort(w.start)} – {formatShort(w.end)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={'notes-row' + (notesCollapsed ? ' collapsed' : '')}>
          <div className="row-label" onClick={toggleNotes}>
            <span className="collapse-icon">▼</span> Notes
          </div>
          <div className="note-cells">
            {weeks.map((w, wi) => {
              const note = weekNotes[wi] || '';
              return (
                <div
                  key={wi}
                  className={'note-cell' + (isCurrentWeek(w) ? ' today-col' : '')}
                  title={note || undefined}
                  onClick={() => openNoteModal(wi)}
                >
                  {note ? (
                    <>
                      <div className="note-indicator" />
                      <div className="note-preview">{note}</div>
                    </>
                  ) : (
                    <span className="note-placeholder">+ note</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="gantt-body" onDragOver={onBodyDragOver} onDrop={onBodyDrop}>
          {rowsOut}
        </div>

        <div
          className={'gantt-add-row' + (addRowActive ? ' drag-over-add' : '')}
          onDragOver={onAddRowDragOver}
          onDragLeave={onAddRowDragLeave}
          onDrop={onAddRowDrop}
        >
          Drop a task here to add a new row
        </div>
      </div>
    </div>
  );
}
