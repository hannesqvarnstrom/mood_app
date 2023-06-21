import dbManager, { DB } from "../db";
import { compare, hash } from "bcrypt"
import UserModel, { TUser } from "../models/user";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";


class AuthenticationService {
    db: DB
    constructor() {
        this.db = dbManager.db
    }

    public async attemptPasswordLogin({ email, password }: IPasswordLoginBody): Promise<TUser> {
        const q = this.db.select().from(users).where(eq(users.email, email)).prepare('q')
        const [user, ..._] = await q.execute()

        const genericLoginErrorMessage = new Error('Email or password doesn\'t match our records.')

        if (user === undefined) throw genericLoginErrorMessage
        if (!user.password) throw genericLoginErrorMessage
        const passwordCorrect = await compare(password, user.password)
        if (!passwordCorrect) throw genericLoginErrorMessage

        return UserModel.payload(user)

    }

    public async hashPassword(password: string) {
        const saltRounds = 10
        return hash(password, saltRounds)
    }
}

const authService = new AuthenticationService()
export default authService

interface IPasswordLoginBody {
    email: string,
    password: string
}
