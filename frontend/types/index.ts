export interface SensorData {
    timestamp: string;
    power: number;
    voltage?: number;
    current?: number;
    energy?: number;
    frequency?: number;
    pf?: number;
  }
  
  export interface MonthlyUsage {
    month: string;
    kwh: number;
    cost: number;
    avgPower: number;
  }