import '@testing-library/jest-dom'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: () => '1b9c6e4e-4e4e-4e4e-4e4e-4e4e4e4e4e4e',
  },
})