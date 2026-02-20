
const db = require('../../config/database');

const dbGet = (query, params) => new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => err ? reject(err) : resolve(row));
});

const Auth = {
    async findByUsername(username) {
        return dbGet('SELECT * FROM usuarios WHERE username = ?', [username]);
    }
};

module.exports = Auth;
