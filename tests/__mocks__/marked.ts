// Mock for marked module to avoid ESM issues in Jest
export const marked = {
  parse: jest.fn((markdown: string) => `<p>${markdown}</p>`),
  setOptions: jest.fn(),
  use: jest.fn(),
};

export default marked;
