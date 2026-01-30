import { isAuthenticated, isAdmin } from '../auth';

export { isAuthenticated, isAdmin };

// Backwards-compatible shim: some routes import from ../middleware/auth
// This file re-exports the real implementations from ../auth
