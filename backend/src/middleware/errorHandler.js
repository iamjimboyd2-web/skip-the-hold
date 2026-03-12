export function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

export function errorHandler(error, _req, res, _next) {
  console.error(error);

  let status = error.status || 500;
  let message = error.message || "Internal server error.";

  if (error.name === "ZodError") {
    status = 400;
    message = error.issues?.[0]?.message || "Invalid request payload.";
  }

  if (error.code === "P2002") {
    status = 409;
    message = "That record already exists.";
  }

  if (error.code === "P2025") {
    status = 404;
    message = "The requested record could not be found.";
  }

  res.status(status).json({ error: message });
}
