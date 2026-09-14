/**
 * School Branding Hook
 * Superadmin add panna logo + school name-a (antha antha school-ku) Admin/Class/Student
 * dashboard-la katturathuku. Vera logic mathala - display only.
 * Priority: 1) login response user/tenant 2) /api/school-context/me API
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { resolveMediaUrl, schoolContextAPI } from './api';

export const useSchoolBranding = () => {
  const { user, currentClass } = useAuth();
  const [branding, setBranding] = useState({
    schoolName: user?.schoolName || currentClass?.schoolName || null,
    schoolLogoUrl: user?.schoolLogoUrl || currentClass?.schoolLogoUrl || null,
  });

  useEffect(() => {
    let cancelled = false;

    // Login response-la already vantha use pannu
    const fromLogin =
      user?.schoolName || currentClass?.schoolName
        ? {
            schoolName: user?.schoolName || currentClass?.schoolName || null,
            schoolLogoUrl: user?.schoolLogoUrl || currentClass?.schoolLogoUrl || null,
          }
        : null;
    if (fromLogin && !cancelled) setBranding(fromLogin);

    // Fresh value backend lendhu edu (superadmin kudutha latest logo/name)
    const fetchBranding = async () => {
      try {
        const res = await schoolContextAPI.getMySchool();
        const data = res?.data || {};
        if (!cancelled && (data.schoolName || data.schoolLogoUrl)) {
          setBranding({
            schoolName: data.schoolName || fromLogin?.schoolName || null,
            schoolLogoUrl: data.schoolLogoUrl || fromLogin?.schoolLogoUrl || null,
          });
        }
      } catch (e) {
        // API fail ana login data-ve use pannu - vera logic mathala
      }
    };
    fetchBranding();

    return () => { cancelled = true; };
  }, [user?.schoolId, user?.schoolName, currentClass?.schoolName, currentClass?.tenantId]);

  return {
    schoolName: branding.schoolName,
    schoolLogoUrl: branding.schoolLogoUrl,
    resolvedLogoUrl: resolveMediaUrl(branding.schoolLogoUrl),
  };
};

export default useSchoolBranding;
