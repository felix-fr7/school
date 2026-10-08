import React from 'react';
import { useHistory } from 'react-router-dom';
import './StudentMobileNotice.css';

const StudentMobileNotice = () => {
  const history = useHistory();

  return (
    <div className="student-mobile-notice-page">
      <div className="student-mobile-notice-card">
        <div className="notice-icon-circle">
          📱
        </div>
        <h1 className="notice-title">Student Portal is on Mobile</h1>
        <p className="notice-description">
          The student portal is optimized exclusively for mobile devices. Please use the School mobile application on Android or iOS to view homework, marks, circulars, and report cards.
        </p>
        <div className="notice-badge">
          Staff, Admins, and Class Controllers can access their web portal below.
        </div>
        <div className="notice-actions">
          <button
            type="button"
            className="notice-btn notice-btn-primary"
            onClick={() => history.push('/login')}
          >
            Go to Staff Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentMobileNotice;
