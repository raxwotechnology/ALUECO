// Validates request body against a Zod schema
export const validate = (schema) => (req, res, next) => {
    try {
        const parsed = schema.parse(req.body);
        req.body = parsed; // replace with parsed (and sanitized) data
        next();
    } catch (error) {
        const messages = error.errors?.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
            || 'Validation failed';
        res.status(400);
        next(new Error(messages));
    }
};