import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children into document.body at a fixed position derived from `anchorRect`.
 * Flips/clamps to stay within the viewport (mirrors the original positionDropdown()).
 * Calls onClose when a click happens outside the portal content (and outside the anchor).
 */
export default function Portal({ anchorRect, onClose, closeOnOutside = true, children, className }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: -9999, top: -9999, visibility: 'hidden' });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !anchorRect) return;
    let left = anchorRect.left;
    let top = anchorRect.bottom + 4;
    const rect = el.getBoundingClientRect();
    if (top + rect.height > window.innerHeight - 8) {
      top = anchorRect.top - rect.height - 4;
    }
    if (left + rect.width > window.innerWidth - 8) {
      left = window.innerWidth - rect.width - 8;
    }
    setPos({ left, top, visibility: 'visible' });
  }, [anchorRect]);

  useEffect(() => {
    if (!closeOnOutside) return undefined;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    };
    const id = setTimeout(() => document.addEventListener('click', handler), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('click', handler);
    };
  }, [closeOnOutside, onClose]);

  return createPortal(
    <div
      ref={ref}
      className={className}
      style={{ position: 'fixed', left: pos.left, top: pos.top, visibility: pos.visibility }}
    >
      {children}
    </div>,
    document.body
  );
}
