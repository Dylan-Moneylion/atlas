import { createPortal } from 'react-dom';

export default function Toasts({ toasts }) {
  return createPortal(
    <>
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.msg}
        </div>
      ))}
    </>,
    document.body
  );
}
