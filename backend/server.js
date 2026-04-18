const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Routes

// Get all subjects
app.get('/subjects', async (req, res) => {
  try {
    const snapshot = await db.collection('subjects').get();
    const subjects = [];
    snapshot.forEach(doc => {
      subjects.push({ id: doc.id, ...doc.data() });
    });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new subject
app.post('/subjects', async (req, res) => {
  try {
    const { id, label, icon, color, bg } = req.body;
    await db.collection('subjects').doc(id).set({ label, icon, color, bg });
    res.json({ id, label, icon, color, bg });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get years for a subject (filtered by exam type)
app.get('/years', async (req, res) => {
  try {
    const { subject, exam } = req.query;
    let snapshot;
    if (exam && exam !== 'All') {
      snapshot = await db.collection('questions')
        .where('subject', '==', subject)
        .where('exam', '==', exam)
        .get();
    } else {
      snapshot = await db.collection('questions')
        .where('subject', '==', subject)
        .get();
    }
    const years = [];
    snapshot.forEach(doc => {
      years.push(doc.data().year);
    });
    res.json([...new Set(years)].sort().reverse());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new year (just a placeholder, years are derived from questions)
app.post('/years', async (req, res) => {
  try {
    const { subject, year } = req.body;
    // In Firebase, years are just a property of questions, so this is a no-op
    res.json({ message: 'Years are managed via questions. No need to add years directly.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get questions for subject/year/exam
app.get('/questions', async (req, res) => {
  try {
    const { subject, year, exam } = req.query;
    let query = db.collection('questions').where('subject', '==', subject);
    if (year) query = query.where('year', '==', year);
    if (exam && exam !== 'All') query = query.where('exam', '==', exam);
    const snapshot = await query.get();
    const questions = [];
    snapshot.forEach(doc => {
      questions.push({ id: doc.id, ...doc.data() });
    });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a new question or multiple questions
app.post('/questions', async (req, res) => {
  try {
    if (Array.isArray(req.body.questions)) {
      const batch = db.batch();
      req.body.questions.forEach(q => {
        const docRef = db.collection('questions').doc();
        batch.set(docRef, {
          subject: req.body.subject,
          year: req.body.year,
          exam: req.body.exam || 'WAEC',
          text: q.text,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation,
        });
      });
      await batch.commit();
      res.json({ message: 'Questions saved!' });
    } else {
      const { subject, year, exam, text, options, answer, explanation } = req.body;
      const docRef = db.collection('questions').doc();
      await docRef.set({ subject, year, exam, text, options, answer, explanation });
      res.json({ id: docRef.id, subject, year, exam, text, options, answer, explanation });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
