import * as Joi from "joi";

export const envValidationSchema = Joi.object({
	// Security
	JWT_ACCESS_SECRET: Joi.string().min(32).required(),
	JWT_REFRESH_SECRET: Joi.string().min(32).required(),
	INTERNAL_SERVICE_SECRET: Joi.string().required(),

	// Cors
	FRONTEND_URL: Joi.string().uri().required(),

	// Server
	PORT: Joi.number().default(3000),
	NODE_ENV: Joi.string()
		.valid("development", "production", "test")
		.default("development"),

	// Redis
	REDIS_HOST: Joi.string().required(),
	REDIS_PORT: Joi.number().default(6379),
});
