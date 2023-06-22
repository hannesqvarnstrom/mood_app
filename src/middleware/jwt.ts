import jwt, { SignOptions } from 'jsonwebtoken'
import envVars from '../utils/environment'
import { NextFunction, Request, Response } from 'express'
export const JWTExpiresIn = 3600 * 24

export const signJwt = (userId: number, options: SignOptions = {
    expiresIn: JWTExpiresIn// 1 day
}) => {
    const privateKey = Buffer.from(
        envVars.get('accessTokenPrivateKey'),
        'base64'
    ).toString('ascii')
    const payload = { userId, expiresIn: JWTExpiresIn }
    return jwt.sign(payload, privateKey, {
        ...(options && options),
        algorithm: 'RS256'
    })
}

export const verifyJwt = <T>(token: string): T | null => {
    try {
        const publicKey = Buffer.from(
            envVars.get('accessTokenPublicKey'),
            'base64'
        ).toString('ascii')
        return jwt.verify(token, publicKey) as T
    } catch (error) {
        return null
    }
}

export const requireJwt = async <Params>(req: Request<Params>, _res: Response, next: NextFunction) => {
    try {
        const authString = req.headers.authorization
        if (!authString) throw new Error('No authorization header supplied')
        const token = authString.substring(authString.indexOf('Bearer '), authString.length)
        if (!token) throw new Error('No webtoken supplied')

        const jwtPayload = verifyJwt<JwtPayload>(token)
        if (!jwtPayload) throw new Error('Unable to verify token')

        req.jwtPayload = jwtPayload
    } catch (error) {
        next(error)
    }

}

export type JwtPayload = {
    userId: number,
    expiresIn: string
}
