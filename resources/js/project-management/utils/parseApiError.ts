/**
 * Parse error response from the API into a user-friendly message.
 * Handles Laravel 422 validation errors and generic error responses.
 */
export async function parseApiError(response: Response, fallback = 'Something went wrong.'): Promise<string> {
    try {
        const data = await response.json();
        if (data?.errors && typeof data.errors === 'object') {
            return Object.values(data.errors).flat().join(' ');
        }
        if (data?.message && typeof data.message === 'string') {
            return data.message;
        }
        if (data?.error && typeof data.error === 'string') {
            return data.error;
        }
    } catch {
        // Response wasn't JSON
    }
    return fallback;
}
