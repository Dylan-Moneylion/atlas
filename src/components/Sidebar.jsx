import { useState } from 'react';
import { COLORS, WEEK_OPTIONS } from '../lib/constants.js';
import InlineEdit from './InlineEdit.jsx';

export default function Sidebar({
  collapsed,
  onToggle,
  categories,
  selectedColor,
  setSelectedColor,
  onAddTask,
  onAddCategory,
  onRemoveCategory,
  bankTasks,
  weeksLength,
  onBankDragStart,
  onDragEnd,
  onDeleteTask,
  renameTask,
  openColorDropdown,
  openWeeksDropdown,
  openCategoryDropdown,
}) {
  const [name, setName] = useState('');
  const [weeks, setWeeks] = useState(2);
  const [category, setCategory] = useState('');
  const [newCat, setNewCat] = useState('');
  const [editingId, setEditingId] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onAddTask({ name: trimmed, weeks, category: category || null, color: selectedColor });
    setName('');
  };

  const addCat = () => {
    const val = newCat.trim();
    if (val) onAddCategory(val);
    setNewCat('');
  };

  return (
    <aside className={'sidebar' + (collapsed ? ' collapsed' : '')} id="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-header">
          <h2>New Task</h2>
          <button className="sidebar-toggle" title="Collapse sidebar" onClick={onToggle}>
            {collapsed ? '▶' : '◀'}
          </button>
        </div>
        <form className="new-task-form" onSubmit={submit}>
          <input
            type="text"
            placeholder="Task name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select value={weeks} onChange={(e) => setWeeks(parseInt(e.target.value, 10))}>
            {WEEK_OPTIONS.map((w) => (
              <option key={w} value={w}>
                {w} {w === 1 ? 'week' : 'weeks'}
              </option>
            ))}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">No tag</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Color
            </label>
            <div className="color-picker-row">
              {COLORS.map((c) => (
                <div
                  key={c}
                  className={'color-swatch' + (c === selectedColor ? ' selected' : '')}
                  style={{ background: c }}
                  onClick={() => setSelectedColor(c)}
                />
              ))}
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: 4 }}>
            Add Task
          </button>
        </form>

        <div className="category-manager">
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
            Manage Tags
          </label>
          <div className="category-tags">
            {categories.length === 0 ? (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>No tags yet</span>
            ) : (
              categories.map((c) => (
                <span key={c} className="category-tag">
                  {c}
                  <button className="category-tag-remove" onClick={() => onRemoveCategory(c)}>
                    &times;
                  </button>
                </span>
              ))
            )}
          </div>
          <div className="category-add-row">
            <input
              type="text"
              placeholder="New tag"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCat();
                }
              }}
            />
            <button className="btn btn-ghost btn-sm" onClick={addCat}>
              +
            </button>
          </div>
        </div>
      </div>

      <div className="sidebar-section" style={{ paddingBottom: 8 }}>
        <h2>Task Bank</h2>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: -4, marginBottom: 4 }}>
          Drag tasks onto the chart
        </p>
      </div>
      <div className="task-bank">
        {bankTasks.length === 0 ? (
          <div className="empty-bank">
            No tasks in bank.
            <br />
            Create one above or remove from chart.
          </div>
        ) : (
          bankTasks.map((t) => {
            const tooLong = t.weeks > weeksLength;
            return (
              <div
                key={t.id}
                className={'task-bank-item' + (tooLong ? ' too-long' : '')}
                draggable={!tooLong}
                style={{ background: t.color }}
                title={tooLong ? 'Task exceeds date range' : undefined}
                onDragStart={(e) => onBankDragStart(e, t.id)}
                onDragEnd={onDragEnd}
              >
                <span
                  className="bank-color-dot"
                  title="Change color"
                  style={{ background: 'rgba(255,255,255,0.3)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openColorDropdown(e.currentTarget.getBoundingClientRect(), t.id);
                  }}
                />
                <span className="bank-name-group">
                  <span
                    className={'category-badge' + (t.category ? '' : ' no-cat')}
                    title="Change tag"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCategoryDropdown(e.currentTarget.getBoundingClientRect(), t.id);
                    }}
                  >
                    {t.category ? t.category : '+ tag'}
                  </span>
                  {editingId === t.id ? (
                    <span className="task-name">
                      <InlineEdit
                        initial={t.name}
                        onCommit={(val) => renameTask(t.id, val)}
                        onDone={() => setEditingId(null)}
                      />
                    </span>
                  ) : (
                    <span
                      className="task-name"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingId(t.id);
                      }}
                    >
                      {t.name}
                    </span>
                  )}
                </span>
                <span
                  className="task-weeks"
                  onClick={(e) => {
                    e.stopPropagation();
                    openWeeksDropdown(e.currentTarget.getBoundingClientRect(), t.id);
                  }}
                >
                  {t.weeks}w
                </span>
                <button
                  className="delete-task"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTask(t.id);
                  }}
                >
                  &times;
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
