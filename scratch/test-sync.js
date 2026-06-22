const { syncMissingDocuments } = require('../src/lib/validation');

const dummyStudent = {
  id: 'D1',
  full_name: 'TEST STUDENT',
  phone1: '99-899-8888',
  phone2: null,
  father_phone: null,
  mother_phone: null,
  email: 'test@example.com',
  passport: 'FA1234567',
  address: 'Test Address',
  level: 'BACHELOR',
  pick_needed: []
};

try {
  console.log('Testing syncMissingDocuments...');
  const result = syncMissingDocuments(dummyStudent);
  console.log('Result:', result);
} catch (err) {
  console.error('Error during test:', err);
}
