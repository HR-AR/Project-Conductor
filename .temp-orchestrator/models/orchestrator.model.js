"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MilestoneStatus = exports.AgentStatus = exports.AgentType = exports.PhaseStatus = exports.PhaseNumber = void 0;
var PhaseNumber;
(function (PhaseNumber) {
    PhaseNumber[PhaseNumber["PHASE_0"] = 0] = "PHASE_0";
    PhaseNumber[PhaseNumber["PHASE_1"] = 1] = "PHASE_1";
    PhaseNumber[PhaseNumber["PHASE_2"] = 2] = "PHASE_2";
    PhaseNumber[PhaseNumber["PHASE_3"] = 3] = "PHASE_3";
    PhaseNumber[PhaseNumber["PHASE_4"] = 4] = "PHASE_4";
    PhaseNumber[PhaseNumber["PHASE_5"] = 5] = "PHASE_5";
})(PhaseNumber || (exports.PhaseNumber = PhaseNumber = {}));
var PhaseStatus;
(function (PhaseStatus) {
    PhaseStatus["NOT_STARTED"] = "not_started";
    PhaseStatus["IN_PROGRESS"] = "in_progress";
    PhaseStatus["COMPLETED"] = "completed";
    PhaseStatus["FAILED"] = "failed";
    PhaseStatus["BLOCKED"] = "blocked";
})(PhaseStatus || (exports.PhaseStatus = PhaseStatus = {}));
var AgentType;
(function (AgentType) {
    AgentType["API"] = "agent-api";
    AgentType["MODELS"] = "agent-models";
    AgentType["TEST"] = "agent-test";
    AgentType["REALTIME"] = "agent-realtime";
    AgentType["QUALITY"] = "agent-quality";
    AgentType["INTEGRATION"] = "agent-integration";
    AgentType["SECURITY"] = "agent-security";
})(AgentType || (exports.AgentType = AgentType = {}));
var AgentStatus;
(function (AgentStatus) {
    AgentStatus["IDLE"] = "idle";
    AgentStatus["ACTIVE"] = "active";
    AgentStatus["COMPLETED"] = "completed";
    AgentStatus["FAILED"] = "failed";
    AgentStatus["WAITING"] = "waiting";
})(AgentStatus || (exports.AgentStatus = AgentStatus = {}));
var MilestoneStatus;
(function (MilestoneStatus) {
    MilestoneStatus["PENDING"] = "pending";
    MilestoneStatus["IN_PROGRESS"] = "in_progress";
    MilestoneStatus["COMPLETED"] = "completed";
    MilestoneStatus["FAILED"] = "failed";
})(MilestoneStatus || (exports.MilestoneStatus = MilestoneStatus = {}));
//# sourceMappingURL=orchestrator.model.js.map