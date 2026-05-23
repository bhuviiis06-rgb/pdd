const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true }, // computed as firstName + lastName
  firstName: { type: String },
  lastName: { type: String },
  dob: { type: String },
  gender: { type: String },
  address: { type: String },
  role: { type: String, required: true, enum: ['admin', 'doctor', 'researcher'] },
  email: { type: String },
  mobile: { type: String },
  specialty: { type: String },
  status: { type: String, default: 'active' },
  suspendReason: { type: String },
  passwordChanged: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
