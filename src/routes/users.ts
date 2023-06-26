import { Router } from 'express'
import authService from "../services/authentication"
import { JWTExpiresIn, requireJwt, signJwt } from "../middleware/jwt"
import { loginSchema, registerSchema, updateMeSchema } from "./schemas"
import userService from "../services/user"
import { validateRequest } from '../utils/schema'
const usersRouter = Router()

usersRouter.post('/register', validateRequest(registerSchema), async (req, res, next) => {
    try {
        const user = await userService.createUser(req.body)
        return res.status(201).send(user)
    } catch (e) {
        return next(e)
    }
})

usersRouter.post('/login', validateRequest(loginSchema), async (req, res, next) => {
    try {
        const user = await authService.attemptPasswordLogin(req.body)
        const token = signJwt(user.id)
        return res.status(200).send({
            token,
            expiresAt: new Date().setTime(new Date().getTime() + (JWTExpiresIn * 1000)),
            expiresIn: JWTExpiresIn
        })
    } catch (e) {
        return next(e)
    }
})

usersRouter.get('/me', requireJwt, async (req, res, next) => {
    try {
        const userId = req.jwtPayload?.userId as number
        const me = await userService.getById(userId)
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

export default usersRouter