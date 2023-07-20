import { z } from "zod";
import { MAX_RATING_VALUE } from "../../models/mood-rating";


export type SchemaInterface<Schema extends Zod.ZodEffects<Zod.ZodObject<any, any, any, any, any>> | Zod.ZodObject<any, any, any, any, any>> = z.infer<Schema>

/**
 * @todo
 * - query parsing
 * - param parsing
 */

/**
 * @route /login
 * @method POST
 */
export const loginSchema = z.object({
    // body: z.object({
    email: z.string().email('Not a valid email'),
    password: z.string().min(6)
    // })
})

/**
 * @route /users
 * @method POST
 */
export const registerSchema = z.object({
    // body: z.object({
    email: z.string().email('Not a valid email'),
    password: z.string().min(6),
    passwordConfirmation: z.string().min(6)
    // })
}).superRefine(({ password, passwordConfirmation }, ctx) => {
    // const { } = body
    if (password !== passwordConfirmation) {
        ctx.addIssue({
            code: 'custom',
            message: 'Passwords did not match'
        })
    }
})

/**
 * @route /me
 * @method PUT
 */
export const updateMeSchema = z.object({
    // body: z.object({
    oldPassword: z.string().min(6).optional(),
    newPassword: z.string().min(6).optional(),
    newPasswordConfirmation: z.string().min(6).optional()
    // })
}).superRefine(({ oldPassword, newPassword, newPasswordConfirmation }, ctx) => {
    const issues: z.IssueData[] = []
    // const { oldPassword, newPassword, newPasswordConfirmation } = body

    if (oldPassword) {
        if (!newPassword || !newPasswordConfirmation) {
            issues.push({ code: 'custom', message: 'Missing new replacement password' })
        }
        if (newPassword !== newPasswordConfirmation) {
            issues.push({ code: 'custom', message: 'New password confirmation does not match' })
        }
    } else if (newPassword && newPasswordConfirmation) {
        issues.push({ code: 'custom', message: 'Old password is required to select a new one' })
    }

    for (const issue of issues) {
        ctx.addIssue(issue)
    }
})

export const postRatingSchema = z.object({
    value: z.number().min(0).max(MAX_RATING_VALUE),
})