const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const OpenAI = require('openai');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Load environment variables

// Load OpenAI API setup from environment variables
const token = process.env.OPENAI_API_KEY;
const endpoint = process.env.OPENAI_API_ENDPOINT;
const modelName = "gpt-4o";

// Multer setup for file uploads
const upload = multer({ dest: '/tmp/uploads/' });

const app = express();
app.use(cors());
app.use(express.json());

// Function to analyze extracted text with OpenAI
async function analyzeMedicalReport(reportContent) {
  const client = new OpenAI({ baseURL: endpoint, apiKey: token });

  try {
    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a medical expert assistant. Your task is to read medical reports and provide detailed insights in simple terms." },
        { role: "user", content: `Explain the problem from the report data in 5 lines:\n\n${reportContent}` }
      ],
      model: modelName,
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 1.0
    });

    return response.choices[0].message.content;
  } catch (err) {
    throw new Error("OpenAI API Error: " + err.message);
  }
}

app.get('/', (req, res) => {
  res.send('Hello, World!');
})

// Endpoint for processing medical report
app.post('/process-report', upload.single('reportImage'), async (req, res) => {
  console.log("Processing report...");
  try {
    const imagePath = req.file.path;

    // Step 1: Extract text from image using Tesseract
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');

    // Step 2: Analyze text with OpenAI
    const analysis = await analyzeMedicalReport(text);

    // Cleanup uploaded file
    fs.unlinkSync(imagePath);

    res.json({ text, analysis });
  } catch (err) {
    // Cleanup if an error occurs
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ error: err.message });
  }
});

// Serve the frontend files
app.use(express.static(path.join(__dirname, 'frontend')));

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
