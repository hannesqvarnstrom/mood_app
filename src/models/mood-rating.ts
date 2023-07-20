import dbManager from "../db"
import { moodRatings } from "../db/schema"
import { and, between, eq, InferModel } from 'drizzle-orm'
import { AppError } from "../utils/errors"

export type RawMoodRating = InferModel<typeof moodRatings>
export type TMoodRatingCreateArgs = Omit<InferModel<typeof moodRatings, 'insert'>, 'id'>
export type TMoodRating = RawMoodRating
export const MAX_RATING_VALUE = 10
export default class MoodRatingModel {
    constructor() {

    }

    public static factory(params: RawMoodRating): TMoodRating {
        const { id, value, timestamp, userId } = params
        return { id, value, timestamp, userId }
    }

    public async create(args: TMoodRatingCreateArgs): Promise<TMoodRating> {
        const query = dbManager.db.insert(moodRatings).values(args).returning().prepare('create')
        const [result, ..._] = await query.execute()
        if (!result) {
            throw new AppError('Something went wrong while rating', 400)
        }

        return result
    }

    public async getByUserId(userId: number): Promise<TMoodRating[]> {
        const query = dbManager.db.select().from(moodRatings).where(eq(moodRatings.userId, userId)).prepare('getByUserId')
        const result = await query.execute()
        return result
    }

    public async getByUserIdBetween(userId: number, args: {
        from: Date,
        to: Date
    }): Promise<TMoodRating[]> {
        console.log('userId:', userId)
        const query = dbManager.db.select().from(moodRatings)
            .where(and(eq(moodRatings.userId, userId), between(moodRatings.timestamp, args.from, args.to)))
            .prepare('getByUserBetween')
        const result = await query.execute()
        return result
    }


}