/**
 * OneDrive drive endpoint helper
 *
 * Provides a fallback from me/drive to users/{upn}/drive for
 * OneDrive for Business users whose personal drive isn't at me/drive.
 */
const { callGraphAPI } = require('../utils/graph-api');

// Cache the UPN so we only fetch it once per process lifetime
let cachedUpn = null;

/**
 * Fetch the current user's userPrincipalName from the Graph API
 * @param {string} accessToken
 * @returns {Promise<string>} - The user's UPN
 */
async function getUserUpn(accessToken) {
  if (cachedUpn) return cachedUpn;

  const profile = await callGraphAPI(accessToken, 'GET', 'me', null, {
    $select: 'userPrincipalName'
  });
  cachedUpn = profile.userPrincipalName;
  return cachedUpn;
}

/**
 * Replace me/drive with users/{upn}/drive in an endpoint string
 * @param {string} endpoint - Original endpoint using me/drive
 * @param {string} upn - User principal name
 * @returns {string} - Endpoint using users/{upn}/drive
 */
function toUserDriveEndpoint(endpoint, upn) {
  return endpoint.replace('me/drive', `users/${upn}/drive`);
}

module.exports = {
  getUserUpn,
  toUserDriveEndpoint
};
