require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/learning-lounge', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Define Schemas
const subjectSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  icon: { type: String, default: '📚' },
  color: { type: String, default: '#1565C0' },
  bg: { type: String, default: '#E3F2FD' },
});

const yearSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  year: { type: String, required: true },
});

const questionSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  year: { type: String, required: true },
  exam: { type: String, required: true, enum: ['WAEC', 'NECO'] },
  text: { type: String, required: true },
  options: { type: [String], required: true },
  answer: { type: Number, required: true },
  explanation: { type: String },
});

const Subject = mongoose.model('Subject', subjectSchema);
const Year = mongoose.model('Year', yearSchema);
const Question = mongoose.model('Question', questionSchema);

// Routes
app.get('/subjects', async (req, res) => {
  const subjects = await Subject.find();
  res.json(subjects);
});

app.post('/subjects', async (req, res) => {
  const subject = new Subject(req.body);
  await subject.save();
  res.json(subject);
});

app.get('/years', async (req, res) => {
  const { subject, exam } = req.query;
  const query = { subject };
  if (exam && exam !== 'All') query.exam = exam;
  const years = await Year.find(query).distinct('year');
  res.json(years);
});

app.post('/years', async (req, res) => {
  const year = new Year(req.body);
  await year.save();
  res.json(year);
});

app.get('/questions', async (req, res) => {
  const { subject, year, exam } = req.query;
  const query = { subject, year };
  if (exam && exam !== 'All') query.exam = exam;
  const questions = await Question.find(query);
  res.json(questions);
});

app.post('/questions', async (req, res) => {
  if (Array.isArray(req.body.questions)) {
    await Question.insertMany(req.body.questions);
  } else {
    const question = new Question(req.body);
    await question.save();
  }
  res.json({ message: 'Questions saved!' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
