
const { drizzle } = require('drizzle-orm/node-postgres')
const { Pool } = require('pg')
const { migrate } = require('drizzle-orm/node-postgres/migrator')
const { configDotenv } = require('dotenv')
configDotenv()
const connString = process.env.DB_CONNECTION ?? ''
const pool = new Pool({
    connectionString: connString
})

const db = drizzle(pool)
migrate(db, {
    migrationsFolder: './drizzle'
}).then(result => {
    console.log('Result:', result)
    process.exit(0)
})

// note to self: does not have rollbacks automatically
// would need some other implementation