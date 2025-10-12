// Mock for gray-matter module
const matter = jest.fn((content: string) => ({
  data: {},
  content: content,
  excerpt: '',
  isEmpty: false,
}));

export default matter;
