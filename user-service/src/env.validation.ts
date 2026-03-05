import * as Joi from "joi";

export const envValidationSchema = Joi.object({
	// Security
	JWT_ACCESS_SECRET: Joi.string().min(32).required(),
	JWT_REFRESH_SECRET: Joi.string().min(32).required(),

	// Database
	DATABASE_URL: Joi.string().required(),

	// Server
	PORT: Joi.number().default(3001),
	NODE_ENV: Joi.string()
		.valid("development", "production", "test")
		.default("development"),
});
