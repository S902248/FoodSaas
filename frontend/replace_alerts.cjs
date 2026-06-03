const fs = require('fs');
let f = fs.readFileSync('src/pages/superadmin/SuperAdminDashboard.jsx', 'utf8');

// Replace alerts like: alert(err.response?.data?.message || 'Error message');
f = f.replace(/alert\((.*?\|\|.*?)\)/g, 'showToast($1, "error")');

// Replace standard single string alerts: alert('Something successful');
f = f.replace(/alert\('([^']+)'\)/g, 'showToast(\'$1\', "success")');

// Replace template literals: alert(`Downloading ...`);
f = f.replace(/alert\(`([^`]+)`\)/g, 'showToast(`$1`, "success")');

fs.writeFileSync('src/pages/superadmin/SuperAdminDashboard.jsx', f);
console.log('Replaced alerts with showToast');
