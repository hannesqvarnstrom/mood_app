import { Router } from 'express'
import { requireJwt } from '../middleware/jwt'
import userService from '../services/user'
import moodRatingService from '../services/mood-rating'
import { getRatingsQuerySchema, postRatingSchema } from './schemas'
import { validateRequest } from 'zod-express-middleware'

const moodRatingRouter = Router()

moodRatingRouter.use('/', requireJwt, async (req, _res, next) => {
    const userId = req.jwtPayload?.userId
    if (!userId) {
        return next(401) // jwt malformed
    }

    const user = await userService.getById(userId)
    req.user = user

    next()
})

moodRatingRouter.get('/', validateRequest({ query: getRatingsQuerySchema }), async (req, res, next) => {
    const { from, to } = req.query
    try {
        const ratings = await moodRatingService.getByUserBetween(req.user!, { from: new Date(from), to: new Date(to) })
        return res.send(ratings)
    } catch (error) {
        return next(error)
    }
})

moodRatingRouter.get('/average', validateRequest({ query: getRatingsQuerySchema }), async (req, res, next) => {
    const { from, to } = req.query
    try {
        const ratings = await moodRatingService.getAverageRatingPerDay(req.user!, { from: new Date(from), to: new Date(to) })
        return res.send(ratings)
    } catch (error) {
        return next(error)
    }
})

moodRatingRouter.post('/', validateRequest({ body: postRatingSchema }), async (req, res, next) => {
    const { value } = req.body

    try {
        const newRating = await moodRatingService.createRating({ value, userId: req.user!.id, timestamp: new Date() })
        return res.status(201).send(newRating)
    } catch (error) {
        return next(error)
    }
})

export default moodRatingRouter

