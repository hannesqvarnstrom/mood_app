describe('user service', () => {
    it('should be testable', async () => {
        const p = new Promise((resolve) => resolve('works'))
        const r = await p
        expect(r).toBe('works')
    })
})