import { HttpError } from 'http-errors';

export const errorHandlerMiddleware = () => {
  return {
    onError: (handler: { error: Error | null; response: Record<string, number | string> }) => {
      const error = handler.error as unknown as HttpError;

      if (!error) return;
      // Log the error for debugging
      console.error('Handling error:', error);

      // Determine the response based on the error type
      let statusCode;
      let message;

      if (error.statusCode < 500) {
        // Handle HTTP error (e.g., using `http-errors` library)
        statusCode = error.statusCode;
        message = error.message;
      } else {
        // Generic server error
        statusCode = 500;
        message = 'Internal Server Error';
      }

      // Set the response
      handler.response = {
        statusCode,
        body: JSON.stringify({
          error: true,
          message,
          ...(process.env.NODE_ENV === 'development' && { stack: error.stack }), // Optionally include stack trace in development
        }),
      };
    },
  };
};
