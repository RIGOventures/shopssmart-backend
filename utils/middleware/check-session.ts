/* test if Session is available and authenticated */
export default function isAuthenticated (req, res, next) {
    // check Session is available
    if (!req.session) {
        throw new Error("Session is not authenticated")
    }

    // check Session is valid
    if (!req.session.userId) {
        throw new Error("Session is invalid")
    }
        
    return next()
}