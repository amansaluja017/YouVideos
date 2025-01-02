const asyncHandler1 = (requestHandler1) => async (req, res, next) => {
    try {
        await requestHandler1(req, res, next)
    }catch(err) {
        res.status(err.code || 500).json({
            success: false,
            message: 'Internal Server'
        })
    }
}

export {asyncHandler1}