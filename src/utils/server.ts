import express from 'express'
import { Express } from 'express-serve-static-core'
import routes from '../routes'
import { JwtPayload } from '../middleware/jwt'
import { errorHandler } from '../middleware/errorhandling'

export default function makeServer(): Promise<Express> {
    const server = express()
    server.use(express.json())
    server.use(routes)
    server.use(errorHandler)
    return Promise.resolve(server)
}

declare global {
    namespace Express {
        interface Request {
            jwtPayload?: JwtPayload
        }
    }

}