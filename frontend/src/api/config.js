export const getBackendUrl = () => {
    // If VITE_BACKEND_URL env is provided, use it
    if (import.meta.env.VITE_BACKEND_URL) {
        return import.meta.env.VITE_BACKEND_URL;
    }
    
    // Auto-detect if we are running locally or in production
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' || 
                        window.location.hostname.startsWith('192.168.');
                        
    // Fallback if VITE_API_URL exists (only if not pointing to localhost in production)
    if (import.meta.env.VITE_API_URL) {
        const apiVal = import.meta.env.VITE_API_URL;
        const isApiLocalhost = apiVal.includes('localhost') || apiVal.includes('127.0.0.1');
        if (isLocalhost || !isApiLocalhost) {
            return apiVal.replace('/api', '');
        }
    }

    return isLocalhost 
        ? 'http://localhost:5000' 
        : window.location.origin;
};

export const getApiUrl = () => {
    const isLocalhost = window.location.hostname === 'localhost' || 
                        window.location.hostname === '127.0.0.1' || 
                        window.location.hostname.startsWith('192.168.');

    if (import.meta.env.VITE_API_URL) {
        const apiVal = import.meta.env.VITE_API_URL;
        const isApiLocalhost = apiVal.includes('localhost') || apiVal.includes('127.0.0.1');
        if (isLocalhost || !isApiLocalhost) {
            return apiVal;
        }
    }
    return `${getBackendUrl()}/api`;
};
