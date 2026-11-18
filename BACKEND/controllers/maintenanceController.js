import MaintenanceLog from "../models/MaintenanceLog.js";
import crud from "./crudFactory.js";

const c = crud(MaintenanceLog, {
  searchFields: ["header.computerName", "header.userName", "header.location", "comments"],
  filterFields: ["logType", "asset", "year", "month"],
  populate: { path: "asset", select: "assetId assetType brand model serialNo location" },
  defaultSort: "-year",
});

export const { list, get, create, update, remove } = c;
