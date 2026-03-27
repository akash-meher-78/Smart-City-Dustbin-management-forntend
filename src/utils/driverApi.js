import { API_ENDPOINTS, apiFetch, binApi, routeApi } from "./api";

export const driverApiService = {
  getAllDrivers: () => apiFetch(API_ENDPOINTS.driver.all),
  getDriverById: (driverId) => apiFetch(API_ENDPOINTS.driver.byId(driverId)),
  getAllBins: () => binApi.getAll(),
  getBinFillLevels: () => binApi.getFillLevels(),
  getBinById: (binId) => binApi.getById(binId),
  getAssignedRoute: ({ driverId, email } = {}) => routeApi.getAssignedRoute({ driverId, email }),
  markCollected: (payload) => routeApi.markCollected(payload),
};

export default driverApiService;
