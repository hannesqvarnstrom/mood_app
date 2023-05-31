import { Router } from "express";

const router = Router()

router.use((req, _res, next) => {
    if (!req.headers.authorization) {
        console.log('No authorization header present, abort later')
    }
    next()
})

router.get('/', (_req, res) => {
    res.set('content-type', 'application/json')
    res.send({ message: 'Welcome to MoodLogger!' })
})

export default router