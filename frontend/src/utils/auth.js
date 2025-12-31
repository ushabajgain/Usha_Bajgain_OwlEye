/**
 * Auth storage helper — reads from whichever storage has the auth data.
 * Works with both Remember Me ON (localStorage) and OFF (sessionStorage).
 */
export const getAuthItem = (key) => {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
};

export const getToken = () => getAuthItem('token');
export const getRole = () => getAuthItem('role');
export const getUserId = () => getAuthItem('userId') || getAuthItem('user_id');
export const getFullName = () => getAuthItem('full_name') || 'Guest';
export const getEmail = () => getAuthItem('email');
export const getProfileImage = () => getAuthItem('profile_image');
export const getRefreshToken = () => getAuthItem('refresh_token');

export const isAuthenticated = () => !!getToken();

export const clearAuth = () => {
    localStorage.clear();
    sessionStorage.clear();
};
