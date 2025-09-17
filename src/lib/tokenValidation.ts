import { toast } from 'react-hot-toast';

/**
 * Client-side token validation utilities
 */

export interface TokenValidationResult {
  isValid: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Validate the current token with the server
 */
export async function validateCurrentToken(): Promise<TokenValidationResult> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return {
        isValid: false,
        error: 'No token found',
        errorCode: 'NO_TOKEN'
      };
    }

    const response = await fetch('/api/users/validate-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ token })
    });

    if (response.ok) {
      return { isValid: true };
    } else if (response.status === 401) {
      const errorData = await response.json();
      return {
        isValid: false,
        error: errorData.error,
        errorCode: errorData.errorCode
      };
    } else {
      return {
        isValid: false,
        error: 'Token validation failed',
        errorCode: 'VALIDATION_ERROR'
      };
    }
  } catch (error) {
    console.error('Token validation error:', error);
    return {
      isValid: false,
      error: 'Network error during validation',
      errorCode: 'NETWORK_ERROR'
    };
  }
}

/**
 * Handle token validation failure
 */
export function handleTokenValidationFailure(result: TokenValidationResult, redirectToLogin: () => void) {
  if (!result.isValid) {
    // Clear local storage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    if (result.errorCode === 'TOKEN_REVOKED_NEW_LOGIN') {
      toast.error('You have been logged out because you logged in from another device.', {
        duration: 5000,
        style: {
          background: '#fee2e2',
          color: '#dc2626',
          border: '1px solid #fecaca'
        }
      });
    } else if (result.errorCode === 'TOKEN_BLACKLISTED') {
      toast.error('Your session has expired. Please log in again.', {
        duration: 4000,
        style: {
          background: '#fef3c7',
          color: '#d97706',
          border: '1px solid #fde68a'
        }
      });
    } else if (result.errorCode === 'INVALID_TOKEN') {
      toast.error('Your session has expired. Please log in again.', {
        duration: 4000,
        style: {
          background: '#fef3c7',
          color: '#d97706',
          border: '1px solid #fde68a'
        }
      });
    } else {
      toast.error('Session validation failed. Please log in again.', {
        duration: 4000,
        style: {
          background: '#fef3c7',
          color: '#d97706',
          border: '1px solid #fde68a'
        }
      });
    }
    
    redirectToLogin();
  }
}

/**
 * Set up periodic token validation
 */
export function setupPeriodicTokenValidation(redirectToLogin: () => void, intervalMs: number = 10000) {
  // Immediate reactive listener for cross-tab/device signal
  const storageListener = async (e: StorageEvent) => {
    if (e.key === 'tokenRevokedAt' && e.newValue && e.newValue !== e.oldValue) {
      const result = await validateCurrentToken();
      if (!result.isValid) {
        handleTokenValidationFailure(result, redirectToLogin);
      }
    }
  };
  try {
    window.addEventListener('storage', storageListener);
  } catch {}

  const validateInterval = setInterval(async () => {
    const result = await validateCurrentToken();
    if (!result.isValid) {
      // Only clear localStorage and redirect for specific error codes
      // Don't redirect for network errors or temporary issues
      if (result.errorCode === 'TOKEN_REVOKED_NEW_LOGIN' || 
          result.errorCode === 'TOKEN_BLACKLISTED' || 
          result.errorCode === 'INVALID_TOKEN') {
        clearInterval(validateInterval);
        try { window.removeEventListener('storage', storageListener); } catch {}
        handleTokenValidationFailure(result, redirectToLogin);
      } else {
        // For network errors or other temporary issues, just log and continue
        console.log('Token validation failed temporarily:', result.error);
      }
    }
  }, intervalMs);

  return validateInterval;
}

/**
 * Enhanced fetch function that includes token validation
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token');
  
  const enhancedOptions: RequestInit = {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': token ? `Bearer ${token}` : '',
    }
  };

  const response = await fetch(url, enhancedOptions);
  
  // If we get a 401, validate the token to get specific error info
  if (response.status === 401) {
    const validationResult = await validateCurrentToken();
    if (!validationResult.isValid && validationResult.errorCode === 'TOKEN_REVOKED_NEW_LOGIN') {
      // Create a custom response with the error details
      const errorResponse = new Response(JSON.stringify({
        error: validationResult.error,
        errorCode: validationResult.errorCode
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
      return errorResponse;
    }
  }
  
  return response;
}
