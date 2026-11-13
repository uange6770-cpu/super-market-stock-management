export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map(issue => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return res.status(400).json({
        error: details[0]?.message || 'Invalid request data',
        details,
      });
    }

    req.validated ??= {};
    req.validated[source] = result.data;
    next();
  };
}
