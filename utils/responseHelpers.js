/**
 * Standard API response utilities
 */

/**
 * Sends success response
 * @param {Object} res - Express response object
 * @param {string} message - Success message
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 */
function sendSuccessResponse(res, message, data = null, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

/**
 * Sends error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {*} data - Error data (optional)
 * @param {number} statusCode - HTTP status code (default: 400)
 */
function sendErrorResponse(res, message, data = null, statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    message,
    data
  });
}

/**
 * Handles and sends error response based on error type
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {string} defaultMessage - Default error message
 * @param {*} data - Additional data to include
 */
function handleErrorResponse(res, error, defaultMessage = 'An error occurred', data = null) {
  console.error('Error:', error);

  // If it's an HTTP error with status
  if (error?.response?.status) {
    const errorData = error.response.data?.data || error.response.data || {};
    return sendErrorResponse(
      res,
      errorData.message || error.response.data?.message || defaultMessage,
      data,
      error.response.status
    );
  }

  // For validation errors
  if (error.name === 'ValidationError') {
    return sendErrorResponse(res, error.message, data, 400);
  }

  // For other known errors
  if (error.message) {
    return sendErrorResponse(res, error.message, data, 500);
  }

  // Fallback for unknown errors
  return sendErrorResponse(res, defaultMessage, data, 500);
}

module.exports = {
  sendSuccessResponse,
  sendErrorResponse,
  handleErrorResponse
};
