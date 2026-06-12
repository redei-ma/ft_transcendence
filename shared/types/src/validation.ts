export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_SPECIAL_CHARS = '@$!?*%&';
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!?*%&])[A-Za-z\d@$!?*%&]{10,}$/;
export const PASSWORD_ERROR_MESSAGE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include an uppercase letter, a lowercase letter, a number, and a special character (${PASSWORD_SPECIAL_CHARS}).`;

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_REGEX = /^[a-z0-9_]+$/;
export const USERNAME_ERROR_MESSAGE = 'Username can only contain lowercase letters, numbers, and underscores.';

export const RATE_LIMIT_ERROR_MESSAGE = 'Too many attempts. Please wait a moment and try again.';
