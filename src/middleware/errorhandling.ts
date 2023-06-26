import { NextFunction, Request, Response } from "express";

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err) {
        console.error('err:', err)
        err.status = err.status || 'error'
        err.statusCode = err.statusCode || 500
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        })
    }
}
