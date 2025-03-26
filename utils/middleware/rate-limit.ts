// Rate limit utility
import { rateLimitUser } from "@/database/rate-limit";

/* test if user is rate limited */
export default async function rateLimitValidation (req, res, next) {
    // get header
    const headersList = req.headers
    // get user ip
    const userIP =
        headersList['x-forwarded-for'] || headersList['cf-connecting-ip'] || req.socket.remoteAddress || '';

    // apply rate limit middleware
    const rateLimitResult = await rateLimitUser(userIP);
    if (rateLimitResult) {
        // TODO: enable in production
        /*
        res.status(420).json({
            type: 'error',
            resultCode: ResultCode.RateLimited
        });
        return
        */
    }

    return next()
}