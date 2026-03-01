import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/errors.js";

export function notFoundHandler(request: Request, response: Response) {
  response.status(404).json({
    message: `Route not found: ${request.method} ${request.originalUrl}`
  });
}

export function errorHandler(
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction
) {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  console.error(error);
  response.status(500).json({ message: "Internal server error" });
}
