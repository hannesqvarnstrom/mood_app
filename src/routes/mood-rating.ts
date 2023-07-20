import { Router } from 'express'
import { requireJwt } from '../middleware/jwt'
import userService from '../services/user'
import assert from 'assert'
import moodRatingService from '../services/mood-rating'
import { validateRequest } from '../utils/schema'
import { postRatingSchema } from './schemas'
import { z } from 'zod'
const moodRatingRouter = Router()

/**
 * @todo fix prefix BS
 */
moodRatingRouter.use('/ratings', requireJwt, async (req, _res, next) => {
    const userId = req.jwtPayload?.userId
    assert(userId)
    const user = await userService.getById(userId)
    req.user = user

    next()
})

const getRatingsQuerySchema = z.object({
    from: z.string(),
    to: z.string(),
})

moodRatingRouter.get('/ratings', async (req, res) => {
    const { from, to } = await getRatingsQuerySchema.parseAsync(req.query)

    const ratings = await moodRatingService.getByUserBetween(req.user!, { from: new Date(from), to: new Date(to) })
    return res.send(ratings)
})

moodRatingRouter.get('/ratings/average', async (req, res) => {
    const { from, to } = await getRatingsQuerySchema.parseAsync(req.query)

    const ratings = await moodRatingService.getAverageRatingPerDay(req.user!, { from: new Date(from), to: new Date(to) })
    console.log('ratings:', ratings)
    return res.send(ratings)
})

moodRatingRouter.post('/ratings', validateRequest(postRatingSchema), async (req, res) => {
    const { value } = req.body
    const newRating = await moodRatingService.createRating({ value, userId: req.user!.id, timestamp: new Date() })
    return res.status(201).send(newRating)
})

export default moodRatingRouter

