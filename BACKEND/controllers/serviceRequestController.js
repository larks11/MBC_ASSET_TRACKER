import ServiceRequest from "../models/ServiceRequest.js";
import crud from "./crudFactory.js";

const c = crud(ServiceRequest, {
  searchFields: ["srfNo", "requestorName", "positionDepartment", "description"],
  filterFields: ["status"],
  dateField: "dateRequested",
  defaultSort: "-dateRequested",
});

export const { list, get, create, update, remove } = c;
