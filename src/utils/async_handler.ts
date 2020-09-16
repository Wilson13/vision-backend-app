const asyncHandler = (fn) => (req, res, next): Promise<Function> =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    next(err);
  });

export default asyncHandler;
