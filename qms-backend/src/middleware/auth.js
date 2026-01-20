import jwt from 'jsonwebtoken';
import 'dotenv/config';

/**
 * Middleware to verify JWT token
 * Extracts user info and adds it to req.user
 */
export const authenticateToken = (req, res, next) => {
  // Get token from Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ 
      error: 'Access denied',
      message: 'No authentication token provided' 
    });
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'Token expired',
          message: 'Please log in again' 
        });
      }
      return res.status(403).json({ 
        error: 'Invalid token',
        message: 'Authentication failed' 
      });
    }
    
    // Add user info to request object
    req.user = decoded;
    next();
  });
};

/**
 * Middleware to check if user has required role(s)
 * Usage: requireRole('admin') or requireRole('admin', 'engineer')
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        message: 'Please log in first' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: `This action requires one of these roles: ${allowedRoles.join(', ')}`,
        yourRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Tier feature definitions
 */
export const TIER_FEATURES = {
  free: {
    maxPartTypes: 5,
    maxInspectionsPerMonth: 50,
    maxUsers: 2,
    features: ['basic_inspection', 'basic_reports']
  },
  basic: {
    maxPartTypes: 25,
    maxInspectionsPerMonth: 500,
    maxUsers: 10,
    features: ['basic_inspection', 'basic_reports', 'pdf_export', 'gage_management']
  },
  professional: {
    maxPartTypes: 100,
    maxInspectionsPerMonth: 5000,
    maxUsers: 50,
    features: ['basic_inspection', 'basic_reports', 'pdf_export', 'gage_management', 'warranty', 'advanced_reports', 'audit_log']
  },
  enterprise: {
    maxPartTypes: -1, // unlimited
    maxInspectionsPerMonth: -1,
    maxUsers: -1,
    features: ['basic_inspection', 'basic_reports', 'pdf_export', 'gage_management', 'warranty', 'advanced_reports', 'audit_log', 'api_access', 'custom_integrations', 'priority_support']
  }
};

/**
 * Middleware to check if user's tier allows a specific feature
 * Usage: requireFeature('warranty')
 */
export const requireFeature = (feature) => {
  return (req, res, next) => {
    const userTier = req.user?.tier || 'free';
    const tierConfig = TIER_FEATURES[userTier];

    if (!tierConfig) {
      return res.status(403).json({ 
        error: 'Invalid tier',
        message: 'Your account tier is not recognized' 
      });
    }

    if (!tierConfig.features.includes(feature)) {
      // Find which tier has this feature
      const requiredTier = Object.entries(TIER_FEATURES).find(
        ([_, config]) => config.features.includes(feature)
      )?.[0];

      return res.status(403).json({ 
        error: 'Feature not available',
        message: `The "${feature}" feature is not included in your ${userTier} plan`,
        requiredTier: requiredTier,
        upgradeRequired: true
      });
    }

    next();
  };
};

/**
 * Get tier limits for the current user
 */
export const getTierLimits = (req, res, next) => {
  const userTier = req.user?.tier || 'free';
  req.tierLimits = TIER_FEATURES[userTier];
  next();
};
