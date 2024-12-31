const asyncHandler = (fn) => {
    async (req, res, next) => {
        try {
            await fn(req, res, next);
            return next();
        }catch (error) {
            res.status(error.status || 500).json({
                success: false,
                message: error.message
            })
        }
        next();
    }
}

export default asyncHandler;