# Vibe-Coded Notes Application

A simple vibe-coded Node.js Express note-taking application with user authentication and public/private note sharing.

## Quick start with docker

```bash
export DB_PASSWORD=your_password
docker compose up
```

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

2.1 using existing MySQL server
```sql
CREATE DATABASE noteapp;
```

2.2 using docker
```bash
docker run --name=notes-mysql -p3306:3306 -e 'MYSQL_ROOT_HOST=%' \
  -e MYSQL_DATABASE=noteapp -e MYSQL_ROOT_PASSWORD=your_mysql_password -d mysql/mysql-server && sleep 20 # let the DB initialize
```
Note: root password (your_mysql_password) should be changed

3. Create environment variables file (`.env`):
```
DB_HOST=localhost
DB_PASSWORD=your_mysql_password
```

4. Start the application:
```bash
npm start
```

The application will be available at `http://localhost:3000`
