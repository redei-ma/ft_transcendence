import * as Joi from "joi";

export const envValidationSchema = Joi.object({
	// Security
	JWT_ACCESS_SECRET: Joi.string().min(32).required(),
	JWT_REFRESH_SECRET: Joi.string().min(32).required(),

	// Database
	DATABASE_URL: Joi.string().required(),

	// Server
	USER_SERVICE_PORT: Joi.number().required(),
	NODE_ENV: Joi.string()
		.valid("development", "production", "test")
		.default("development"),
});
