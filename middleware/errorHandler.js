// Centralized error handling middleware for Express
const errorHandler = (err, req, res, next) => {
  // Set default status code
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  
  // Prepare error response structure
  const response = {
    message: err.message || 'Internal Server Error',
  };

  // Include stack trace only in development for easier debugging
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  // Handle specific Mongoose errors or others here if needed
  if (err.name === 'ValidationError') {
    statusCode = 400;
    response.message = Object.values(err.errors).map(e => e.message).join(', ');
  } else if (err.name === 'CastError') {
    statusCode = 400;
    response.message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    statusCode = 400;
    response.message = `Duplicate field value entered: ${JSON.stringify(err.keyValue)}`;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
