import { NextFunction, Request, Response } from "express";
import envVars from "../utils/environment";

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (err) {
        if (envVars.isDev()) {
            console.error('err:', err)
        }

        err.status = err.status || 'error'
        err.statusCode = err.statusCode || 500
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        })
    }
}
