import MoodRatingModel, { TMoodRating, TMoodRatingCreateArgs } from "../models/mood-rating";
import UserModel, { TUser } from "../models/user";

type AverageMoodRatingForDay = {
    date: string,
    rating: number | null
}

class MoodRatingService {
    model: MoodRatingModel
    userModel: UserModel
    constructor() {
        this.model = new MoodRatingModel()
        this.userModel = new UserModel()
    }

    /**
     * @param user The user whose ratings to get
     * @returns 
     */
    public async getByUser(user: TUser): Promise<TMoodRating[]> {
        const ratings = await this.model.getByUserId(user.id)
        return ratings
    }

    /**
     * @param args The payload to create a new rating
     * @returns the newly created rating
     */
    public async createRating(args: TMoodRatingCreateArgs): Promise<TMoodRating> {
        const newRating = await this.model.create(args)
        await this.userModel.updateById(args.userId, { lastLogAt: newRating.timestamp })
        return newRating
    }

    /**
     * 
     * @param user The user whose ratings to get
     * @param timeArgs The time range to get ratings for
     * @returns The average rating for each day in the time range
     */
    public async getAverageRatingPerDay(user: TUser, timeArgs: { from: Date, to: Date }): Promise<AverageMoodRatingForDay[]> {
        const ratings = await this.getByUserBetween(user, timeArgs)
        const dateRange = Math.abs(timeArgs.to.getTime() - timeArgs.from.getTime()) / (1000 * 60 * 60 * 24)

        const avgRatings = MoodRatingStatistics.fillEmptyDays(MoodRatingStatistics.averageRatingPerDay(ratings), dateRange)
        avgRatings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        return avgRatings
    }

    /**
     * 
     * @param user The user whose ratings to get
     * @param timeArgs The time range to get ratings for
     * @returns All MoodRatings for the user within the time range
     */
    public async getByUserBetween(user: TUser, timeArgs: { from: Date, to: Date }): Promise<TMoodRating[]> {
        const ratings = await this.model.getByUserIdBetween(user.id, timeArgs)
        const dateRange = Math.abs(timeArgs.to.getTime() - timeArgs.from.getTime()) / (1000 * 60 * 60 * 24)
        const filledRatings = MoodRatingStatistics.fillEmptyDays(ratings, dateRange, user.id)
        filledRatings.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        return filledRatings
    }
}

/**
 * A class for calculating statistics from MoodRatings
 */
export class MoodRatingStatistics {
    /**
     * 
     * @param ratings The ratings to average
     * @returns The average ratings per day
     */
    static averageRatingPerDay(ratings: TMoodRating[]): AverageMoodRatingForDay[] {
        const ratingsByDay: { [key: string]: number[] } = {}
        ratings.forEach(r => {
            const date = r.timestamp.toDateString()
            if (!ratingsByDay[date]) {
                ratingsByDay[date] = []
            }
            (ratingsByDay[date] as (number | null)[]).push(r.value)
        })

        const result = Object.entries(ratingsByDay).map(([date, ratings]) => {
            const avg = ratings.reduce((acc, curr) => acc + curr, 0) / ratings.length
            return { date, rating: avg }
        })

        return result
    }

    /**
     * 
     * @param rating The rating to check
     * @returns Whether the rating is an average rating
     */
    static ratingIsAverage(rating: (AverageMoodRatingForDay | TMoodRating | undefined)): rating is AverageMoodRatingForDay {
        return (rating as AverageMoodRatingForDay).rating !== undefined
    }

    /**
     * When querying statistics from the DB, there may be days with no ratings. This function fills those days with "empty" ratings.
     * 
     * @param ratings Known, existing ratings, to fill empty days in. 
     * @param dateRange The total number of days to fill.
     * @param userId The user ID to fill ratings for.
     */
    static fillEmptyDays(ratings: TMoodRating[], dateRange: number, userId: number): TMoodRating[]

    /**
     * When querying statistics from the DB, there may be days with no ratings. This function fills those days with "empty" ratings.
     * 
     * @param ratings  Known, existing ratings, to fill empty days in.
     * @param dateRange  The total number of days to fill.
     */
    static fillEmptyDays(ratings: AverageMoodRatingForDay[], dateRange: number,): AverageMoodRatingForDay[]

    /**
     * When querying statistics from the DB, there may be days with no ratings. This function fills those days with "empty" ratings.
     * 
     * @param ratings Known, existing ratings, to fill empty days in. (The type of ratings[] being either TMoodRating or AverageMoodRatingForDay)
     * @param dateRange  The total number of days to fill.
     * @param userId  The user ID to fill ratings for. (Only needed if ratings is TMoodRating[])
     * @returns 
     */
    static fillEmptyDays(ratings: (AverageMoodRatingForDay | TMoodRating)[], dateRange: number, userId?: number): (AverageMoodRatingForDay | TMoodRating)[] {
        for (let i = 0; i < dateRange; i++) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            const rating = ratings.find(r => {
                const key = this.ratingIsAverage(r) ? r.date : r.timestamp.toDateString()
                key === date.toDateString()
            })

            if (!rating) {

                const isAverage = this.ratingIsAverage(ratings[0])

                ratings.push(
                    isAverage ?
                        {
                            date: date.toDateString(),
                            rating: null,
                        } : {
                            id: -1,
                            timestamp: date,
                            userId: userId ?? -1,
                            value: null
                        })
            }
        }

        return ratings
    }
}

const moodRatingService = new MoodRatingService()
export default moodRatingService
