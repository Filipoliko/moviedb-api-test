import frisby from 'frisby';
import { apiUrl, username, password, readAccessToken } from '../config';

/**
 * This class provides authorization methods for TMDB API
 */
export default class Auth {
    /**
     * Configurates Authorization header with read access token
     */
    static setReadAccess() {
        frisby.globalSetup({
            request: {
                headers: {
                    'Authorization': `Bearer ${readAccessToken}`
                }
            }
        });
    }

    /**
     * Configurates Authorization header with write access token.
     * 
     * It does following steps to get the token:
     *  - login to TMDB website to get authorized session cookie
     *  - generate request token
     *  - approve the generated token using the authorized session cookie
     *  - generate the write access token
     * The token is then set as default Authorization header in frisbe configuration
     * @returns {Promise}
     */
    static async setWriteAccess() {
        const cookie = await this._getAuthorizedCookie();
        const requestToken = await this._getRequestToken();

        await this._approveRequestToken(requestToken, cookie);

        const writeAccessToken = await this._getWriteAccessToken(requestToken);

        frisby.globalSetup({
            request: {
                headers: {
                    'Authorization': `Bearer ${writeAccessToken}`
                }
            }
        });
    }

    /**
     * Generates an authorized session cookie.
     * This can be used to approve API request_token without any manual action.
     * 
     * Following steps are performed:
     *  - get an unauthorized cookie from tmdb website (neccessary for login request to work properly)
     *  - send login request to generate authorized cookie
     * @returns {Promise<String>} authorized session cookie
     */
    static async _getAuthorizedCookie() {
        const cookie = await this._getUnauthorizedCookie();
        const response = await frisby.fetch('https://www.themoviedb.org/login', {
            redirect: 'manual', // Do not follow redirects!
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                cookie
            },
            body: `username=${username}&password=${password}`,
            method: 'POST'
        });
        
        return this._getTmdbSessionCookieFromResponse(response);
    }

    /**
     * Generates an unauthorized session cookie.
     * @returns {Promise<String>} unauthorized session cookie
     */
    static async _getUnauthorizedCookie() {
        const response = await frisby.get('https://www.themoviedb.org/login');

        return this._getTmdbSessionCookieFromResponse(response);
    }

    /**
     * Extracts `tmdb.session` cookie from `set-cookie` header
     * @param {frisby.FrisbyResponse} response
     * @returns {String} `tmdb.session` cookie
     */
    static _getTmdbSessionCookieFromResponse(response) {
        return response.headers.raw()['set-cookie'].find(c => c.startsWith('tmdb.session'));
    }

    /**
     * Generates TMDB API auth request token
     * @returns {Promise<String>} request token
     */
    static async _getRequestToken() {
        const response = await frisby.post(`${apiUrl}/auth/request_token`);

        return response.json.request_token;
    }

    /**
     * Approves provided request token using the provided authorized cookie
     * @param {String} token request token
     * @param {String} cookie authorized cookie
     * @returns {Promise<frisby.FrisbyResponse>}
     */
    static _approveRequestToken(token, cookie) {
        return frisby.fetch('https://www.themoviedb.org/auth/access/approve', {
            headers: {
              'content-type': 'application/x-www-form-urlencoded',
              cookie
            },
            body: `request_token=${token}&time=${Date.now() / 1000}&submit=Approve`,
            method: 'POST'
        });
    }

    /**
     * Generates write access token for the approved request token
     * @param {String} requestToken approved request token
     * @returns {Promise<String>} write access token
     */
    static async _getWriteAccessToken(requestToken) {
        const response = await frisby.post(`${apiUrl}/auth/access_token`, {
            request_token: requestToken
        });

        return response.json.access_token;
    }
}
