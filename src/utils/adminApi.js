import { binApi, driverApi, routeApi, userApi } from "./api";

export const adminApi = {
  getAllUsers: () => userApi.getAll(),
  getCurrentUser: () => userApi.getCurrent(),
  updateCurrentUser: (payload) => userApi.updateCurrent(payload),
  deleteCurrentUser: () => userApi.deleteCurrent(),
  getAllBins: () => binApi.getAll(),
  getBinFillLevels: () => binApi.getFillLevels(),
  createBin: (payload) => binApi.create(payload),
  getBinById: (binId) => binApi.getById(binId),
  deleteBinById: (binId) => binApi.deleteById(binId),
  getAllDrivers: () => driverApi.getAll(),
  getDriverById: (driverId) => driverApi.getById(driverId),
  deleteDriverById: (driverId) => driverApi.deleteById(driverId),
  assignRoute: (payload) => routeApi.assignRoute(payload),
  createRoute: (payload) => routeApi.createRoute(payload),
  getAllRoutes: () => routeApi.getAllRoutes(),
  getRouteByDriver: (driverId) => routeApi.getRouteByDriver(driverId),
  getRouteById: (routeId) => routeApi.getRouteById(routeId),
  optimizeRoute: ({ driverId, lng, lat }) => routeApi.optimizeRoute({ driverId, lng, lat }),
  deleteRoute: (routeId) => routeApi.deleteRoute(routeId),
  getAssignedRoute: ({ driverId, email } = {}) => routeApi.getAssignedRoute({ driverId, email }),
};

export default adminApi;
