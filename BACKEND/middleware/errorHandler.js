import httpError from "../utils/httpError.js";

export const notFound = (req, res, next) =>
  next(httpError(404, `Route not found: ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || "Server error";
  let errors;

  if (err.name === "ValidationError") {
    status = 400;
    message = "Validation failed";
    errors = Object.fromEntries(
      Object.entries(err.errors).map(([k, v]) => [k, v.message])
    );
  } else if (err.code === 11000) {
    status = 409;
    message = `Duplicate value for: ${Object.keys(err.keyPattern || {}).join(", ")}`;
  } else if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  if (status === 500) console.error(err);

  res.status(status).json({
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV !== "production" && status === 500 && { stack: err.stack }),
  });
};
