# Contributing to Vibemate

Thank you for your interest in contributing to Vibemate! This document provides guidelines and information for contributors.

## How to Contribute

### 1. Fork the Repository

```bash
git clone https://github.com/rahlplx/vibemate.git
cd vibemate
npm install
```

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 3. Make Your Changes

- Follow the existing code style
- Write tests for new features
- Ensure all tests pass

### 4. Run Tests

```bash
npm test
npm run typecheck
npm run build
```

### 5. Commit Your Changes

```bash
git commit -m "feat: add your feature description"
```

### 6. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 7. Create a Pull Request

- Provide a clear description of your changes
- Reference any related issues
- Ensure all checks pass

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Installation

```bash
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Type Checking

```bash
npm run typecheck
```

### Building

```bash
npm run build
```

## Code Style

- Use TypeScript strict mode
- Follow existing patterns
- Write self-documenting code
- Use Zod schemas for validation

## Pull Request Guidelines

- Keep PRs focused on a single change
- Write clear commit messages
- Include tests for new features
- Update documentation if needed
- Ensure all checks pass

## Reporting Issues

- Use GitHub Issues
- Provide reproduction steps
- Include error messages
- Specify your environment

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
