const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '..', 'n8n-workflows');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

const TUNNEL_URL = 'https://phentermine-assessed-exclude-she.trycloudflare.com';
const SECRET = 'demo_shared_secret_2026';

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace URL env expressions
  content = content.replace(/=\{\{\s*\$env\.NEXT_PUBLIC_APP_URL[^}]*\}\}/g, TUNNEL_URL);
  content = content.replace(/\{\{\s*\$env\.NEXT_PUBLIC_APP_URL[^}]*\}\}/g, TUNNEL_URL);

  // Replace Secret env expressions
  content = content.replace(/=\{\{\s*\$env\.N8N_SHARED_SECRET[^}]*\}\}/g, SECRET);
  content = content.replace(/\{\{\s*\$env\.N8N_SHARED_SECRET[^}]*\}\}/g, SECRET);

  // In Confirm Delivery Status, fix parent node referencing
  content = content.replace(/'invite-sent-' \+ \$json\.assignment_id/g, "'invite-sent-' + ($('[02] Split Invitations').item.json.assignment_id || $('Split Invitations').item.json.assignment_id || $json.assignment_id)");
  content = content.replace(/"value": "=\{\{ \$json\.assignment_id \}\}"/g, '"value": "={{ $(\'[02] Split Invitations\').item.json.assignment_id || $(\'Split Invitations\').item.json.assignment_id || $json.assignment_id }}"');

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Sanitized:', file);
});
