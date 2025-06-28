# Notes Application

A simple Node.js Express note-taking application with user authentication and public/private note sharing.

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MySQL Server
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up MySQL database:
```sql
CREATE DATABASE noteapp;
```

3. Create environment variables file (`.env`):
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=noteapp
```

4. Start the application:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Features

- User registration and authentication
- Note creation with public/private visibility
- Dashboard for managing notes
- Public notes browsing (no authentication required)
- API endpoints for note access
- Static file serving
- Note backup functionality

## Usage

### Getting Started

1. Register a new user account at `/register`
2. Login at `/login`
3. Create notes with different privacy settings
4. Browse public notes shared by the community
5. Use the search functionality to find specific notes
6. Backup your notes using the backup feature

## API Endpoints

- **`/api/notes/:id`** - Get note details
- **`/static?file=path`** - Serve static files

## Support

If you encounter any issues or have questions about using the application, please create an issue in the repository.