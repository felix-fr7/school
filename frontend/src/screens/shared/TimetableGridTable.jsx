/**
 * Stable Timetable grid — defined outside parent so inputs keep focus while typing
 */
import React, { memo } from 'react';
import { IonButton } from '@ionic/react';
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
                  row.subject
                )}
              </td>
              {DAYS.map((d) => (
                <React.Fragment key={d + '-' + ri}>
                  <td className="tt-cell tt-cw-cell">
                    {editable ? (
                      <textarea
                        className="tt-cell-ta"
                        rows={2}
                        value={(row[d] && row[d].classwork) || ''}
                        onChange={(e) => onUpdateCell(ri, d, 'classwork', e.target.value)}
                      />
                    ) : (
                      (row[d] && row[d].classwork) || ''
                    )}
                  </td>
                  <td className="tt-cell tt-hw-cell">
                    {editable ? (
                      <textarea
                        className="tt-cell-ta"
                        rows={2}
                        value={(row[d] && row[d].homework) || ''}
                        onChange={(e) => onUpdateCell(ri, d, 'homework', e.target.value)}
                      />
                    ) : (
                      (row[d] && row[d].homework) || ''
                    )}
                  </td>
                </React.Fragment>
              ))}
              {editable ? (
                <td>
                  <IonButton
                    size="small"
                    fill="clear"
                    color="danger"
                    onClick={() => onRemoveRow && onRemoveRow(ri)}
                  >
                    X
                  </IonButton>
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
