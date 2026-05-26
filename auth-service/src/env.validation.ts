import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_EMAIL_SECRET: Joi.string().min(32).required(),
  JWT_PASSWORD_RESET_SECRET: Joi.string().min(32).required(),

  EMAIL_USER: Joi.string().email().required(),
  EMAIL_PASS: Joi.string().required(),

  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().port().default(587).required(),

  GOOGLE_CLIENT_SECRET: Joi.string().required(),
  GOOGLE_CLIENT_ID: Joi.string().required(),

  PUBLIC_URL: Joi.string().uri().required(),
  FRONTEND_URL: Joi.string().uri().required(),

  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  AUTH_SERVICE_PORT: Joi.number().default(3002),
});
