import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';
import { ApiError } from '../errorHandling';

/**
 * Validation middleware factory that validates request data against a Zod schema
 * @param schema The Zod schema to validate against
 * @param source Where to find the data to validate (body, query, params)
 */
export const validate = (schema: AnyZodObject, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get the data to validate from the appropriate source
      const data = source === 'body' ? req.body : 
                   source === 'query' ? req.query : req.params;
      
      // Validate the data against the schema
      const validationResult = schema.safeParse(data);
      
      if (!validationResult.success) {
        // Extract validation errors
        const errorDetails = validationResult.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }));
        
        // Create a structured API error
        return next(ApiError.validationError(
          'Validation failed', 
          { source, errors: errorDetails }
        ));
      }
      
      // If validation succeeds, update the request data with the validated data
      if (source === 'body') {
        req.body = validationResult.data;
      } else if (source === 'query') {
        req.query = validationResult.data;
      } else {
        req.params = validationResult.data;
      }
      
      return next();
    } catch (error) {
      return next(ApiError.internal('Validation middleware error', { error }));
    }
  };
};