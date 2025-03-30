import mongoose, { Schema, Document } from 'mongoose';
import { ContractAnalysis, Vulnerability } from '../types/contract';

export interface IContractAnalysis extends Document, ContractAnalysis {
    createdAt: Date;
    updatedAt: Date;
}

const VulnerabilitySchema = new Schema({
    type: { type: String, required: true },
    severity: { type: String, required: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    recommendation: { type: String, required: true }
});

const FunctionSchema = new Schema({
    name: { type: String, required: true },
    visibility: { type: String, required: true },
    isPayable: { type: Boolean, required: true },
    isView: { type: Boolean, required: true },
    isPure: { type: Boolean, required: true },
    isDangerous: { type: Boolean, required: true },
    parameters: [{ name: String, type: String }],
    returnType: String,
    modifiers: [String],
    risks: [String]
});

const EventSchema = new Schema({
    name: { type: String, required: true },
    parameters: [{ name: String, type: String, isIndexed: Boolean }],
    isIndexed: { type: Boolean, required: true }
});

const ContractAnalysisSchema = new Schema({
    address: { type: String, required: true, unique: true },
    sourceCode: { type: String, required: true },
    compilerVersion: { type: String, required: true },
    optimization: { type: Boolean, required: true },
    runs: { type: Number, required: true },
    license: { type: String, required: true },
    functions: [FunctionSchema],
    events: [EventSchema],
    vulnerabilities: [VulnerabilitySchema],
    isHoneypot: { type: Boolean, required: true },
    riskScore: { type: Number, required: true },
    lastUpdated: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

ContractAnalysisSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

export const ContractAnalysisModel = mongoose.model<IContractAnalysis>('ContractAnalysis', ContractAnalysisSchema); 