import { binApi, driverApi, userApi } from "./api";

export const adminApi = {
  getAllUsers: () => userApi.getAll(),
  getCurrentUser: () => userApi.getCurrent(),
  updateCurrentUser: (payload) => userApi.updateCurrent(payload),
  deleteCurrentUser: () => userApi.deleteCurrent(),
  getAllBins: () => binApi.getAll(),
  createBin: (payload) => binApi.create(payload),
  getBinById: (binId) => binApi.getById(binId),
  deleteBinById: (binId) => binApi.deleteById(binId),
  getAllDrivers: () => driverApi.getAll(),
  getDriverById: (driverId) => driverApi.getById(driverId),
};

export default adminApi;
