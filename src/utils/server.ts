import express from 'express'
import { Express } from 'express-serve-static-core'
import routes from '../routes'
export default function makeServer(): Promise<Express> {
    const server = express()
    server.use(routes)
    return Promise.resolve(server)
}