import { COLORS, PHASE_TYPES, WEEK_OPTIONS } from '../lib/constants.js';
import Portal from './Portal.jsx';

export function ColorDropdown({ anchorRect, current, onPick, onClose }) {
  return (
    <Portal className="color-dropdown" anchorRect={anchorRect} onClose={onClose}>
      {COLORS.map((c) => (
        <div
          key={c}
          className={'color-option' + (c === current ? ' active' : '')}
          style={{ background: c }}
          onClick={() => {
            onPick(c);
            onClose();
          }}
        />
      ))}
    </Portal>
  );
}

export function WeeksDropdown({ anchorRect, current, onPick, onClose }) {
  return (
    <Portal className="weeks-dropdown" anchorRect={anchorRect} onClose={onClose}>
      {WEEK_OPTIONS.map((w) => (
        <div
          key={w}
          className={'weeks-dropdown-item' + (w === current ? ' active' : '')}
          onClick={() => {
            onPick(w);
            onClose();
          }}
        >
          {w} {w === 1 ? 'week' : 'weeks'}
        </div>
      ))}
    </Portal>
  );
}

export function CategoryDropdown({ anchorRect, current, categories, onPick, onClose }) {
  return (
    <Portal className="category-dropdown" anchorRect={anchorRect} onClose={onClose}>
      <div
        className={'category-dropdown-item' + (!current ? ' active' : '')}
        onClick={() => {
          onPick(null);
          onClose();
        }}
      >
        No tag
      </div>
      {categories.map((c) => (
        <div
          key={c}
          className={'category-dropdown-item' + (c === current ? ' active' : '')}
          onClick={() => {
            onPick(c);
            onClose();
          }}
        >
          {c}
        </div>
      ))}
    </Portal>
  );
}

function PhaseItems({ onBase, onEng }) {
  return PHASE_TYPES.map((phase) => {
    if (phase.subOptions) {
      return (
        <div key={phase.label} className="menu-item has-submenu">
          {phase.label} ▸
          <div className="context-submenu" style={{ position: 'absolute', left: '100%', top: 0 }}>
            <div className="menu-item" onClick={() => onBase(phase)}>
              {phase.label}
            </div>
            <div className="menu-divider" />
            {phase.subOptions.map((opt) => (
              <div key={opt} className="menu-item" onClick={() => onEng(phase, opt)}>
                Eng: {opt}
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div key={phase.label} className="menu-item" onClick={() => onBase(phase)}>
        {phase.label}
      </div>
    );
  });
}

export function SegmentMenu({ menu, actions, onClose }) {
  const { task, segIdx, splitWeek, segSplitAt } = menu;
  const anchorRect = { left: menu.x, top: menu.y, bottom: menu.y, right: menu.x };
  const close = (fn) => () => {
    fn();
    onClose();
  };

  return (
    <Portal className="segment-menu" anchorRect={anchorRect} onClose={onClose}>
      {segIdx === -1 ? (
        <>
          {task.weeks >= 2 && (
            <div className="menu-item" onClick={close(() => actions.splitTask(task.id, splitWeek))}>
              Split at week {splitWeek} / {task.weeks}
            </div>
          )}
          <div className="menu-divider" />
          <div className="menu-label">Set phase</div>
          <PhaseItems
            onBase={(phase) => close(() => actions.setPhase(task.id, phase.label))()}
            onEng={(phase, opt) => close(() => actions.setPhase(task.id, 'Eng: ' + opt))()}
          />
          {task.phase && (
            <div className="menu-item" onClick={close(() => actions.clearPhase(task.id))}>
              ✕ Clear phase
            </div>
          )}
        </>
      ) : (
        <>
          {task.segments[segIdx].weeks >= 2 && (
            <div
              className="menu-item"
              onClick={close(() => actions.splitSegment(task.id, segIdx, segSplitAt))}
            >
              Split at week {segSplitAt} / {task.segments[segIdx].weeks}
            </div>
          )}
          <div className="menu-item" onClick={close(() => actions.insertGap(task.id, segIdx, 'before'))}>
            ⤹ Insert gap before
          </div>
          <div className="menu-item" onClick={close(() => actions.insertGap(task.id, segIdx, 'after'))}>
            ⤸ Insert gap after
          </div>
          {!task.segments[segIdx].gap && (
            <div className="menu-item" onClick={close(() => actions.convertToGap(task.id, segIdx))}>
              ⬚ Convert to gap
            </div>
          )}
          {task.segments.length > 1 && (
            <div className="menu-item" onClick={close(() => actions.removeSegment(task.id, segIdx))}>
              ✕ Remove segment
            </div>
          )}
          <div className="menu-divider" />
          <div className="menu-label">
            {task.segments[segIdx].gap ? 'Convert to phase' : 'Set phase type'}
          </div>
          <PhaseItems
            onBase={(phase) => close(() => actions.setSegmentPhase(task.id, segIdx, phase.label, phase.color))()}
            onEng={(phase, opt) =>
              close(() => actions.setSegmentPhase(task.id, segIdx, 'Eng: ' + opt, phase.color))()
            }
          />
        </>
      )}
    </Portal>
  );
}
