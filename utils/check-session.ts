// middleware to test if authenticated
function isAuthenticated (req, res, next) {
    if (req.session.userId) next()
    return new Error("Invalid session")
}

module.exports = isAuthenticated;