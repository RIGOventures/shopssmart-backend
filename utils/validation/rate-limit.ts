// Rate limit utility
const { rateLimit } = require("@/database/rate-limit");

// Rate limit by middleware
const rateLimitValidation = async (req, res, next) => {
    // Get header
    const headersList = req.headers
    // Get user ip
    const userIP =
        headersList['x-forwarded-for'] || headersList['cf-connecting-ip'] || req.socket.remoteAddress || '';

    // Apply rate limit middleware
    const rateLimitResult = await rateLimit(userIP);
    if (rateLimitResult) {
        // TODO: Enable in production
        // res.status(420).json({
        //     type: 'error',
        //     resultCode: ResultCode.RateLimited
        // });
        // return
    }

    return next()
}

module.exports = rateLimitValidation;