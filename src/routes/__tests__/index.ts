import request from 'supertest'
import { Express } from 'express-serve-static-core'
import makeServer from '../../utils/server'
let server: Express

beforeAll(async () => {
    server = await makeServer()
})

describe('GET /', () => {
    it('should return a welcome message when getting root', async () => {
        const res = await request(server)
            .get('/')
            .expect('Content-Type', /json/)
            .expect(200)
        expect(res.body).toMatchObject({ message: 'Welcome to MoodLogger!' })
    })
})