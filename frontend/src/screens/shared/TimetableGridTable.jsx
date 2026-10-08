/**
 * Stable Timetable grid — defined outside parent so inputs keep focus while typing
 * Pure React Web Table
 */
import React, { memo } from 'react';
import { DAYS } from '../../utils/timetableGrid';
import './TimetableGrid.css';

function TimetableGridTable({ dataRows, editable, onUpdateCell, onUpdateSubject, onRemoveRow }) {
  return (
    <div className="tt-grid-wrap">
      <table className="tt-grid-table">
        <thead>
          <tr>
            <th className="tt-sub-col" rowSpan={2}>Subjects</th>
            {DAYS.map((d) => (
              <th key={d} colSpan={2} className="tt-day-head">{d}</th>
            ))}
            {editable ? <th rowSpan={2} className="tt-act-col"> </th> : null}
          </tr>
          <tr>
            {DAYS.map((d) => (
              <React.Fragment key={d + '-h'}>
                <th className="tt-cw">Classwork</th>
                <th className="tt-hw">Homework</th>
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {(dataRows || []).map((row, ri) => (
            <tr key={'row-' + ri}>
              <td className="tt-sub-cell">
                {editable ? (
                  <input
                    className="tt-inline-input tt-subject-input"
                    value={row.subject || ''}
                    onChange={(e) => onUpdateSubject(ri, e.target.value)}
                  />
                ) : (
                  <span className="tt-sub-text">{row.subject || '—'}</span>
                )}
              </td>
              {DAYS.map((d) => (
                <React.Fragment key={d}>
                  <td className="tt-cell tt-cw-cell">
                    {editable ? (
                      <textarea
                        className="tt-inline-input tt-cell-input"
                        rows={2}
                        value={row[d]?.classwork || ''}
                        onChange={(e) => onUpdateCell(ri, d, 'classwork', e.target.value)}
                      />
                    ) : (
                      <div className="tt-cell-text">{row[d]?.classwork || '—'}</div>
                    )}
                  </td>
                  <td className="tt-cell tt-hw-cell">
                    {editable ? (
                      <textarea
                        className="tt-inline-input tt-cell-input"
                        rows={2}
                        value={row[d]?.homework || ''}
                        onChange={(e) => onUpdateCell(ri, d, 'homework', e.target.value)}
                      />
                    ) : (
                      <div className="tt-cell-text">{row[d]?.homework || '—'}</div>
                    )}
                  </td>
                </React.Fragment>
              ))}
              {editable ? (
                <td>
                  <button
                    type="button"
                    className="tt-remove-btn"
                    onClick={() => onRemoveRow && onRemoveRow(ri)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      fontSize: '14px',
                    }}
                    title="Remove row"
                  >
                    ✕
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default memo(TimetableGridTable);
