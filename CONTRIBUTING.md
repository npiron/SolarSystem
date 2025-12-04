# Contributing to Neo Survivors Idle

Thank you for your interest in contributing to Neo Survivors Idle! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples** (code snippets, screenshots, etc.)
- **Describe the behavior you observed** and what you expected
- **Include browser information** and version
- **Note if the issue occurs in localStorage** or specific game states

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description** of the proposed feature
- **Explain why this enhancement would be useful**
- **List any similar features** in other games if applicable

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow the existing code style** - check `AGENTS.md` for project conventions
3. **Add tests** if you're adding functionality
4. **Update documentation** if you're changing APIs or user-facing features
5. **Ensure tests pass** by running `npm test`
6. **Run type checking** with `npm run typecheck`
7. **Build the project** with `npm run build` to verify no build errors
8. **Write clear commit messages** following conventional commits style when possible

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/SolarSystem.git
cd SolarSystem

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Type check
npm run typecheck

# Build for production
npm run build
```

## Project Structure

```
.
├── src/                    # Source code
│   ├── config/            # Game configuration and data tables
│   ├── systems/           # Game systems (combat, economy, progression)
│   ├── renderer/          # Rendering utilities
│   └── types/             # TypeScript type definitions
├── tests/                 # Test files (Vitest)
├── public/                # Static assets
└── index.html             # Entry point
```

## Coding Guidelines

### TypeScript/JavaScript

- Use **TypeScript** for new code
- Follow **ES modules** syntax
- Use **descriptive variable names**
- Prefer **early returns** over nested conditionals
- Keep functions **small and focused** (single responsibility)
- Avoid **any type** except as last resort
- Add **JSDoc comments** for complex functions

### File Organization

- **New balance/data tables** → `src/config/`
- **Gameplay/state updates** → `src/systems/`
- **Rendering utilities** → `src/renderer/`
- **Shared helpers/types** → `src/types/`
- **Keep files under 400 lines** - split larger files into focused modules

### Game Logic

- Keep the game **100% client-side** - no server dependencies
- Use **localStorage** for persistence (see `STORAGE_KEY` in `src/config/constants.ts`)
- Make systems **functional and deterministic** where possible
- Gate **side effects** behind explicit functions
- Push **DOM access** through `renderer` utilities

### Testing

- Add **Vitest tests** in `tests/` directory
- Test **edge cases** and boundary conditions
- Use **descriptive test names** that explain what is being tested
- Mock external dependencies when necessary

### Commits

- Write **clear commit messages**
- Use **present tense** ("Add feature" not "Added feature")
- Keep commits **focused on a single change**
- Reference **issue numbers** when applicable (#123)

## Testing Your Changes

Before submitting a pull request:

1. **Run all tests**: `npm test`
2. **Check types**: `npm run typecheck`
3. **Build the project**: `npm run build`
4. **Test manually**: `npm run dev` and verify your changes work
5. **Test localStorage**: Clear browser storage and verify save/load works
6. **Test performance**: Enable "Mode perfo" and verify no performance regression

## Getting Help

- Check the [Wiki](../../wiki) for game mechanics documentation
- Review existing [issues](../../issues) and [pull requests](../../pulls)
- Ask questions in your pull request or issue

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (Apache 2.0).
