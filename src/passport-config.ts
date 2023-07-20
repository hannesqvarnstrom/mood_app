import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import envVars from './utils/environment'
import userService from './services/user'
import authService, { OAuthProvider } from './services/authentication'
import { AppError } from './utils/errors'

/**
 * When using googles OAuth in frontend, we have to use this flow:
 * 1. on "Log in with Google Account" action -> redirect (somehow) to BACKEND_URL/auth/google -> Google's own solution
 * 2. after auth, Google redirects to a certain URI. At the moment, this is BACKEND_URL/auth/google/redirect, 
 * where we "login" the user (return a JWT token.) 
 * However, since the concept for frontend is SPA or mobile-app, this will need changing. Maybe a "thank you"-page or something, something that links the user back into the App or WebApp.
 * maybe a url to the frontend -> FRONTEND_URL/auth/google?done=true or something, that then communicates with the server to get the JWT. 
 * Whatever the solution is, there needs to be one.
 */
passport.use(
    new GoogleStrategy(
        {
            clientID: envVars.get('GOOGLE_CLIENT_ID'),
            clientSecret: envVars.get('GOOGLE_CLIENT_SECRET'),
            callbackURL: '/auth/google/redirect',
        }, async (_accesstoken, _refreshToken, profile, done) => {
            const userIdentity = await authService.findUserIdentity(profile.id, 'GOOGLE')
            if (userIdentity) {
                const user = await userService.getById(userIdentity.userId)
                return done(null, user)
            } else {
                if (profile.emails?.length) {
                    const selectedEmail = profile.emails[0]
                    if (!selectedEmail) {
                        throw new AppError('Missing Email-address value for Oauth Login')
                    }

                    let user = await userService.getByEmail(selectedEmail.value)

                    if (!user) {
                        user = await userService.createUser({ email: selectedEmail.value })
                    }

                    const identityPayload = {
                        provider: 'GOOGLE' as OAuthProvider,
                        providerId: profile.id,
                        userId: user.id
                    }

                    await authService.createUserIdentity(identityPayload)

                    return done(null, user)
                } else {
                    throw new AppError('Missing an Email-address for Oauth Login')
                }
            }
        })
)
