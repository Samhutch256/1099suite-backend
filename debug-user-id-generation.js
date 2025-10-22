// Script to debug user ID generation from email
function generateUUIDFromEmail(email) {
  // Create a consistent UUID-like string from email
  // This ensures the same email always gets the same UUID
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Convert to hex and pad to ensure consistent length
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  
  // Format as UUID v4 style: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  const uuid = [
    hex.slice(0, 8),
    hex.slice(0, 4),
    '4' + hex.slice(1, 4), // Version 4 UUID
    '8' + hex.slice(1, 4), // Variant bits
    hex.repeat(3).slice(0, 12)
  ].join('-');
  
  return uuid;
}

// Test with different emails
const testEmails = [
  'samhutch256@gmail.com',
  'demo@example.com',
  'test@example.com'
];

console.log('🔍 Testing user ID generation:');
testEmails.forEach(email => {
  const userId = generateUUIDFromEmail(email);
  console.log(`Email: ${email}`);
  console.log(`Generated User ID: ${userId}`);
  console.log('');
});

// Check if any match the leads user ID
const leadsUserId = '1efa846a-b408-4196-84bd-e93e2c7d9e9b';
console.log('🔍 Checking for matches with leads user ID:', leadsUserId);
testEmails.forEach(email => {
  const userId = generateUUIDFromEmail(email);
  if (userId === leadsUserId) {
    console.log(`✅ MATCH FOUND! Email: ${email}`);
  }
}); 