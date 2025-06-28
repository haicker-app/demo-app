const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Database connection using environment variables
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'noteapp'
});

// Connect to database
db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to MySQL database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  const createNotesTable = `
    CREATE TABLE IF NOT EXISTS notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      author_id INT NOT NULL,
      is_public BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES users(id)
    )
  `;

  db.query(createUsersTable, (err) => {
    if (err) console.error('Error creating users table:', err);
  });

  db.query(createNotesTable, (err) => {
    if (err) console.error('Error creating notes table:', err);
  });
}

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'vulnerable-secret-key',
  resave: false,
  saveUninitialized: true
}));

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Basic HTML escaping function
function escapeHtml(text) {
  return text.replace('<', '&lt;').replace('>', '&gt;');
}

// Routes

// Home page
app.get('/', (req, res) => {
  res.render('index', { user: req.session.userId });
});

// Register page
app.get('/register', (req, res) => {
  res.render('register');
});

// Register endpoint
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword],
      (err, result) => {
        if (err) {
          console.error(err);
          res.status(400).send('Registration failed');
        } else {
          res.redirect('/login');
        }
      }
    );
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// Login page
app.get('/login', (req, res) => {
  res.render('login');
});

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  db.query(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, results) => {
      if (err || results.length === 0) {
        res.status(400).send('Invalid credentials');
        return;
      }
      
      const user = results[0];
      const isValid = await bcrypt.compare(password, user.password);
      
      if (isValid) {
        req.session.userId = user.id;
        req.session.username = user.username;
        res.redirect('/dashboard');
      } else {
        res.status(400).send('Invalid credentials');
      }
    }
  );
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Dashboard
app.get('/dashboard', requireAuth, (req, res) => {
  const search = req.query.search;
  let query = 'SELECT * FROM notes WHERE author_id = ? OR is_public = TRUE';
  let params = [req.session.userId];
  
  if (search) {
    // Sanitize search input
    const sanitizedSearch = search.replace(/"/g, '');
    query += ` AND (title LIKE '%${sanitizedSearch}%' OR content LIKE '%${sanitizedSearch}%')`;
  }
  
  query += ' ORDER BY created_at DESC';
  
  db.query(query, params, (err, notes) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error loading notes');
    } else {
      res.render('dashboard', { notes, user: req.session.username, search: search || '' });
    }
  });
});

// Create note page
app.get('/create-note', requireAuth, (req, res) => {
  res.render('create-note');
});

// Create note endpoint
app.post('/create-note', requireAuth, (req, res) => {
  const { title, content, is_public } = req.body;
  
  db.query(
    'INSERT INTO notes (title, content, author_id, is_public) VALUES (?, ?, ?, ?)',
    [title, content, req.session.userId, is_public === 'on'],
    (err, result) => {
      if (err) {
        console.error(err);
        res.status(500).send('Error creating note');
      } else {
        res.redirect('/dashboard');
      }
    }
  );
});

// Note view page
app.get('/notes/:id', (req, res) => {
  const noteId = req.params.id;
  
  db.query(
    'SELECT notes.*, users.username as author FROM notes JOIN users ON notes.author_id = users.id WHERE notes.id = ?',
    [noteId],
    (err, results) => {
      if (err || results.length === 0) {
        res.status(404).send('Note not found');
        return;
      }
      
      const note = results[0];
      
      // Check if note is private and user is not the owner
      if (!note.is_public && (!req.session.userId || note.author_id !== req.session.userId)) {
        res.status(403).send('Access denied. This is a private note.');
        return;
      }
      
      // Escape HTML content for display
      note.content = escapeHtml(note.content);
      
      res.render('note', { note, user: req.session.username || null });
    }
  );
});

// API endpoint for note access
app.get('/api/notes/:id', (req, res) => {
  const noteId = req.params.id;
  
  db.query(
    'SELECT notes.*, users.username as author FROM notes JOIN users ON notes.author_id = users.id WHERE notes.id = ?',
    [noteId],
    (err, results) => {
      if (err || results.length === 0) {
        res.status(404).json({ error: 'Note not found' });
        return;
      }
      
      const note = results[0];
      res.json(note);
    }
  );
});

// Static file serving endpoint
app.get('/static', (req, res) => {
  let filePath = req.query.file;
  
  if (!filePath) {
    return res.status(400).send('File parameter required');
  }
  
  // Clean path traversal attempts
  filePath = filePath.replaceAll('../', '');
  
  const fullPath = path.join(__dirname, 'public', filePath);
  
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.status(404).send('File not found');
    } else {
      res.send(data);
    }
  });
});

// Public notes endpoint
app.get('/public-notes', (req, res) => {
  const search = req.query.search;
  let query = 'SELECT notes.*, users.username as author FROM notes JOIN users ON notes.author_id = users.id WHERE notes.is_public = TRUE';
  
  if (search) {
    // Sanitize search input
    const sanitizedSearch = search.replace(/"/g, '');
    query += ` AND (notes.title LIKE '%${sanitizedSearch}%' OR notes.content LIKE '%${sanitizedSearch}%')`;
  }
  
  query += ' ORDER BY created_at DESC';
  
  db.query(query, (err, notes) => {
    if (err) {
      console.error(err);
      res.status(500).send('Error loading notes');
    } else {
      res.render('public-notes', { notes, search: search || '' });
    }
  });
});

// Backup notes page
app.get('/backup', requireAuth, (req, res) => {
  res.render('backup');
});

// Backup notes feature
app.post('/backup-notes', requireAuth, (req, res) => {
  const { format } = req.body;
  
  // Generate backup with specified format
  const command = `mysqldump -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} ${process.env.DB_NAME} notes --where="author_id=${req.session.userId}" | ${format} > backup_${req.session.userId}.sql`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      res.status(500).send('Backup failed: ' + error.message);
    } else {
      res.send('Backup created successfully');
    }
  });
});

// Serve static files normally for legitimate files
app.use('/public', express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}); 