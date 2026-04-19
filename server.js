// server.js
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow requests from your app and website
app.use(express.json());

// Supabase Client (using service_role key for full access)
// WARNING: Keep this key secret! Never expose it in frontend code.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- API Endpoints ---

// GET /subjects
app.get('/subjects', async (req, res) => {
    const { data, error } = await supabase.from('subjects').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// GET /exam-types
app.get('/exam-types', async (req, res) => {
    const { data, error } = await supabase.from('exam_types').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// GET /years?subject_id=...&exam_type_id=...
app.get('/years', async (req, res) => {
    const { subject_id, exam_type_id } = req.query;
    let query = supabase
        .from('questions')
        .select('year_id, years!inner(year)')
        .order('year', { ascending: false });

    if (subject_id) query = query.eq('subject_id', subject_id);
    if (exam_type_id) query = query.eq('exam_type_id', exam_type_id);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    // Extract unique years
    const uniqueYears = [...new Set(data.map(item => item.years.year))];
    res.json(uniqueYears);
});

// GET /questions?subject_id=...&year=...&exam_type_id=...
app.get('/questions', async (req, res) => {
    const { subject_id, year, exam_type_id } = req.query;
    let query = supabase
        .from('questions')
        .select(`
            id,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_option,
            explanation,
            subjects!inner(name),
            exam_types!inner(name),
            years!inner(year)
        `);

    if (subject_id) query = query.eq('subject_id', subject_id);
    if (exam_type_id) query = query.eq('exam_type_id', exam_type_id);
    if (year) {
        // First get year_id from year number
        const { data: yearData, error: yearError } = await supabase
            .from('years')
            .select('id')
            .eq('year', year)
            .single();
        if (yearError) return res.status(400).json({ error: 'Invalid year' });
        query = query.eq('year_id', yearData.id);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST /questions (For admin website)
app.post('/questions', async (req, res) => {
    const { subject_id, exam_type_id, year_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation } = req.body;

    const { data, error } = await supabase
        .from('questions')
        .insert([{ subject_id, exam_type_id, year_id, question_text, option_a, option_b, option_c, option_d, correct_option, explanation }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
});

// You can add PUT, DELETE endpoints for full CRUD later.

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
