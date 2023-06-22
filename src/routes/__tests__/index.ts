import request from 'supertest'
import { Express } from 'express-serve-static-core'
import makeServer from '../../utils/server'
let server: Express
import envVars from '../../utils/environment'
import dbManager from '../../db'
import { users } from '../../db/schema'

async function setupTestEnvironment(): Promise<Express> {
    const server = await makeServer()
    const testEnvVars = {
        'DB_CONNECTION': envVars.get('DB_TEST_CONNECTION'),
        'NODE_ENV': 'test'
    }
    envVars.overrideBulk(testEnvVars)
    await dbManager.refreshConnection()
    await dbManager.migrateLatest()
    return server
}

afterAll(async () => {
    await dbManager.pool.end()
    envVars.restore()
})


beforeAll(async () => {
    server = await setupTestEnvironment()
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

describe('POST users', () => {
    it('create new user with password', async () => {
        const res = await request(server)
            .post('/users')
            .set('Content-Type', 'application/json')
            .send({ email: 'hejhej@something.se', password: '123456', passwordConfirmation: '123456' })
            .expect('Content-Type', /json/)
            .expect(201)
        expect(res.body.email).toBe('hejhej@something.se')
    })

    it('should throw on missing parameters', async () => {
        const data = [
            { email: 'hejhej@something.se', password: '123456' },
            { email: 'invalid_email' },
            { password: 'short' },
            { password: '123456', passwordConfirmation: '1234567', email: 'hejhej@something.se' },
            {},
        ]

        for (const body of data) {
            await request(server)
                .post('/users')
                .send(body)
                .expect('Content-Type', /json/)
                .expect(400)
        }
    })

})

describe('DatabaseManager', () => {
    it('should connect and be able to query successfully', async () => {
        await dbManager.truncateTables()
        const result = await dbManager.db.select().from(users)
        expect(result.length).toBe(0)
    })
})

describe('Authentication', () => {
    it('should return a payload when correctly logging in', async () => {
        throw new Error('Unimplemented')
    })
    it('should throw on faulty token', async () => {
        throw new Error('Unimplemented')
    })
    it('should allow access to protected routes if token is valid', async () => {
        throw new Error('Unimplemented')
    })
    it('should barr access to protected routes if token is (somehow) invalid', async () => {
        throw new Error('Unimplemented')
    })
})