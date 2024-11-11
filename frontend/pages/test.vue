<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
          ระบบติดตามการใช้พลังงาน
        </h1>
        <p class="text-gray-600">ติดตามและวิเคราะห์การใช้พลังงานไฟฟ้าของคุณ</p>
      </div>

      <!-- Date Range Selector -->
      <div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-8">
        <div class="flex flex-wrap gap-6 items-end justify-center">
          <div class="form-control">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              วันที่เริ่มต้น
            </label>
            <input 
              type="datetime-local" 
              v-model="startDate"
              class="input input-bordered w-full max-w-xs bg-white/90" 
            />
          </div>
          <div class="form-control">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              วันที่สิ้นสุด
            </label>
            <input 
              type="datetime-local" 
              v-model="endDate"
              class="input input-bordered w-full max-w-xs bg-white/90" 
            />
          </div>
          <button 
            @click="fetchData" 
            class="btn btn-primary"
            :class="{ 'loading': isLoading }"
          >
            {{ isLoading ? 'กำลังโหลด...' : 'อัปเดตข้อมูล' }}
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="stat bg-white/80 backdrop-blur-sm rounded-xl shadow-lg">
          <div class="stat-figure text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-8 h-8 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <div class="stat-title">การใช้พลังงานรวม</div>
          <div class="stat-value text-primary">{{ totalKwh.toFixed(2) }} kWh</div>
          <div class="stat-desc">ในช่วงเวลาที่เลือก</div>
        </div>
        
        <div class="stat bg-white/80 backdrop-blur-sm rounded-xl shadow-lg">
          <div class="stat-figure text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-8 h-8 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
          </div>
          <div class="stat-title">กำลังไฟฟ้าเฉลี่ย</div>
          <div class="stat-value text-secondary">{{ averagePower.toFixed(1) }} W</div>
          <div class="stat-desc">ค่าเฉลี่ยในช่วงเวลา</div>
        </div>
        
        <div class="stat bg-white/80 backdrop-blur-sm rounded-xl shadow-lg">
          <div class="stat-figure text-accent">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-8 h-8 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
          </div>
          <div class="stat-title">ค่าไฟฟ้าประมาณการ</div>
          <div class="stat-value">฿{{ estimatedCost.toFixed(2) }}</div>
          <div class="stat-desc">คำนวณจากอัตรา TOU</div>
        </div>

        <div class="stat bg-white/80 backdrop-blur-sm rounded-xl shadow-lg">
          <div class="stat-figure text-info">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-8 h-8 stroke-current"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
          </div>
          <div class="stat-title">อัปเดตล่าสุด</div>
          <div class="stat-value text-info text-lg">{{ lastUpdated }}</div>
          <div class="stat-desc">เวลาล่าสุดที่บันทึก</div>
        </div>
      </div>

      <!-- Power Consumption Graph -->
      <div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden mb-8">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-gray-800">กราฟแสดงการใช้พลังงาน</h2>
            <div class="flex gap-2">
              <button 
                v-for="period in ['1H', '6H', '1D', '1W', '1M']" 
                :key="period"
                @click="setQuickPeriod(period)"
                class="btn btn-sm"
                :class="{'btn-primary': selectedPeriod === period}"
              >
                {{ period }}
              </button>
            </div>
          </div>
          <div class="w-full h-[500px] bg-white/90 rounded-lg p-4">
            <client-only>
              <Line
                v-if="sensorData.length"
                :data="chartData"
                :options="chartOptions"
                class="h-full w-full"
              />
              <div v-else class="flex items-center justify-center h-full">
                <div class="animate-pulse text-gray-400">กำลังโหลดข้อมูล...</div>
              </div>
            </client-only>
          </div>
        </div>
      </div>

      <!-- Monthly Usage Table -->
      <div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-800 mb-4">สรุปการใช้พลังงานรายเดือน</h2>
          <div class="overflow-x-auto">
            <table class="table table-zebra w-full">
              <thead>
                <tr>
                  <th>เดือน</th>
                  <th>การใช้พลังงาน (kWh)</th>
                  <th>ค่าไฟฟ้าประมาณการ (บาท)</th>
                  <th>กำลังไฟฟ้าเฉลี่ย (W)</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(month, index) in monthlyUsage" :key="index">
                  <td>{{ month.month }}</td>
                  <td>{{ month.kwh.toFixed(2) }}</td>
                  <td>{{ month.cost.toFixed(2) }}</td>
                  <td>{{ month.avgPower.toFixed(1) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'vue-chartjs';
import { format, subHours, subDays, subMonths } from 'date-fns';
import { th } from 'date-fns/locale';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Define constants for electricity rates
const PEAK_RATE = 5.7982; // บาท/หน่วย (09:00-22:00)
const OFF_PEAK_RATE = 2.6369; // บาท/หน่วย (22:00-09:00)
const FT_RATE = 0.5; // ค่า Ft
const SERVICE_CHARGE = 38.22; // ค่าบริการรายเดือน

interface SensorData {
  timestamp: string;
  power: number;
  voltage?: number; // Optional properties
  current?: number; // Optional properties
  energy?: number; // Optional properties
  frequency?: number; // Optional properties
  pf?: number; // Optional properties
}

const startDate = ref('');
const endDate = ref('');
const isLoading = ref(false);
const selectedPeriod = ref('1D');
const sensorData = ref<SensorData[]>([]);

const totalKwh = computed(() => {
  if (!sensorData.value.length) return 0;
  const firstTimestamp = sensorData.value[0].timestamp;
  const lastTimestamp = sensorData.value[sensorData.value.length - 1].timestamp;
  const hours = (new Date(lastTimestamp).getTime() - new Date(firstTimestamp).getTime()) / (1000 * 60 * 60);
  const avgPower = sensorData.value.reduce((sum, reading) => sum + reading.power, 0) / sensorData.value.length;
  return (avgPower * hours) / 1000;
});

const averagePower = computed(() => {
  if (!sensorData.value.length) return 0;
  return sensorData.value.reduce((sum, reading) => sum + reading.power, 0) / sensorData.value.length;
});

const estimatedCost = computed(() => {
  const kwh = totalKwh.value;

  // ตรวจสอบว่ามีการใช้พลังงาน
  if (kwh === 0) return 0;

  const peakKwh = kwh * 0.7;
  const offPeakKwh = kwh * 0.3;
  return (peakKwh * PEAK_RATE + offPeakKwh * OFF_PEAK_RATE) + 
         (kwh * FT_RATE) + SERVICE_CHARGE;
});

const lastUpdated = computed(() => {
  if (!sensorData.value.length) return 'ไม่มีข้อมูล';
  return format(
    new Date(sensorData.value[sensorData.value.length - 1].timestamp),
    "d MMMM yyyy HH:mm:ss", 
    { locale: th }
  );
});

const monthlyUsage = computed(() => {
  if (!sensorData.value.length) return [];

  const monthlyData: any = {};

  // Filter sensor data based on selected date range
  const filteredData = sensorData.value.filter(reading => {
    const readingDate = new Date(reading.timestamp);
    const start = new Date(startDate.value);
    const end = new Date(endDate.value);
    return readingDate >= start && readingDate <= end;
  });

  filteredData.forEach((reading) => {
    const date = new Date(reading.timestamp);
    const monthKey = format(date, 'yyyy-MM');
    const monthDisplay = format(date, 'MMMM yyyy', { locale: th });

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        month: monthDisplay,
        readings: [],
        totalPower: 0,
        hours: 0
      };
    }

    monthlyData[monthKey].readings.push(reading);
    monthlyData[monthKey].totalPower += reading.power;
  });

  return Object.values(monthlyData).map(month => {
    const avgPower = month.totalPower / month.readings.length;
    const hours = (new Date(month.readings[month.readings.length - 1].timestamp) - 
                  new Date(month.readings[0].timestamp)) / (1000 * 60 * 60);
    const kwh = (avgPower * hours) / 1000;
    const peakKwh = kwh * 0.7;
    const offPeakKwh = kwh * 0.3;
    const cost = (peakKwh * PEAK_RATE + offPeakKwh * OFF_PEAK_RATE) + 
                 (kwh * FT_RATE) + SERVICE_CHARGE;

    return {
      month: month.month,
      kwh,
      cost,
      avgPower
    };
  });
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: "nearest" as "nearest" // Add this assertion
  },
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.98)',
      titleColor: '#1e293b',
      bodyColor: '#1e293b',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: 12,
      displayColors: false,
      titleFont: {
        size: 14,
        weight: 800
      },
      bodyFont: {
        size: 13
      },
      callbacks: {
  title: (context) => {
    const date = new Date(sensorData.value[context[0].dataIndex].timestamp);
    return format(date, "EEEE d MMMM yyyy HH:mm:ss", { locale: th });
  },
  label: (context) => {
    const reading = sensorData.value[context.dataIndex];
    return [
      `กำลังไฟฟ้า: ${reading.power.toFixed(1)} วัตต์`,
      `แรงดัน: ${reading?.voltage?.toFixed(1)} V`,
      `กระแส: ${reading?.current?.toFixed(2)} A`,
      `ตัวประกอบกำลัง: ${reading.pf}`
    ];
  }
}
    }
  },
  scales: {
    x: {
      grid: {
        display: false
      },
      ticks: {
        maxRotation: 45,
        minRotation: 45,
        callback: (value: number, index: number) => {
          const date = new Date(sensorData.value[index].timestamp);
          return format(date, "HH:mm", { locale: th });
        }
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.06)',
        lineWidth: 1
      },
      ticks: {
        callback: (value: number) => `${value}W`,
        font: {
          weight: 500
        }
      }
    }
  },
  elements: {
    line: {
      tension: 0.4,
      borderWidth: 2.5,
      borderColor: 'rgb(37, 99, 235)',
      fill: true,
      backgroundColor: (context: { chart: { ctx: CanvasRenderingContext2D } }) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.3)');
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.02)');
        return gradient;
      }
    },
    point: {
      radius: 0,
      hoverRadius: 8,
      backgroundColor: 'rgb(37, 99, 235)',
      hoverBackgroundColor: 'white',
      hoverBorderColor: 'rgb(37, 99, 235)',
      hoverBorderWidth: 3
    }
  }
};

const chartData = computed(() => ({
  labels: sensorData.value.map(d => format(new Date(d.timestamp), 'HH:mm')),
  datasets: [
    {
      label: 'กำลังไฟฟ้า',
      data: sensorData.value.map(d => d.power),
    }
  ]
}));

const setQuickPeriod = (period: string) => {
  selectedPeriod.value = period;
  const end = new Date();
  let start:any;

  switch (period) {
    case '1H':
      start = subHours(end, 1);
      break;
    case '6H':
      start = subHours(end, 6);
      break;
    case '1D':
      start = subDays(end, 1);
      break;
    case '1W':
      start = subDays(end, 7);
      break;
    case '1M':
      start = subMonths(end, 1);
      break;
  }

  startDate.value = start.toISOString().slice(0, 16);
  endDate.value = end.toISOString().slice(0, 16);
  fetchData();
};

const fetchData = async () => {
  if (!startDate.value || !endDate.value) {
    alert('กรุณาระบุช่วงเวลาที่ต้องการ');
    return;
  }

  isLoading.value = true;

  try {
    const response = await fetch(
      `http://localhost:4000/get-sensor-history?start=${startDate.value}&end=${endDate.value}`
    );

    if (!response.ok) {
      throw new Error('ไม่สามารถดึงข้อมูลได้');
    }

    const data = await response.json();

    // ตรวจสอบข้อมูลที่ได้รับ
    if (Array.isArray(data) && data.every(item => 'timestamp' in item && 'power' in item)) {
      sensorData.value = data as SensorData[];
    } else {
      throw new Error('ข้อมูลไม่ถูกต้อง');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('เกิดข้อผิดพลาดในการดึงข้อมูล');
  } finally {
    isLoading.value = false;
  }
};

// Initialize with last 24 hours
const initializeDateRange = () => {
  const end = new Date();
  const start = subDays(end, 1);
  
  startDate.value = start.toISOString().slice(0, 16);
  endDate.value = end.toISOString().slice(0, 16);
};

initializeDateRange();
fetchData();
</script>

<style>
.form-control input {
  width: 250px;
}

@media (max-width: 640px) {
  .form-control input {
    width: 100%;
  }
}
</style>