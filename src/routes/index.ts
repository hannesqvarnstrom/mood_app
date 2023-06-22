import { NextFunction, Request, Response, Router } from "express"

import userService from "../services/user"
import { z } from "zod"
import authService from "../services/authentication"
import { JWTExpiresIn, requireJwt, signJwt } from "../middleware/jwt"

export const validateRequest = <Z extends { parseAsync: (data: unknown, params?: Partial<z.ParseParams> | undefined) => any }>(schema: Z) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params
            })
            return next()
        } catch (error) {
            // console.log(error)
            return res.status(400).send(error)
        }
    }
}


const router = Router()

router.use((req, res, next) => {
    res.set('content-type', 'application/json')
    if (!req.headers.authorization) {
        console.log('No authorization header present, abort later')
    }
    next()
})

router.get('/', (_req, res) => {
    res.send({ message: 'Welcome to MoodLogger!' })
})

const usersPostSchema = z.object({
    body: z.object({
        email: z.string().email('Not a valid email'),
        password: z.string().min(6),
        passwordConfirmation: z.string().min(6)
    })
})
    .superRefine(({ body }, ctx) => {
        const { password, passwordConfirmation } = body
        if (password !== passwordConfirmation) {
            ctx.addIssue({
                code: 'custom',
                message: 'Passwords did not match'
            })
        }
    })

/** @todo Zod validation for input */
router.post('/users', validateRequest(usersPostSchema), async (req, res) => {
    const user = await userService.createUser(req.body)
    return res.status(201).send(user)
})

const loginSchema = z.object({
    body: z.object({
        email: z.string().email('Not a valid email'),
        password: z.string().min(6)
        /**
         * @todo implement OAuth and new routes for auth
         * @todo implement BankID first? goto https://www.bankid.com/utvecklare/test and https://www.bankid.com/utvecklare/guider
         */
    })
})

router.post('/login', validateRequest(loginSchema), async (req, res) => {
    try {
        const user = await authService.attemptPasswordLogin(req.body)
        const token = signJwt(user.id)
        return res.status(200).send({
            token,
            expiresIn: new Date().setTime(new Date().getTime() + (JWTExpiresIn * 1000))
        })
    } catch (e) {
        return res.status(400).send(e.message)
    }
})

router.get('/users', requireJwt, async (_req, res) => {
    return res.send(await userService.getUsersList())
})

router.get('/users/:id', requireJwt, async (req, res) => {
    return res.send(await userService.getById(parseInt(req.params.id)))
})

export default router
