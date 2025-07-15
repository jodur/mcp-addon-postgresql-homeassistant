# Security Implementation - AppArmor Profile

## Overview

This addon implements a custom AppArmor security profile to enhance container security beyond the default Docker constraints. The AppArmor profile provides a second line of defense against malicious API calls, malformed settings, and system hijacking attempts.

## Security Benefits

### 1. Enhanced Security Rating
- **Before**: 5/6 (baseline)
- **After**: 6/6 (maximum with AppArmor)
- **Improvement**: +1 point for custom AppArmor profile

### 2. Defense in Depth
- **Primary Defense**: Input validation and authentication in application code
- **Secondary Defense**: AppArmor restrictions at kernel level
- **Tertiary Defense**: Docker container isolation

### 3. Resource Access Control
- **File System**: Restricted to only necessary directories and files
- **Network**: Limited to PostgreSQL and Home Assistant API communication
- **Process**: Minimal required capabilities and signal handling
- **System**: Limited access to proc and sys filesystems

## AppArmor Profile Structure

### Main Profile: `postgresql-mcp-server`
- Controls the main container environment
- Manages S6-Overlay initialization
- Restricts file system access to addon directories
- Handles signal management and process control
- Transitions to Node.js-specific profile for application execution

### Sub-Profile: `nodejs_app`
- Specialized profile for Node.js application
- Focused on runtime requirements
- Network access for database and API communication
- Read-only access to application files
- Write access only to data and temporary directories

## Key Security Restrictions

### File System Access
```
✅ Allowed:
- /app/** (application files - read/write)
- /data/** (persistent data - read/write)
- /share/** (shared volumes - read/write)
- /ssl/** (SSL certificates - read only)
- /config/** (configuration - read only)
- /tmp/** (temporary files - read/write)

❌ Denied:
- Root filesystem write access
- System directories modification
- Other container access
```

### Network Access
```
✅ Allowed:
- PostgreSQL database connections (inet/inet6 stream)
- Home Assistant API calls (inet/inet6 stream)
- DNS resolution (inet/inet6 dgram)
- Unix socket communication

❌ Denied:
- Raw socket access
- Network administration
- Packet capture capabilities
```

### Process Capabilities
```
✅ Allowed:
- Basic process execution
- Signal handling (kill, term, int, hup, cont)
- Network binding to service ports
- File ownership changes within allowed directories

❌ Denied:
- System administration capabilities
- Kernel module loading
- Raw device access
- Process debugging/tracing
```

## Implementation Details

### Profile Location
The AppArmor profile is located at:
```
postgresql-mcp-server/apparmor.txt
```

### Profile Activation
The profile is automatically activated when the addon is installed on a Home Assistant system with AppArmor support.

### Development and Testing
For development purposes, you can:

1. **Enable complain mode** (for development):
   ```
   profile postgresql-mcp-server flags=(attach_disconnected,mediate_deleted,complain)
   ```

2. **Monitor audit logs**:
   ```bash
   journalctl _TRANSPORT="audit" -g 'apparmor="ALLOWED"'
   ```

3. **Remove complain flag** for production deployment

## Security Validation

### What's Protected
- **Database Access**: Only allowed through authenticated connections
- **File System**: Restricted to addon-specific directories
- **Network**: Limited to required services (PostgreSQL, Home Assistant)
- **Process Control**: Minimal required capabilities

### What's Monitored
- **File Access**: All file operations are controlled and logged
- **Network Connections**: Only whitelisted network access allowed
- **Process Execution**: Limited to required binaries and scripts
- **Signal Handling**: Controlled inter-process communication

## Maintenance

### Updating the Profile
When updating the addon or adding new functionality:

1. Test with `complain` flag enabled
2. Monitor audit logs for new required access
3. Update profile with minimal required permissions
4. Remove `complain` flag for production
5. Test thoroughly before release

### Common Issues
If the addon fails to start after AppArmor implementation:

1. Check system logs for AppArmor denials
2. Verify all required paths are included
3. Ensure proper signal handling permissions
4. Test with complain mode temporarily

## Security Rating Impact

The implementation of this custom AppArmor profile improves the addon's security rating from 5/6 to 6/6, providing users with maximum confidence in the addon's security posture.

This places the addon in the highest security tier for Home Assistant addons, demonstrating a commitment to security best practices and user safety.
