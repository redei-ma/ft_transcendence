"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndState = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@transcendence/types");
class EndState {
    constructor(session) {
        this.session = session;
        this.logger = new common_1.Logger(EndState.name);
        this.name = 'END';
        this.shutdownTimer = 0.0;
        this.isReadyToClose = false;
    }
    onEnter() {
        this.logger.log("Game is over, shutdown the server");
    }
    update(dt) {
        this.shutdownTimer += dt;
        if (this.shutdownTimer >= types_1.GameConfig.SERVER.SHUTDOWN_TIMER) {
            this.isReadyToClose = true;
            this.logger.log(`Game is ready to be shutdown`);
        }
    }
    onInput(entityId, input, attackType) {
        return;
    }
    onExit() {
    }
}
exports.EndState = EndState;
