export interface EcosystemNode {
    id: string;
    name: string;
    group: string;
    val: number;
    color: string;
}

export interface EcosystemLink {
    source: string;
    target: string;
    particleColor?: string;
}

export const MOCK_ECOSYSTEM_DATA = {
    nodes: [
        { id: 'NVDA', name: 'NVIDIA', group: 'US', val: 30, color: '#76b900' },
        { id: 'TSM', name: 'TSMC', group: 'TW', val: 25, color: '#ff0000' },
        { id: 'ASML', name: 'ASML', group: 'EU', val: 20, color: '#003399' },
        { id: '8035.T', name: 'Tokyo Electron', group: 'JP', val: 18, color: '#00ffff' },
        { id: '6723.T', name: 'Renesas', group: 'JP', val: 15, color: '#0088ff' },
        { id: '9984.T', name: 'SoftBank Group', group: 'JP', val: 22, color: '#cccccc' },
        { id: '6857.T', name: 'Advantest', group: 'JP', val: 12, color: '#ff9900' },
        { id: 'AAPL', name: 'Apple', group: 'US', val: 28, color: '#aaaaaa' },
        { id: 'INTC', name: 'Intel', group: 'US', val: 15, color: '#0071c5' },
        { id: 'AMD', name: 'AMD', group: 'US', val: 18, color: '#ed1c24' },
        { id: 'MSFT', name: 'Microsoft', group: 'US', val: 25, color: '#00a4ef' },
        { id: 'GOOGL', name: 'Google', group: 'US', val: 24, color: '#34a853' },
        { id: 'SONY', name: 'Sony', group: 'JP', val: 20, color: '#000000' },
    ] as EcosystemNode[],
    links: [
        { source: 'TSM', target: 'NVDA', particleColor: '#00ff00' }, // Foundry
        { source: 'ASML', target: 'TSM', particleColor: '#00ffff' }, // Lithography
        { source: '8035.T', target: 'TSM', particleColor: '#00ffff' }, // Equipment
        { source: '8035.T', target: 'INTC', particleColor: '#00ffff' },
        { source: '6857.T', target: 'NVDA', particleColor: '#ff9900' }, // Testing
        { source: '9984.T', target: 'NVDA', particleColor: '#ff00ff' }, // Investment/Arm
        { source: 'AAPL', target: 'TSM', particleColor: '#00ff00' },
        { source: 'AMD', target: 'TSM', particleColor: '#00ff00' },
        { source: '6723.T', target: '8035.T', particleColor: '#aaaaaa' }, // Correlation
        { source: 'MSFT', target: 'NVDA', particleColor: '#76b900' }, // AI Demand
        { source: 'GOOGL', target: 'NVDA', particleColor: '#76b900' }, // AI Demand
        { source: 'SONY', target: 'TSM', particleColor: '#00ff00' },
        { source: 'INTC', target: 'ASML', particleColor: '#003399' },
    ] as EcosystemLink[]
};
