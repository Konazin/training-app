module.exports = {
  SaveFormat: { JPEG: 'jpeg' },
  manipulateAsync: jest.fn(async () => ({ uri: 'file://meal-small.jpg', width: 1600, height: 1200, base64: 'aGVsbG8=' })),
}
