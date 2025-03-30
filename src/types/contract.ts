export interface ContractAnalysis {
    address: string;
    sourceCode: string;
    compilerVersion: string;
    optimization: boolean;
    runs: number;
    license: string;
    functions: FunctionAnalysis[];
    events: EventAnalysis[];
    vulnerabilities: Vulnerability[];
    isHoneypot: boolean;
    riskScore: number;
    lastUpdated: Date;
}

export interface FunctionAnalysis {
    name: string;
    visibility: 'public' | 'private' | 'internal' | 'external';
    isPayable: boolean;
    isView: boolean;
    isPure: boolean;
    isDangerous: boolean;
    parameters: Parameter[];
    returnType: string;
    modifiers: string[];
    risks: string[];
}

export interface EventAnalysis {
    name: string;
    parameters: Parameter[];
    isIndexed: boolean;
}

export interface Parameter {
    name: string;
    type: string;
    isIndexed?: boolean;
}

export interface Vulnerability {
    type: VulnerabilityType;
    severity: 'high' | 'medium' | 'low';
    description: string;
    location: string;
    recommendation: string;
}

export enum VulnerabilityType {
    HONEYPOT = 'HONEYPOT',
    BLACKLIST = 'BLACKLIST',
    MINT_FUNCTION = 'MINT_FUNCTION',
    OWNER_PRIVILEGES = 'OWNER_PRIVILEGES',
    SELF_DESTRUCT = 'SELF_DESTRUCT',
    DELEGATE_CALL = 'DELEGATE_CALL',
    UNCHECKED_RETURN = 'UNCHECKED_RETURN',
    REENTRANCY = 'REENTRANCY',
    FRONTRUNNING = 'FRONTRUNNING',
    UNKNOWN = 'UNKNOWN'
}

export interface ContractSource {
    address: string;
    sourceCode: string;
    compilerVersion: string;
    optimization: boolean;
    runs: number;
    license: string;
    constructorArguments: string;
    libraries: Record<string, string>;
    implementation?: string;
    proxy?: boolean;
} 