const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const config = require('../config');
const { asyncHandler, ok, fail } = require('../utils/respond');
const { signToken, setAuthCookie, clearAuthCookie } = require('../utils/token');

const googleClient = new OAuth2Client(config.google.clientId);

/**
 * POST /auth/google
 * Body: { credential } — the ID token (JWT) from Google Identity Services.
 * Verifies the token, creates the user on first login, issues a JWT cookie.
 */
const googleAuth = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return fail(res, 'Missing Google credential.', 400);
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.google.clientId,
    });
    payload = ticket.getPayload();
  } catch (err) {
    return fail(res, 'Invalid Google credential.', 401);
  }

  const { sub: googleId, email, name, picture } = payload;
  if (!email) {
    return fail(res, 'Google account has no email.', 400);
  }

  let user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    // Automatically create account on first login
    user = await User.create({
      googleId,
      email,
      name: name || email.split('@')[0],
      profilePicture: picture || '',
      balance: 0,
      lastLogin: new Date(),
    });
  } else {
    if (!user.googleId) user.googleId = googleId;
    if (picture && !user.profilePicture) user.profilePicture = picture;
    user.lastLogin = new Date();
    await user.save();
  }

  if (user.suspended) {
    return fail(res, 'Account suspended. Contact support.', 403);
  }

  const token = signToken(user);
  setAuthCookie(res, token);

  return ok(res, { user: user.toPublicJSON() });
});

/**
 * POST /login
 * Body: { email, password } — email/password login for non-Google accounts.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+passwordHash'
  );

  if (!user || !(await user.comparePassword(password))) {
    return fail(res, 'Invalid email or password.', 401);
  }

  if (user.suspended) {
    return fail(res, 'Account suspended. Contact support.', 403);
  }

  user.lastLogin = new Date();
  await user.save();

  const token = signToken(user);
  setAuthCookie(res, token);

  return ok(res, { user: user.toPublicJSON() });
});

/**
 * POST /logout
 * Clears the auth cookie.
 */
const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  return ok(res, { message: 'Logged out.' });
});

module.exports = { googleAuth, login, logout };
