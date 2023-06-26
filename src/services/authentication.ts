import dbManager, { DB } from "../db";
import { compare, hash } from "bcrypt"
import UserModel, { TUser } from "../models/user";
import { AppError } from "../utils/errors";

export class AuthenticationService {
    db: DB
    userModel: UserModel
    constructor() {
        this.db = dbManager.db
        this.userModel = new UserModel()
    }

    public async attemptPasswordLogin({ email, password }: IPasswordLoginBody): Promise<TUser> {
        const user = await this.userModel.getByEmail(email)
        const genericLoginErrorMessage = new AppError('Email or password doesn\'t match our records.', 400)

        if (user === undefined) throw genericLoginErrorMessage
        if (!user.password) throw genericLoginErrorMessage
        const passwordCorrect = await compare(password, user.password)
        if (!passwordCorrect) throw genericLoginErrorMessage

        return UserModel.payload(user)

    }

    public static async hashPassword(password: string) {
        const saltRounds = 10
        return hash(password, saltRounds)
    }

    public static async compare(unknownPassword: string, encryptedPassword: string): Promise<boolean> {
        return compare(unknownPassword, encryptedPassword)
    }
}

const authService = new AuthenticationService()
export default authService

interface IPasswordLoginBody {
    email: string,
    password: string
}
