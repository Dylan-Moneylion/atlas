import { useEffect, useRef } from 'react';

export default function Header({
  title,
  onTitleCommit,
  dateMode,
  setDateMode,
  quarter,
  setQuarter,
  year,
  setYear,
  years,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  onApply,
  onExportImage,
  onExportExcel,
  exportingImage,
  exportingExcel,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSaveConfig,
  onLoadConfig,
}) {
  const titleRef = useRef(null);
  const fileRef = useRef(null);

  // Keep the contentEditable element in sync when title changes externally (e.g. load config).
  useEffect(() => {
    if (titleRef.current && titleRef.current.textContent !== title) {
      titleRef.current.textContent = title;
    }
  }, [title]);

  const commitTitle = () => {
    titleRef.current?.classList.remove('editing');
    const text = (titleRef.current?.textContent || '').trim();
    onTitleCommit(text || 'ATLAS');
  };

  return (
    <header>
      <div className="title-group">
        <h1
          id="chartTitle"
          ref={titleRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          onFocus={() => titleRef.current?.classList.add('editing')}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              titleRef.current?.blur();
            }
          }}
        >
          ATLAS
        </h1>
        {title.trim().toUpperCase() === 'ATLAS' && (
          <div className="atlas-subtitle">Aligned Timeline Layout And Scheduling</div>
        )}
      </div>

      <div className="date-controls">
        <div className="date-mode-toggle">
          <button
            className={'mode-btn' + (dateMode === 'quarter' ? ' active' : '')}
            onClick={() => setDateMode('quarter')}
          >
            Quarter
          </button>
          <button
            className={'mode-btn' + (dateMode === 'custom' ? ' active' : '')}
            onClick={() => setDateMode('custom')}
          >
            Custom
          </button>
        </div>

        {dateMode === 'quarter' ? (
          <div className="date-mode-panel">
            <select
              className="quarter-select"
              value={quarter}
              onChange={(e) => setQuarter(parseInt(e.target.value, 10))}
            >
              <option value="1">Q1</option>
              <option value="2">Q2</option>
              <option value="3">Q3</option>
              <option value="4">Q4</option>
            </select>
            <select
              className="quarter-select"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="date-mode-panel">
            <label htmlFor="startDate">From</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <label htmlFor="endDate">To</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        )}

        <button className="btn btn-primary" onClick={onApply}>
          Apply
        </button>
        <span style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
        <button className="btn btn-export" onClick={onExportImage} disabled={exportingImage}>
          {exportingImage ? 'Exporting…' : 'Export as Image'}
        </button>
        <button className="btn btn-export" onClick={onExportExcel} disabled={exportingExcel}>
          {exportingExcel ? 'Exporting…' : 'Export as Excel'}
        </button>
        <span style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
        <button
          className="btn btn-ghost"
          title="Undo (Ctrl+Z)"
          onClick={onUndo}
          disabled={!canUndo}
          style={{ opacity: canUndo ? '' : 0.4 }}
        >
          ↩
        </button>
        <button
          className="btn btn-ghost"
          title="Redo (Ctrl+Shift+Z)"
          onClick={onRedo}
          disabled={!canRedo}
          style={{ opacity: canRedo ? '' : 0.4 }}
        >
          ↪
        </button>
        <span style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 4px' }} />
        <button className="btn btn-ghost" title="Save Config" onClick={onSaveConfig}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 16H3a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h7.586a1 1 0 0 1 .707.293l3.414 3.414a1 1 0 0 1 .293.707V14a2 2 0 0 1-2 2z" />
            <path d="M5 0v4h6V0" />
            <path d="M4 10h8M4 13h8" />
          </svg>
        </button>
        <button className="btn btn-ghost" title="Load Config" onClick={() => fileRef.current?.click()}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H8L6 3H2a1 1 0 0 0-1 1z" />
          </svg>
        </button>
        <input
          type="file"
          ref={fileRef}
          accept=".json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) onLoadConfig(file);
            e.target.value = '';
          }}
        />
      </div>
    </header>
  );
}
