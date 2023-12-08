const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem'); // use jwk-to-pem

const publicKeyCache = {};
async function secretOrKeyProvider(request, rawJwtToken, done) {
  // Parse the JWT header from the rawJwtToken.
  const decoded = jwt.decode(rawJwtToken, { complete: true });
  if (decoded && decoded.header) {
    let alg = decoded.header.alg;
    let iss = decoded.payload.iss;
    let kid = decoded.payload.kid;
    if (iss && kid) {
      const cacheKey = `${iss}:${kid}`;
      if (publicKeyCache[cacheKey]) {
        console.error('hit publicKeyCache[cacheKey]', publicKeyCache[cacheKey]);
        return done(null, publicKeyCache[cacheKey]);
      }
      const jwksUrl = `${iss}/.well-known/jwks.json`;
      const jwksResponse = await fetch(jwksUrl);
      const jwksData = await jwksResponse.json();
      const publicKey = jwksData.keys.find((key) => key.kid === kid);
      if (publicKey) {
        // 缓存公钥
        publicKeyCache[cacheKey] = jwkToPem(publicKey);
      }
    }
    switch (alg) {
      case 'HS256':
        // 对于HS256，返回对称密钥
        return done(null, process.env.JWT_SECRET);
      default:
        return done(new Error('Unsupported algorithm'), null);
    }
  } else {
    return done(new Error('Invalid token'), null);
  }
}

const { AUTH_BY_GATEWAY_JWT } = process.env ?? {};
// JWT strategy
const jwtLogin = async () =>
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: secretOrKeyProvider,
      algorithms: ['HS256', 'ES256'],
    },
    async (payload, done) => {
      try {
        const user =
          (await User.findById(payload.id)) || (await User.findOne({ email: payload.email }));
        if (user) {
          done(null, user);
        } else {
          if (AUTH_BY_GATEWAY_JWT) {
            let email = payload.email || '';
            let username = email.split('@')[0] || '';
            let user = new User({
              provider: 'jwt',
              openidId: payload.email || '' + Math.random(),
              username: username,
              email: payload.email || '',
              emailVerified: true,
              name: username,
            });
            await user.save();
            done(null, user);
          } else {
            done(null, false);
          }
        }
      } catch (err) {
        done(err, false);
      }
    },
  );

module.exports = jwtLogin;
