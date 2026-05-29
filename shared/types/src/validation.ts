export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_SPECIAL_CHARS = '@$!?*%&';
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!?*%&])[A-Za-z\d@$!?*%&]*$/;
export const PASSWORD_ERROR_MESSAGE = `Password must be at least ${PASSWORD_MIN_LENGTH} characters and include an uppercase letter, a lowercase letter, a number, and a special character (${PASSWORD_SPECIAL_CHARS}).`;
