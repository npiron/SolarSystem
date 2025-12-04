# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

We take the security of Neo Survivors Idle seriously. If you discover a security vulnerability, please follow these steps:

### How to Report

1. **DO NOT** open a public issue for security vulnerabilities
2. Instead, report security issues via:
   - **GitHub Security Advisories**: Use the "Security" tab → "Report a vulnerability"
   - **Email**: Contact the repository maintainers directly through GitHub

### What to Include

Please include as much of the following information as possible:

- **Type of vulnerability** (e.g., XSS, code injection, etc.)
- **Affected component(s)** (file paths, function names)
- **Steps to reproduce** the vulnerability
- **Proof of concept** or exploit code (if possible)
- **Impact** of the vulnerability
- **Suggested fix** (if you have one)

### Response Timeline

- **Acknowledgment**: Within 48 hours of report submission
- **Initial assessment**: Within 7 days
- **Fix timeline**: Varies based on severity
  - **Critical**: Patch within 7 days
  - **High**: Patch within 30 days
  - **Medium/Low**: Addressed in next release

## Security Considerations

This is a client-side browser game with the following security characteristics:

### Data Storage

- All game data is stored in browser `localStorage`
- No sensitive personal information is collected or stored
- No authentication or user accounts
- No server-side components or APIs

### Known Security Scope

Since this is a single-player client-side game:

- **Save data tampering** is possible and expected (localStorage is user-accessible)
- **Cheating** is possible and doesn't affect other users
- **No multiplayer** or server communication means limited attack surface

### Vulnerabilities We Care About

Please report vulnerabilities that could:

1. **Execute arbitrary code** in the user's browser beyond the game scope
2. **Access data** outside the game's localStorage scope
3. **Perform XSS attacks** that could affect the user's browsing
4. **Exploit dependency vulnerabilities** in development or build tools

### Out of Scope

The following are explicitly **not** security concerns for this project:

- Modifying localStorage to cheat in the single-player game
- Using browser developer tools to manipulate game state
- Reverse engineering the game mechanics
- Creating save file editors or trainers

## Security Updates

- Security patches are released as soon as possible after verification
- Critical security updates may result in emergency releases outside the normal schedule
- All security fixes will be documented in the [CHANGELOG](CHANGELOG.md)

## Dependencies

We monitor dependencies for known vulnerabilities:

- **Dependabot** is configured for weekly checks (see `.github/dependabot.yml`)
- Run `npm audit` to check for vulnerabilities in dependencies
- Review the [GitHub Security tab](../../security) for automated alerts

## Best Practices for Contributors

If you're contributing code:

1. **Sanitize user input** if adding any input fields
2. **Avoid `eval()` or similar** dynamic code execution
3. **Use Content Security Policy** appropriate headers if modifying HTML
4. **Review dependency updates** for known vulnerabilities
5. **Keep dependencies up to date** when possible
6. **Test localStorage operations** for proper sanitization

## Questions?

If you have questions about security but haven't found a vulnerability, feel free to:

- Open a regular issue with the `security` label
- Check existing issues for similar questions
- Refer to our [Contributing Guidelines](CONTRIBUTING.md)

## Acknowledgments

We appreciate responsible disclosure and will acknowledge security researchers who report vulnerabilities according to this policy.
