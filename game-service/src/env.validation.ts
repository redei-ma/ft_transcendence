import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),

  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
});

