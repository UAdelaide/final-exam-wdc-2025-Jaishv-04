var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

let connection;

(async () => {
  try {
    // Connect to MySQL with specific database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'DogWalkService'
    });
  } catch (err) {
    console.error('Error setting up database. Ensure Mysql is running: service mysql start', err);
  }
})();

app.get('/api/dogs', async (req, res) => {
  try {
    const [rows] = await connection.execute(`SELECT d.name AS dog_name, d.size, u.username AS owner_username
      FROM Dogs d JOIN Users u ON d.owner_id = u.user_id`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [rows] = await connection.execute(`SELECT wr.request_id, d.name AS dog_name, wr.requested_time, wr.duration_minutes, wr.location, u.username AS owner_username FROM WalkRequests wr JOIN Dogs d ON wr.dog_id = d.dog_id JOIN Users u ON d.owner_id = u.user_id WHERE wr.status = 'open'
      `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch data from walk requests' });
  }
});

app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [rows] = await connection.execute(`
      SELECT
        u.username AS walker_username,
        COUNT(r.rating_id) AS total_ratings,
        ROUND(AVG(r.rating), 1) AS average_rating,
        (
          SELECT COUNT(*)
          FROM WalkRequests wr
          JOIN WalkApplications wa ON wr.request_id = wa.request_id
          WHERE wr.status = 'completed' AND wa.walker_id = u.user_id
        ) AS completed_walks
      FROM Users u
      LEFT JOIN WalkRatings r ON r.walker_id = u.user_id
      WHERE u.role = 'walker'
      GROUP BY u.user_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch walker summary' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;
