import jwt, { SignOptions } from 'jsonwebtoken'
import envVars from '../utils/environment'
export const signJwt = (payload: Object, options: SignOptions = {}) => {
    const privateKey = Buffer.from(
        envVars.get('accessTokenPrivateKey'),
        'base64'
    ).toString('ascii')
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
