import { API_ENDPOINTS, apiFetch, binApi } from "./api";

export const driverApiService = {
  getAllDrivers: () => apiFetch(API_ENDPOINTS.driver.all),
  getDriverById: (driverId) => apiFetch(API_ENDPOINTS.driver.byId(driverId)),
  getAllBins: () => binApi.getAll(),
  getBinById: (binId) => binApi.getById(binId),
};

export default driverApiService;
