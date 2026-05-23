const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://127.0.0.1:27017/dentai')
  .then(async () => {
    // Clear out any half-created tests
    await User.deleteMany({ username: { $in: ['admin', 'doctor', 'researcher'] } });
    
    // Create the three default accounts
    await User.create([
      { id: 'usr_admin', username: 'admin', password: 'admin', name: 'System Admin', role: 'admin' },
      { id: 'usr_doc', username: 'doctor', password: 'doctor', name: 'Dr. Alan Turing', role: 'doctor', specialty: 'General Dentistry' },
      { id: 'usr_res', username: 'researcher', password: 'researcher', name: 'Dr. Ada Lovelace', role: 'researcher', specialty: 'Epidemiology' }
    ]);
    
    console.log('✅ Seeded MongoDB with default users. Passwords are the same as usernames.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
  });
