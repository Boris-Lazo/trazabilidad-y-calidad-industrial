
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const authModel = require("./auth.model");

const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await authModel.findUserByUsername(username);

    if (!user) {
      return res.status(401).json({ message: "Authentication failed. User not found." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(412).json({ message: "Authentication failed. Wrong password." });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || "your_secret_key",
      { expiresIn: "1h" }
    );

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { login };
