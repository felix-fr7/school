const fs = require('fs');
const file = 'D:/School/frontend/src/screens/admin/AdminTimetableScreen.jsx';
let content = fs.readFileSync(file, 'utf8');

const old = '          <IonTitle>All Class Timetables</IonTitle>\n          <IonButtons slot="end">\n          </IonButtons>\n         <HomeLogoutButtons />';
const newStr = '          <IonTitle>All Class Timetables</IonTitle>\n         <HomeLogoutButtons />';

if (content.includes(old)) {
  content = content.replace(old, newStr);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed empty IonButtons');
} else {
  console.log('Pattern not found, checking...');
  // Show the actual content around that area
  const idx = content.indexOf('All Class Timetables');
  if (idx >= 0) {
    console.log('Found at index', idx);
    console.log('Context:', JSON.stringify(content.substring(idx, idx + 200)));
  }
}
