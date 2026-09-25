import { useState, useEffect } from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import { resolveMediaUrl, schoolContextAPI } from './api';

export const useSchoolBranding = () => {
  const { user, currentClass } = useAuth();
  const [branding, setBranding] = useState({
    schoolName: user?.schoolName || currentClass?.schoolName || null,
    schoolLogoUrl: user?.schoolLogoUrl || currentClass?.schoolLogoUrl || null,
  });

  useEffect(() => {
    let cancelled = false;
    const fromLogin = user?.schoolName || currentClass?.schoolName
      ? {
          schoolName: user?.schoolName || currentClass?.schoolName || null,
          schoolLogoUrl: user?.schoolLogoUrl || currentClass?.schoolLogoUrl || null,
        }
      : null;
    if (fromLogin && !cancelled) setBranding(fromLogin);

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
      } catch {
        // Keep login branding when the optional branding request fails.
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
