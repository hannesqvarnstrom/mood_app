import { Response, Router } from 'express'
import authService, { OAuthProvider } from "../services/authentication"
import { JWTExpiresIn, requireJwt, signJwt } from "../middleware/jwt"
import { loginSchema, registerSchema, updateMeSchema } from "./schemas"
import userService from "../services/user"
import { validateRequest } from '../utils/schema'
import { TUser } from '../models/user'
import { AppError } from '../utils/errors'

const usersRouter = Router()

usersRouter.post('/register', validateRequest(registerSchema), async (req, res, next) => {
    try {
        const user = await userService.createUser(req.body)
        return res.status(201).send(user)
    } catch (e) {
        return next(e)
    }
})

const signAndSendUserToken = (user: TUser, res: Response) => {
    const token = signJwt(user.id)
    return res.status(200).send({
        token,
        userId: user.id,
        expiresAt: new Date().setTime(new Date().getTime() + (JWTExpiresIn * 1000)),
        expiresIn: JWTExpiresIn,
        logOverdue: userService.logOverdue(user, new Date())
    })
}

usersRouter.post('/login', validateRequest(loginSchema), async (req, res, next) => {
    try {
        const user = await authService.attemptPasswordLogin(req.body)
        return signAndSendUserToken(user, res)
    } catch (e) {
        return next(e)
    }
})

usersRouter.get('/me', requireJwt, async (req, res, next) => {
    try {
        const userId = req.jwtPayload?.userId as number
        const me = await userService.getById(userId)
        console.log('me:', me)
        return res.send({ me })
    } catch (e) { return next(e) }
})

usersRouter.put('/me', requireJwt, validateRequest(updateMeSchema), async (req, res, next) => {
    const userId = req.jwtPayload?.userId as number
    try {
        const updatedMe = await userService.updateById(userId, req.body)
        return res.status(201).send({ updatedMe })
    }
    catch (e) {
        return next(e)
    }
})


/**
 * OAUTH ENDPOINTS
 */

/**
 * Client initiated
 */
/**
 * Google
 */
usersRouter.post('/auth/google', async (req, res) => {
    const {
        id,
        email,
    } = req.body

    if (!id) {
        throw new AppError('missing id', 400)
    }

    const userIdentity = await authService.findUserIdentity(id, 'GOOGLE')
    if (userIdentity) {
        const user = await userService.getById(userIdentity.userId)
        return signAndSendUserToken(user, res)
    } else {
        if (email) {
            let user = await userService.getByEmail(email)

            if (!user) {
                user = await userService.createUser({ email })
            }

            const identityPayload = {
                provider: 'GOOGLE' as OAuthProvider,
                providerId: id,
                userId: user.id
            }

            await authService.createUserIdentity(identityPayload)
            return signAndSendUserToken(user, res)
        } else {
            throw new AppError('Missing an Email-address for Oauth Login', 400)
        }
    }
})

/**
 * Serverside (idk)
 */
/**
 * (passport)
 * Google
 */
// usersRouter.get('/auth/google', passport.authenticate('google', {
//     scope: ['email', 'profile'],
//     session: false
// }))

// usersRouter.get('/auth/google/redirect', passport.authenticate('google', { session: false }), (req, res, next) => {
//     const user = req.user as TUser
//     if (!user) {
//         return next(new AppError('Passport failed to serialize a user', 500))
//     }

//     const token = signJwt(user.id)
//     return res.status(200).send({
//         token,
//         expiresAt: new Date().setTime(new Date().getTime() + (JWTExpiresIn * 1000)),
//         expiresIn: JWTExpiresIn
//     })
// })


export default usersRouter