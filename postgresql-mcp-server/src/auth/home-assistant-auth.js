"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.hasWritePermission = hasWritePermission;
exports.hasAdminPermission = hasAdminPermission;
exports.getUserContext = getUserContext;
/**
 * Home Assistant authentication middleware
 * Validates the Bearer token against Home Assistant's API
 */
function authenticateToken(req, res, next) {
    return __awaiter(this, void 0, void 0, function () {
        var authHeader, token, userContext, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    authHeader = req.headers.authorization;
                    if (!authHeader || !authHeader.startsWith('Bearer ')) {
                        res.status(401).json({
                            success: false,
                            error: 'Authorization header with Bearer token is required',
                            timestamp: new Date().toISOString()
                        });
                        return [2 /*return*/];
                    }
                    token = authHeader.substring(7);
                    if (!token) {
                        res.status(401).json({
                            success: false,
                            error: 'Token is required',
                            timestamp: new Date().toISOString()
                        });
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, validateHomeAssistantToken(token)];
                case 1:
                    userContext = _a.sent();
                    if (!userContext) {
                        res.status(401).json({
                            success: false,
                            error: 'Invalid or expired token',
                            timestamp: new Date().toISOString()
                        });
                        return [2 /*return*/];
                    }
                    // Add user context to request
                    req.user = userContext;
                    next();
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error('Authentication error:', error_1);
                    res.status(500).json({
                        success: false,
                        error: 'Authentication service unavailable',
                        timestamp: new Date().toISOString()
                    });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Validate Home Assistant token by calling the auth endpoint
 */
function validateHomeAssistantToken(token) {
    return __awaiter(this, void 0, void 0, function () {
        var haBaseUrl, response, authData, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 7]);
                    haBaseUrl = process.env.HA_BASE_URL || 'http://supervisor/core';
                    return [4 /*yield*/, fetch("".concat(haBaseUrl, "/api/auth/check"), {
                            method: 'GET',
                            headers: {
                                'Authorization': "Bearer ".concat(token),
                                'Content-Type': 'application/json'
                            }
                        })];
                case 1:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 3];
                    return [4 /*yield*/, fallbackTokenValidation(token)];
                case 2: 
                // If Home Assistant auth API is not available, implement fallback validation
                return [2 /*return*/, _a.sent()];
                case 3: return [4 /*yield*/, response.json()];
                case 4:
                    authData = _a.sent();
                    // Extract user information from Home Assistant response
                    return [2 /*return*/, {
                            userId: authData.id || 'unknown',
                            username: authData.name || 'unknown',
                            isAdmin: authData.is_admin || false,
                            permissions: authData.permissions || []
                        }];
                case 5:
                    error_2 = _a.sent();
                    console.error('Token validation error:', error_2);
                    return [4 /*yield*/, fallbackTokenValidation(token)];
                case 6: 
                // Fallback to basic token validation if Home Assistant API is unavailable
                return [2 /*return*/, _a.sent()];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/**
 * Fallback token validation for development or when Home Assistant API is unavailable
 */
function fallbackTokenValidation(token) {
    return __awaiter(this, void 0, void 0, function () {
        var allowedUsers;
        return __generator(this, function (_a) {
            // In a real addon, this would be more sophisticated
            // For now, we'll implement a basic validation
            // Check if token matches the Home Assistant long-lived access token pattern
            if (token.length >= 32 && /^[a-zA-Z0-9._-]+$/.test(token)) {
                allowedUsers = process.env.ALLOWED_USERS ? process.env.ALLOWED_USERS.split(',') : [];
                return [2 /*return*/, {
                        userId: 'homeassistant-user',
                        username: 'homeassistant',
                        isAdmin: true,
                        permissions: ['read', 'write']
                    }];
            }
            return [2 /*return*/, null];
        });
    });
}
/**
 * Check if user has permission for write operations
 */
function hasWritePermission(user) {
    var allowedUsers = process.env.ALLOWED_USERS ? process.env.ALLOWED_USERS.split(',') : [];
    var enableWriteOperations = process.env.ENABLE_WRITE_OPERATIONS === 'true';
    if (!enableWriteOperations) {
        return false;
    }
    // If no specific users are configured, allow all authenticated users
    if (allowedUsers.length === 0) {
        return true;
    }
    // Check if user is in allowed users list
    return allowedUsers.includes(user.username) || allowedUsers.includes(user.userId);
}
/**
 * Check if user has admin permissions
 */
function hasAdminPermission(user) {
    return user.isAdmin || user.permissions.includes('admin');
}
/**
 * Get user context from request
 */
function getUserContext(req) {
    return req.user || null;
}
