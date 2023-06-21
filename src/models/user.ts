import dbManager from "../db"
import { users } from "../db/schema"
import { eq, InferModel } from 'drizzle-orm'

export type RawUser = InferModel<typeof users>
export type TUserCreateArgs = InferModel<typeof users, 'insert'>
export type TUser = Omit<RawUser, 'password'>

export default class UserModel {
    constructor() {
    }

    public static payload(params: RawUser): TUser {
        const { email, id } = params
        return { email, id }
    }

    /**
     * @param id id of entity requested in DB
     * @param require if true is passed, will throw 404 if entity couldn't be found
     * 
     * @TODO make this a function for a base Model-like class. Could be reused
     */
    public async getById<B extends boolean = true>(id: number, require: B): Promise<TUser>
    public async getById(id: number): Promise<TUser | undefined>
    public async getById<B extends boolean = false>(id: number, require?: B) {
        const q = dbManager.db.select().from(users).where(eq(users.id, id)).prepare('q')
        const [result, ..._] = await q.execute()

        if (result) {
            const user = UserModel.payload(result)
            return user
        } else {
            if (require) throw new Error('404')
            return undefined
        }
    }

    public async create({ email, password }: TUserCreateArgs): Promise<TUser> {
        /** @todo enable password-less authentication (OAuth2?) */
        const q = dbManager.db.insert(users).values({ email, password }).returning().prepare('q')
        const [newUser, ..._] = await q.execute()
        if (newUser) {
            return UserModel.payload(newUser)
        } else {
            throw new Error('User failed to be added for some reason')
        }
    }

    public async list({ limit }: ListArguments): Promise<TUser[]> {
        const q = dbManager.db.select().from(users).limit(limit).prepare('q')
        const list = (await q.execute()).map(UserModel.payload)
        return list
    }
}

interface ListArguments {
    limit: number
}
