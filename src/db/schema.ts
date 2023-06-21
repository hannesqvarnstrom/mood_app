import { index, integer, pgTable, serial, smallint, text, timestamp, varchar } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: text('email').notNull(),
    password: varchar('password'),
}, (users) => ({
    emailIdx: index('users_email_index').on(users.email)
}))

export const moodRatings = pgTable('mood_ratings', {
    id: serial('id').primaryKey(),
    value: smallint('value'),
    timestamp: timestamp('timestamp', { mode: 'date' }),
    userId: integer('user_id').references(() => users.id)
}, (moodRatings) => ({
    userIdIdx: index('mood_ratings_user_id_index').on(moodRatings.userId)
}))
