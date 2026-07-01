import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatShort } from '../lib/utils.js';

export default function NoteModal({ weekIdx, week, initial, onSave, onClose }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }
  }, []);

  const save = () => onSave(textareaRef.current.value.trim());

  return createPortal(
    <div
      className="note-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="note-modal">
        <h3>Week {weekIdx + 1} Notes</h3>
        <div className="note-modal-dates">
          {formatShort(week.start)} – {formatShort(week.end)}
        </div>
        <textarea
          ref={textareaRef}
          defaultValue={initial}
          placeholder="Add notes for this week..."
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
          }}
        />
        <div className="note-modal-actions">
          <button className="btn btn-ghost" onClick={() => onSave('')}>
            Clear
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
