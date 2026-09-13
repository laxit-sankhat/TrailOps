export const isPasswordValid = (password) => {
  return typeof password === 'string' && password.length >= 8;
};