import { useState } from 'react';
import { getSegShade, phaseMatchesFilter } from '../lib/utils.js';
import InlineEdit from './InlineEdit.jsx';

export default function TaskBar({
  task,
  rowIdx,
  weeksLength,
  activePhaseFilter,
  onBarDragStart,
  onDragEnd,
  onResizeStart,
  onDividerResize,
  onBarContextMenu,
  onSegmentContextMenu,
  onCommitSegmentLabel,
}) {
  const [editingSeg, setEditingSeg] = useState(null);
  const hasSegs = task.segments && task.segments.length;
  const hasGap = hasSegs && task.segments.some((s) => s.gap);

  const style = {
    left: `calc(${task.startWeek} * (100% / ${weeksLength}))`,
    width: `calc(${task.weeks} * (100% / ${weeksLength}) - 4px)`,
    background: hasSegs && hasGap ? 'transparent' : task.color,
  };

  // Phase-filter emphasis on the bar itself
  let filterActive = false;
  const segDimmed = [];
  if (activePhaseFilter && hasSegs) {
    const anyMatch = task.segments.some((seg) => !seg.gap && phaseMatchesFilter(seg.label, activePhaseFilter));
    if (anyMatch) {
      filterActive = true;
      task.segments.forEach((seg, si) => {
        segDimmed[si] = seg.gap || !phaseMatchesFilter(seg.label, activePhaseFilter);
      });
    }
  }

  const segEls = [];
  if (hasSegs) {
    let cumWeeks = 0;
    task.segments.forEach((seg, si) => {
      if (si > 0) {
        const leftDiv = `calc(${cumWeeks / task.weeks} * (100% + 4px))`;
        segEls.push(
          <div
            key={`div-${si}`}
            className="segment-divider"
            style={{ left: leftDiv }}
            onMouseDown={(e) => onDividerResize(e, task, si - 1)}
          />
        );
      }
      const segStyle = {
        left: `calc(${cumWeeks / task.weeks} * (100% + 4px))`,
      };
      if (si < task.segments.length - 1) {
        segStyle.width = `calc(${seg.weeks / task.weeks} * (100% + 4px))`;
      } else {
        segStyle.right = 0;
      }
      if (!seg.gap) segStyle.background = getSegShade(task, si, task.segments.length);
      const thisIdx = si;
      cumWeeks += seg.weeks;
      segEls.push(
        <div
          key={`seg-${si}`}
          className={
            'segment' + (seg.gap ? ' segment-gap' : '') + (segDimmed[si] ? ' seg-dimmed' : '')
          }
          style={segStyle}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSegmentContextMenu(e, task, thisIdx, rowIdx);
          }}
        >
          {editingSeg === si ? (
            <span className="seg-label">
              <InlineEdit
                initial={seg.label}
                style={{ fontSize: 10, textAlign: 'center' }}
                onCommit={(val) => onCommitSegmentLabel(task.id, thisIdx, val)}
                onDone={() => setEditingSeg(null)}
              />
            </span>
          ) : (
            <span
              className="seg-label"
              onDoubleClick={(e) => {
                if (seg.gap) return;
                e.stopPropagation();
                setEditingSeg(thisIdx);
              }}
            >
              {seg.gap ? '' : seg.label}
            </span>
          )}
        </div>
      );
    });
  }

  return (
    <div
      className={'task-bar' + (hasSegs ? ' segmented' : '') + (filterActive ? ' filter-active' : '')}
      style={style}
      draggable={editingSeg === null}
      onDragStart={(e) => onBarDragStart(e, task.id, rowIdx)}
      onDragEnd={onDragEnd}
      onContextMenu={(e) => onBarContextMenu(e, task, rowIdx)}
    >
      {segEls}
      <span className="bar-label">{task.phase || ''}</span>
      <div
        className="resize-handle left"
        onMouseDown={(e) => onResizeStart(e, task, 'left')}
      />
      <div
        className="resize-handle right"
        onMouseDown={(e) => onResizeStart(e, task, 'right')}
      />
    </div>
  );
}
