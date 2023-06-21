import UserModel, { TUser, TUserCreateArgs } from "../models/user";
import authService from "./authentication";

class UserService {
    model: UserModel

    constructor() {
        this.model = new UserModel()
    }

    public async getById(id: number): Promise<TUser> {
        return this.model.getById(id, true)
    }

    public async createUser(args: TUserCreateArgs): Promise<TUser> {
        if (args.password) {
            args.password = await authService.hashPassword(args.password)
        } else {
            throw new Error('Passwordless authentication not implemented')
        }

        return this.model.create(args)
    }

    public async getUsersList() {
        return this.model.list({ limit: 50 })
    }
}

const userService = new UserService()

export default userService
