import request from 'supertest'
import { Express } from 'express-serve-static-core'
import makeServer from '../../utils/server'
let server: Express
import envVars from '../../utils/environment'
import dbManager from '../../db'
import { federatedIdentities, users } from '../../db/schema'
import { SchemaInterface, loginSchema, registerSchema, updateMeSchema } from '../schemas'
import { and, eq } from 'drizzle-orm'
import oauthService from '../../services/oauth'
import sinon from 'ts-sinon'

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
    await dbManager.truncateTables()
    await dbManager.pool.end()
    envVars.restore()
    sinon.restore()
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
            .post('/register')
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
                .post('/register')
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


interface TestRequestOptions<O extends object> {
    payload?: O,
    expectStatus?: number,
    queryParams?: Record<string, string>
}


async function register(server: Express, options: TestRequestOptions<SchemaInterface<typeof registerSchema>> = {}) {
    const defaultBody: SchemaInterface<typeof registerSchema> = { email: 'hejhej@something.se', password: '123456', passwordConfirmation: '123456' }

    const req = request(server).post('/register')
        .set('Content-Type', 'application/json')
        .send(options.payload || defaultBody)
        .expect(options.expectStatus || 201)

    return req
}

async function login(server: Express, options: TestRequestOptions<SchemaInterface<typeof loginSchema>> = {}) {
    const defaultBody: SchemaInterface<typeof loginSchema> = { email: 'hejhej@something.se', password: '123456' }
    const req = request(server).post('/login')
        .set('Content-Type', 'application/json')
        .send(options.payload || defaultBody)
        .expect(options.expectStatus || 200)

    return req
}

describe('Authentication', () => {
    it('should return a valid payload when correctly logging in', async () => {
        await register(server)
        const loginResult = await login(server)
        const { expiresIn, expiresAt, token } = loginResult.body
        expect(![expiresIn, expiresAt, token].some(x => !x)).toBeTruthy()
        expect(expiresIn).toBe(3600 * 24)
        expect(expiresAt > new Date().getTime()).toBeTruthy()
        expect(token.length > 15).toBeTruthy() // idk
    })

    it('should require correct password when logging in', async () => {
        const badPasswords = [
            ' 123456', '1234567', 'a123456', '', ' '
        ]
        for (const pw of badPasswords) {
            await login(server, { payload: { email: 'hejhej@something.se', password: pw }, expectStatus: 400 })
        }
    })

    it('should allow access to protected routes if token is valid', async () => {
        const loginResult = await login(server)
        const protectedData = await request(server)
            .get('/me')
            .set('Content-Type', 'application/json')
            .set('Authorization', 'Bearer ' + loginResult.body.token)
            .expect(200)
        expect(!!protectedData.body.me.email).toBeTruthy()
    })
    it('should barr access to protected routes if token is (somehow) invalid', async () => {
        await request(server)
            .get('/me')
            .set('Content-Type', 'application/json')
            .set('Authorization', 'Bearer BADTOKEN123123')
            .expect(401)
    })

    describe('Oauth', () => {

        describe('Client initiated', () => {
            let oauthVerifyTokenStub: sinon.SinonStub
            const email = 'newuser@example.com'
            const providerToken = 'abc.abc.abc'
            const gId = '123'

            beforeAll(async () => {
                sinon.restore()
                oauthVerifyTokenStub = sinon.stub(oauthService, 'verifyGoogleToken').resolves({ email: email, id: gId })
            })
            afterAll(async () => {
                oauthVerifyTokenStub.restore()
            })

            beforeEach(async () => {
                await dbManager.truncateTables()
            })

            it('validates post body', async () => {
                const badPayloads = [
                    {},
                    { providerToken: '' },
                    { badKey: 'asd' },
                    { providerToken: 'abc' },
                    { providerToken: 'abc.abc' },
                ]

                for (const badPayload of badPayloads) {
                    await request(server)
                        .post('/auth/google')
                        .send(badPayload)
                        .expect(400)
                }
            })

            it('creates a new user + identity if completely new user', async () => {
                const existingUser = await dbManager.db.select().from(users).where(eq(users.email, email))
                expect(existingUser.length).toBe(0)

                await request(server)
                    .post('/auth/google')
                    .send({ providerToken })
                    .expect(200)

                const newUser = await dbManager.db.select().from(users).where(eq(users.email, email))
                expect(newUser.length).toBe(1)

                const newIdentity = await dbManager.db.select().from(federatedIdentities)
                    .where(
                        and(
                            eq(federatedIdentities.providerId, '123'),
                            eq(federatedIdentities.provider, 'GOOGLE'),
                            eq(federatedIdentities.userId, newUser[0]!.id)
                        )
                    )

                expect(newIdentity.length).toBe(1)
            })

            it('prompts normal login if user already exists', async () => {
                await register(server, {
                    payload: {
                        email,
                        password: '123456',
                        passwordConfirmation: '123456'
                    }
                })

                const userExists = await dbManager.db.select().from(users).where(eq(users.email, email))
                expect(userExists.length).toBe(1)

                const response = await request(server)
                    .post('/auth/google')
                    .send({ providerToken })
                    .expect(200)
                expect(response.body.action).toBe('prompt_normal_login')

                const wasIdentityCreated = await dbManager.db.select().from(federatedIdentities).where(and(eq(federatedIdentities.providerId, gId), eq(federatedIdentities.provider, 'GOOGLE'), eq(federatedIdentities.userId, userExists[0]!.id)))
                expect(wasIdentityCreated.length).toBe(0)
            })

            it('returns token if user + identity exists', async () => {
                const creationResponse = await request(server)
                    .post('/auth/google')
                    .send({ providerToken })
                    .expect(200)

                expect(creationResponse.body.token).toBeTruthy()

                const user = await dbManager.db.select().from(users).where(eq(users.email, email))
                expect(user.length).toBe(1)

                const identity = await dbManager.db.select().from(federatedIdentities).where(
                    and(
                        eq(federatedIdentities.providerId, gId),
                        eq(federatedIdentities.provider, 'GOOGLE'),
                        eq(federatedIdentities.userId, user[0]!.id),
                    ),
                )
                expect(identity.length).toBe(1)

                const loginResponse = await request(server)
                    .post('/auth/google')
                    .send({ providerToken })
                    .expect(200)

                expect(loginResponse.body.token).toBeTruthy()
            })
        })
    })

    describe('/ratings', () => {
        let user: unknown
        beforeAll(async () => {
            await dbManager.truncateTables()
            user = await register(server).then(res => res.body)
            const loginResult = await login(server)
            console.log('loginResult:', loginResult)
            console.log('user:', user)
        })

        afterAll(async () => {
            await dbManager.truncateTables()
        })

        describe('GET', () => {
            it('is protected by jwt', async () => {
            })

            it('gets latest ratings for the auth-ed user ONLY', async () => {
            })
        })

        describe('/average', () => {
            it('is protected by jwt', async () => { })
            it('gets ratings for the auth-ed user ONLY', async () => { })
            it('gets average rating per day', () => { })
            it('groups ratings by day', () => { })
            it('fills empty days with null', () => { })
        })

        describe('POST', () => {
            it('is protected by jwt', async () => { })
            it('creates a new rating for the auth-ed user', async () => { })
            it('returns the new rating', async () => { })
            it('validates the request body', async () => { })
            it('sets the users lastLogAt to the current time', async () => { })
        })

    })

    describe('/me', () => {
        let user: { email: string, password: string }

        beforeAll(async () => {
            user = {
                email: 'hejhej@something.se',
                password: '123456'
            }

            await register(server, {
                payload: {
                    email: user.email,
                    password: user.password,
                    passwordConfirmation: user.password
                }
            })
        })
        it('GET', async () => {
            const loginResult = await login(server)
            const protectedData = await request(server)
                .get('/me')
                .set('Content-Type', 'application/json')
                .set('Authorization', 'Bearer ' + loginResult.body.token)
                .expect(200)
            expect(protectedData.body.me.email).toBe('hejhej@something.se')
            expect(protectedData.body.me.id).toBeTruthy()
            expect(protectedData.body.me.lastLogAt).toBe(null)
        })

        it('PUT', async () => {
            const email = 'hejhej@something.se'
            const oldPassword = '123456'
            const newPassword = '1234567'
            const payload: SchemaInterface<typeof updateMeSchema> = { oldPassword, newPassword, newPasswordConfirmation: newPassword }

            // verify this route is protected
            await request(server)
                .put('/me')
                .send(payload)
                .expect(401)
            const loginData = await login(server)
            const result = await request(server)
                .put('/me')
                .set('Authorization', 'Bearer ' + loginData.body.token)
                .send(payload)
                .expect(201)

            // verify we get some valid result, and that we have tried to update the right user
            expect(result.body.updatedMe.email).toBe(email)

            // make sure old password is no longer working
            await login(server, { payload: { email, password: oldPassword }, expectStatus: 400 })

            // make sure new password works
            return login(server, { payload: { email, password: newPassword } })
        })

        it('PUT validation', async () => {
            const badPayloads = [
                {
                    oldPassword: 'wrongOldPassword',
                    newPassword: '123456',
                    newPasswordConfirmation: '123456'
                },
                {
                    // oldPassword missing
                    newPassword: '123456',
                    newPasswordConfirmation: '123456'
                },
                {
                    oldPassword: '1234567',
                    newPassword: '123456',
                    newPasswordConfirmation: 'notTheSame'
                },
                {
                    oldPassword: '1234567',
                    // missing new
                },
                {
                    oldPassword: '1234567',
                    newPassword: '123456'
                },
                {
                    oldPassword: '1234567',
                    newPasswordConfirmation: '123456'
                }
            ]
            const loginData = await login(server, { payload: { email: 'hejhej@something.se', password: '1234567' } })
            for (const badPayload of badPayloads) {
                await request(server)
                    .put('/me')
                    .send(badPayload)
                    .set('Authorization', 'Bearer ' + loginData.body.token)
                    .expect(400)
            }
        })
    })
})
