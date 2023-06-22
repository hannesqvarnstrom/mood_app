import express, { NextFunction, Request, Response } from 'express'
import { Express } from 'express-serve-static-core'
import routes from '../routes'
import { JwtPayload } from '../middleware/jwt'
export default function makeServer(): Promise<Express> {
    const server = express()
    server.use(express.json())
    server.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        if (err) {
            err.status = err.status || 'error'
            err.statusCode = err.statusCode || 500

            res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            })
        }
    })
    server.use(routes)
    return Promise.resolve(server)
}

declare global {
    namespace Express {
        interface Request {
            jwtPayload?: JwtPayload
        }
    }

}