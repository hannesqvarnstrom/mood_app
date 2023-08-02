import MoodRatingModel, { TMoodRating, TMoodRatingCreateArgs } from "../models/mood-rating";
import UserModel, { TUser } from "../models/user";

export type AverageMoodRatingForDay = {
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
     * Formatted for direct consumption in frontend.
     * 
     * @param user The user whose ratings to get
     * @param timeArgs The time range to get ratings for
     * @returns The average rating for each day in the time range
     */
    public async getAverageRatingPerDay(user: TUser, timeArgs: { from: Date, to: Date }): Promise<AverageMoodRatingForDay[]> {
        const ratings = await this.getByUserBetween(user, timeArgs)
        const avgRatings = MoodRatingStatistics.insertMissingDays(MoodRatingStatistics.getAverageRatingPerDay(ratings))
        return avgRatings
    }

    /**
     * Unsuitable for direct consumption in frontend.
     * Decent for consumption of 3rd party services.
     * 
     * @param user The user whose ratings to get
     * @param timeArgs The time range to get ratings for
     * @returns All MoodRatings for the user within the time range
     */
    public async getByUserBetween(user: TUser, timeArgs: { from: Date, to: Date }): Promise<TMoodRating[]> {
        const ratings = await this.model.getByUserIdBetween(user.id, timeArgs)
        // ratings.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
        return ratings
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
    static getAverageRatingPerDay(ratings: TMoodRating[]): AverageMoodRatingForDay[] {
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


    static insertMissingDays = (timestamps: (AverageMoodRatingForDay)[]) => {
        const newTimestamps: AverageMoodRatingForDay[] = [];
        if (!(timestamps.filter(x => x)).length) {
            return timestamps
        }

        for (let i = 0; i < timestamps.length; i++) {
            newTimestamps.push(timestamps[i]!);
            if (i > 0) {
                const prevDay = timestamps[i - 1]!;
                const currDay = timestamps[i]!;
                const prevDate = new Date(prevDay.date);

                // subtract one to account for the current day
                const daysDiff = this.diffBetweenDates(new Date(currDay.date), new Date(prevDay.date)) - 1
                if (daysDiff >= 1) {
                    const indexForBeginIndex = newTimestamps.indexOf(prevDay)
                    // for every day missing
                    for (let j = 1; j <= daysDiff; j++) {
                        const missingDay = new Date(prevDay.date);
                        missingDay.setDate(prevDate.getDate() + j);

                        newTimestamps.splice(
                            indexForBeginIndex + j,
                            0, { date: missingDay.toDateString(), rating: null })
                    }

                }

            }
        }

        return newTimestamps;
    }

    static diffBetweenDates = (date1: Date, date2: Date) => {
        return Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24)
    }

}

const moodRatingService = new MoodRatingService()
export default moodRatingService
