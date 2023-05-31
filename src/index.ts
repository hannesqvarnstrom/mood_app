import makeServer from './utils/server'

(async () => {
    const app = await makeServer()
    app.listen(() => console.log('running'))
})()
