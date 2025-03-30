"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const figlet_1 = __importDefault(require("figlet"));
const config_1 = require("./config");
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const app = (0, express_1.default)();
exports.app = app;
const logger = async (req, res, next) => {
    console.log(figlet_1.default.textSync('BSC LIQUIDITY SNIPER 👋', {
        font: 'Larry 3D 2',
        horizontalLayout: 'default',
        verticalLayout: 'default',
    }));
    console.log(`${req.method} ${req.protocol}://${req.get('host')}${req.originalUrl} [${new Date().toLocaleString()}]`);
    next();
};
// CONFIG
if (!config_1.config.APP.PORT &&
    config_1.config.APP.NODE_ENV !== 'production') {
    dotenv_1.default.config({ path: '../.env' });
    app.use(logger);
    throw new Error('PORT, NODE_ENV are not defined');
}
// CORS
const corsOptions = {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 200,
    credentals: true,
};
// APP MIDDLEWARE
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)(corsOptions));
app.use(body_parser_1.default.json());
app.use(logger);
// ROUTES
app.get('/', async (req, res) => {
    res.status(200).json({
        success: true,
        message: figlet_1.default.textSync('BSC LIQUIDITY SNIPER 👋', {
            font: 'Small',
            horizontalLayout: 'default',
            verticalLayout: 'default',
        }),
    });
});
require("./routes");
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API Not Found',
    });
});
//# sourceMappingURL=app.js.map