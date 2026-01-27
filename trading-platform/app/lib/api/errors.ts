/**
 * API Error Classes
 * Used for standardized error handling across API clients
 */

export class APIError extends Error {
    code: string;

    constructor(message: string, code: string = 'API_ERROR') {
        super(message);
        this.name = 'APIError';
        this.code = code;
    }
}

export class NetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NetworkError';
    }
}

export class RateLimitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'RateLimitError';
    }
}
