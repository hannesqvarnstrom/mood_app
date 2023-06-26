import { Router } from "express"
import usersRouter from "./users"

const router = Router()

router.use((_req, res, next) => {
    res.set('content-type', 'application/json')
    next()
})

router.get('/', (_req, res) => {
    res.send({ message: 'Welcome to MoodLogger!' })
})

/**
 * Users 
 * - POST /register, 
 * - POST /login, 
 * - GET /me,
 * - PUT /me
 * 
 * - GET /auth/google
 * - GET /auth/google/redirect
 */
router.use(usersRouter)

export default router
