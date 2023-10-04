import { NextFunction, Request, Response } from "express"
import { z } from "zod"
export const validateRequest = <
    Z extends {
        parseAsync: (
            data: unknown,
            params?: Partial<z.ParseParams> | undefined
        ) => any
    }>(schema: Z) => {
    return async (req: Request, _res: Response, next: NextFunction) => {
        try {
            /**
             * @todo
             * - enable parsing for query string and params...
             */
            await schema.parseAsync(req.body)
            // await schema.parseAsync({
            //     body: req.body,
            //     query: req.query,
            //     params: req.params
            // })
            return next()
        } catch (error) {
            return next(error)
        }
    }
}