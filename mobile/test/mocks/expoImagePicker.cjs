module.exports = {
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: [] })),
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
}
