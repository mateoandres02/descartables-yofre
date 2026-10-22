import { PrintingService } from "../services/printing.service.js";
import { sendControllerError } from "./controllerError.js";

export const PrintingController = {
  authorizeAgent(req, res) {
    try { res.json(PrintingService.authorizeAgent()); }
    catch (error) { sendControllerError(res, error); }
  },
};
