import frisby from 'frisby';
import { apiUrl, username, password, readAccessToken } from '../config';

export default class Auth {
    static setReadAccess() {
        frisby.globalSetup({
            request: {
                headers: {
                    'Authorization': `Bearer ${readAccessToken}`
                }
            }
        });
    }

    static async setWriteAccess() {
        const cookie = await this.getAuthorizedCookie();
        const requestToken = await this.getRequestToken();

        await this.approveRequestToken(requestToken, cookie);

        const writeAccessToken = await this.getWriteAccessToken(requestToken);

        frisby.globalSetup({
            request: {
                headers: {
                    'Authorization': `Bearer ${writeAccessToken}`
                }
            }
        });
    }

    static async getAuthorizedCookie() {
        const cookie = await this.getUnauthanticatedCookie();
        const response = await frisby.fetch('https://www.themoviedb.org/login', {
            redirect: 'manual', // Do not follow redirects
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                cookie
            },
            body: `username=${username}&password=${password}`,
            method: 'POST'
        });
        
        return this.getTmdbSessionCookieFromResponse(response);
    }

    static async getUnauthanticatedCookie() {
        const response = await frisby.get('https://www.themoviedb.org/login');

        return this.getTmdbSessionCookieFromResponse(response);
    }

    static getTmdbSessionCookieFromResponse(response) {
        return response.headers.raw()['set-cookie'].find(c => c.startsWith('tmdb.session'));
    }

    static async getRequestToken() {
        const response = await frisby.post(`${apiUrl}/auth/request_token`);

        return response.json.request_token;
    }

    static approveRequestToken(token, cookie) {
        return frisby.fetch('https://www.themoviedb.org/auth/access/approve', {
            headers: {
              'content-type': 'application/x-www-form-urlencoded',
              cookie
            },
            body: `request_token=${token}&time=${Date.now() / 1000}&submit=Approve`,
            method: 'POST'
        });
    }

    static async getWriteAccessToken(requestToken) {
        const response = await frisby.post(`${apiUrl}/auth/access_token`, {
            request_token: requestToken
        });

        return response.json.access_token;
    }
}
