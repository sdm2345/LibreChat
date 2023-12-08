const express = require('express');
const {
  resetPasswordRequestController,
  resetPasswordController,
  refreshController,
  registrationController,
} = require('../controllers/AuthController');
const { loginController } = require('../controllers/auth/LoginController');
const { logoutController } = require('../controllers/auth/LogoutController');
const {
  checkBan,
  loginLimiter,
  registerLimiter,
  requireJwtAuth,
  requireLocalAuth,
  validateRegistration,
} = require('../middleware');
const { AUTH_BY_GATEWAY_JWT } = process.env ?? {};
const router = express.Router();

//Local
router.post('/logout', requireJwtAuth, logoutController);
router.post('/login', loginLimiter, checkBan, requireLocalAuth, loginController);

if (AUTH_BY_GATEWAY_JWT) {
  router.post('/refresh', requireJwtAuth, refreshController);
} else {
  router.post('/refresh', refreshController);
}
router.post('/register', registerLimiter, checkBan, validateRegistration, registrationController);
router.post('/requestPasswordReset', resetPasswordRequestController);
router.post('/resetPassword', resetPasswordController);

module.exports = router;
