export function validate(schema, property = "body") {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { abortEarly: true, stripUnknown: true });
    if (error) {
      console.warn(`[validate] Joi error on ${req.method} ${req.path}:`, error.details[0].message, "| field:", error.details[0].context?.key);
      return next(error);
    }
    req[property] = value;
    next();
  };
}
