export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const DEFAULT_SUBJECTS = [
  'English', 'Tamil', 'Maths', 'Physics', 'Chemistry', 'Biology',
  'Social Science', 'Hindi', 'CS', 'ST', 'CCA', 'PE', 'PT',
];

export const emptyDay = () => ({ classwork: '', homework: '' });

export const emptyRow = (subject) => ({
  subject,
  Monday: emptyDay(),
  Tuesday: emptyDay(),
  Wednesday: emptyDay(),
  Thursday: emptyDay(),
  Friday: emptyDay(),
  Saturday: emptyDay(),
});

export const blankTemplateRows = () => DEFAULT_SUBJECTS.map((s) => emptyRow(s));

export const classLabel = (tt) => {
  const c = tt?.classId;
  if (!c) return '';
  if (typeof c === 'string') return c;
  return ((c.name || '') + (c.section ? ' - ' + c.section : '')).trim();
};
