
const db = require("../../config/db");
const bcrypt = require("bcryptjs");

const findUserByUsername = async (username) => {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT * FROM users WHERE username = ?",
      [username],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
};

const createUser = (username, password) => {
  const hashedPassword = bcrypt.hashSync(password, 10);
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashedPassword],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID });
        }
      }
    );
  });
};

module.exports = {
  findUserByUsername,
  createUser,
};
