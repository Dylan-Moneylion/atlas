import { useEffect, useRef } from 'react';

/**
 * Inline rename input. Renders in place of a label while `active`.
 * Commits on blur / Enter, cancels on Escape.
 */
export default function InlineEdit({ initial, onCommit, onDone, style, className = 'rename-input' }) {
  const ref = useRef(null);

  useEffect(() => {
    const input = ref.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  const finish = (commit) => {
    const val = ref.current ? ref.current.value.trim() : '';
    if (commit && val) onCommit(val);
    onDone?.();
  };

  return (
    <input
      ref={ref}
      type="text"
      className={className}
      style={style}
      defaultValue={initial}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          finish(true);
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
        }
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDragStart={(e) => e.preventDefault()}
    />
  );
}
