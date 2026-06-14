const express = require('express');
const { body } = require('express-validator');
const { googleAuth, login, logout } = require('../controllers/authController');
const { handleValidation, authLimiter } = require('../middleware/validate');

const router = express.Router();

router.post('/google', authLimiter, googleAuth);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('A valid email is required.'),
    body('password').isString().notEmpty().withMessage('Password is required.'),
  ],
  handleValidation,
  login
);

router.post('/logout', logout);

module.exports = router;
