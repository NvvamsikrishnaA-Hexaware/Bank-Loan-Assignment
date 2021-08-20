require('dotenv').config()

const JWTstrategy = require('passport-jwt').Strategy;
// const ExtractJWT = require('passport-jwt').ExtractJwt;

const cookieExtractor = req => {
    let accessToken = null
    if( req && req.headers.cookie) {
        accessToken = req.headers.cookie.slice(4)
    }
    return accessToken
}

module.exports = function (passport) {
    passport.use(
        new JWTstrategy(
            {
                secretOrKey: process.env.ACCESS_TOKEN_SECRET,
                algorithm: 'HS512',
                jwtFromRequest: req => cookieExtractor(req)
            },
            async (data, done) => {
                try {
                    // console.log(data);
                    return done(null, data);
                } catch (error) {
                    done(error);
                }
            }
        )
    )
}