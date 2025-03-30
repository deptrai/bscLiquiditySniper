"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const app = (0, express_1.default)();
function startServer() {
    const port = config_1.config.APP.PORT;
    app.listen(port, () => {
        logger_1.logger.info(`Server is running on port ${port}`);
    });
}
//# sourceMappingURL=server.js.map