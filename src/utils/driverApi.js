import { API_ENDPOINTS, apiFetch, binApi, routeApi } from "./api";

export const driverApiService = {
  getAllDrivers: () => apiFetch(API_ENDPOINTS.driver.all),
  getDriverById: (driverId) => apiFetch(API_ENDPOINTS.driver.byId(driverId)),
  getAllBins: () => binApi.getAll(),
  getBinFillLevels: () => binApi.getFillLevels(),
  getBinById: (binId) => binApi.getById(binId),
  getAllRoutes: () => routeApi.getAllRoutes(),
  getRouteByDriver: (driverId) => routeApi.getRouteByDriver(driverId),
  getRouteById: (routeId) => routeApi.getRouteById(routeId),
  getAssignedRoute: ({ driverId } = {}) => routeApi.getAssignedRoute({ driverId }),
  optimizeRoute: ({ driverId, lng, lat }) => routeApi.optimizeRoute({ driverId, lng, lat }),
  deleteRoute: (routeId) => routeApi.deleteRoute(routeId),
  markCollected: (payload) => routeApi.markCollected(payload),
};

export default driverApiService;