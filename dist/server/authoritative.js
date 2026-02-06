import { FixedTimestepLoop } from "../core/fixedTimestep.js";
import { RngService } from "../core/rng.js";
import { CombatSimulator } from "../sim/combat.js";
export class ServerAuthoritativeSim {
    data;
    loop;
    rngService;
    combat;
    config;
    constructor(data, seed, config) {
        this.data = data;
        this.config = {
            tickMs: 50,
            maxTicks: 1800,
            ...config
        };
        this.loop = new FixedTimestepLoop(this.config.tickMs);
        this.rngService = new RngService(seed);
        this.combat = new CombatSimulator(this.data, this.rngService, { tickMs: this.config.tickMs });
    }
    applyInput(input) {
        this.combat.init(input);
    }
    step() {
        this.loop.advance(this.config.tickMs, (_, tick) => {
            this.combat.step(tick);
        });
    }
    run() {
        this.loop.runTicks(this.config.maxTicks, (_, tick) => {
            this.combat.step(tick);
        });
    }
    getState() {
        return this.combat.getState();
    }
    getEvents() {
        return this.combat.getEvents();
    }
}
