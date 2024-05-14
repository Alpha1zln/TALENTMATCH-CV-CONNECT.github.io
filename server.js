const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const path = require('path');

const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/cv_db_STRING', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Define CV schema
const cvSchema = new mongoose.Schema({
  name: String,
  email: String,
  skills: [String],
  photo: String,
  cv: String
});

const CV = mongoose.model('CV', cvSchema);

// Set EJS as view engine
app.set('view engine', 'ejs');

// Set up body-parser
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Main page route (submit form)
app.get('/', (req, res) => {
  res.render('index');
});

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'cv') {
      cb(null, 'uploads/cv'); // Destination folder for CV files
    } else if (file.fieldname === 'photo') {
      cb(null, 'uploads/photo'); // Destination folder for photo files
    }
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Keep the original filename
  }
});

const upload = multer({ storage: storage });

// Handle CV submission
app.post('/submit_cv', upload.fields([{ name: 'cv', maxCount: 1 }, { name: 'photo', maxCount: 1 }]), async (req, res) => {
  const newCV = new CV({
    name: req.body.name,
    email: req.body.email,
    skills: req.body.skills.split(',').map(skill => skill.trim()),
    cv: req.files['cv'][0].filename, // Save filename of CV
    photo: req.files['photo'][0].filename // Save filename of photo
  });

  // Save the new CV to the database
  try {
    await newCV.save();
    res.send('CV submitted successfully!');
  } catch (error) {
    console.error('Error submitting CV:', error);
    res.status(500).send('Error submitting CV');
  }
});

// Ensure that the correct path for serving static files is set up
app.use('/uploads/photo', express.static(path.join(__dirname, 'uploads/photo')));


// List all CVs route
app.get('/list_cvs', async (req, res) => {
  try {
    const cvs = await CV.find();
    res.render('list', { cvs });
  } catch (error) {
    res.status(500).send('Error listing CVs');
  }
});

// Ensure that the correct path for serving static files is set up for CVs
app.use('/uploads/cv', express.static(path.join(__dirname, 'uploads/cv')));


// Search CVs route
app.get('/search_cvs', async (req, res) => {
  try {
    const skills = req.query.skills;
    const cvs = await CV.find({ skills: { $in: skills.split(',') } });
    res.json(cvs);
  } catch (error) {
    console.error('Error searching CVs:', error);
    res.status(500).send('Error searching CVs');
  }
});


// Search page route
app.get('/search', async (req, res) => {
  try {
    const cvs = await CV.find(); // Retrieve all CVs from the database
    res.render('search', { cvs }); // Pass the retrieved CVs to the template
  } catch (error) {
    console.error('Error rendering search page:', error);
    res.status(500).send('Error rendering search page');
  }
});



// Start server
const PORT = process.env.PORT || 7001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
