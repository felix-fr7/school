/**
 * Generates the ready-to-upload sample Excel/CSV files for the class
 * bulk student import. Run:  node scripts/make-student-import-samples.js
 */
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const outDir = path.join(__dirname, '..', 'samples');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Header row must match the aliases the backend understands
const header = ['Name', 'Roll Number', 'Phone', 'Email', 'Password', 'Admitted Date'];

const rows = [
  ['Aarav Kumar', '1', '9876543210', 'aarav@school.com', 'Student@123', '2026-04-01'],
  ['Bhavana Rao', '2', '9876543211', 'bhavana@school.com', 'Student@123', '2026-04-01'],
  ['Chetan Verma', '3', '9876543212', '', 'Student@123', '2026-04-02'],
  ['Deepa Iyer', '4', '9876543213', 'deepa@school.com', 'Student@123', '2026-04-02'],
  ['Eshita Nair', '5', '9876543214', '', 'Student@123', '2026-04-03'],
  ['Farhan Ali', '6', '9876543215', '', 'Student@123', '2026-04-03'],
  ['Geetha Menon', '7', '9876543216', 'geetha@school.com', 'Student@123', '2026-04-04'],
  ['Harish Babu', '8', '9876543217', '', 'Student@123', '2026-04-04'],
];

const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
sheet['!cols'] = [
  { wch: 20 }, { wch: 13 }, { wch: 14 },
  { wch: 24 }, { wch: 14 }, { wch: 15 },
];

// A second sheet explaining the rules, so the file is self-documenting
const helpSheet = XLSX.utils.aoa_to_sheet([
  ['HOW TO USE THIS FILE'],
  ['1. Row 1 is the header row. Do not rename the columns.'],
  ['2. "Name" and "Roll Number" are REQUIRED for every student.'],
  ['3. Roll Number is the student login ID and must be unique within the class.'],
  ['4. "Phone", "Email", "Admitted Date" are optional.'],
  ['5. Leave "Password" empty to use the default password set in the app.'],
  ['6. Password, if given, must be at least 6 characters.'],
  ['7. Delete the sample rows below the header and enter your own students.'],
  ['8. Then upload this file from the class screen: Bulk Upload.'],
  [],
  ['Also accepted as column names:'],
  ['Name  ->  Name / Student Name / Full Name'],
  ['Roll Number  ->  Roll No / Reg No / Register Number / Sl No'],
  ['Phone  ->  Mobile / Parent Mobile / Contact'],
  ['Admitted Date  ->  Admission Date / DOJ / Date'],
]);

const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, sheet, 'Students');
XLSX.utils.book_append_sheet(workbook, helpSheet, 'How To Use');

const xlsxPath = path.join(outDir, 'student-import-sample.xlsx');
XLSX.writeFile(workbook, xlsxPath);

// Same data as CSV (Google Sheets friendly)
const csvPath = path.join(outDir, 'student-import-sample.csv');
const csvSheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
fs.writeFileSync(csvPath, XLSX.utils.sheet_to_csv(csvSheet), 'utf8');

console.log('created:', xlsxPath);
console.log('created:', csvPath);
console.log('rows (excluding header):', rows.length);
