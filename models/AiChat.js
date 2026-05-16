const mongoose = require('mongoose');

// Individual message inside a session
const MessageSchema = new mongoose.Schema({
  role:      { type: String, enum: ['user', 'assistant'], required: true },
  content:   { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Full conversation session
const AiChatSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:      { type: String, default: 'New Conversation' }, // auto-generated from first message
  messages:   [MessageSchema],
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('AiChat', AiChatSchema);