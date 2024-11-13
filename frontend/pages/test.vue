<script setup lang="ts">
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "vue-chartjs";
import { format, startOfDay, startOfMonth, endOfMonth, addDays } from "date-fns";
import { th } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

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

// Constants for pricing
const PEAK_RATE = 5.7982;
const OFF_PEAK_RATE = 2.6369;
const FT_RATE = 0.5;
const SERVICE_CHARGE = 38.22;

// Data interfaces
interface SensorData {
  timestamp: string;
  power: number;
  energy?: number;
}

// State management
const startDate = ref("");
const endDate = ref("");
const isLoading = ref(false);
const selectedPeriod = ref("1D");
const sensorData = ref<SensorData[]>([]);
const allMonthData = ref<SensorData[]>([]);

// Computed: Calculate average power
const averagePower = computed(() => {
  if (sensorData.value.length === 0) return 0;
  return (
    sensorData.value.reduce((sum, reading) => sum + reading.power, 0) /
    sensorData.value.length
  );
});

// Computed: Calculate energy usage (kWh) based on average power
const periodKwh = computed(() => {
  const avgPower = averagePower.value;
  const start = new Date(startDate.value);
  const end = new Date(endDate.value);
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Total hours
  return (avgPower * hours) / 1000; // Convert to kWh
});

// Computed: Calculate electricity cost based on periodKwh
const periodCost = computed(() => {
  const kwh = periodKwh.value;
  const peakKwh = kwh * 0.7;
  const offPeakKwh = kwh * 0.3;
  return peakKwh * PEAK_RATE + offPeakKwh * OFF_PEAK_RATE + kwh * FT_RATE;
});

// Monthly details
const currentMonthLabel = computed(() => {
  if (!sensorData.value.length) return "";
  const date = new Date(sensorData.value[0].timestamp);
  return `เดือน${format(date, "MMMM yyyy", { locale: th })}`;
});

// Monthly electricity cost calculation
const currentMonthCost = computed(() => {
  if (!allMonthData.value.length) return 0;
  const totalEnergy = allMonthData.value.reduce((sum, reading) => sum + (reading.energy || 0), 0);
  const monthKwh = totalEnergy / 1000;
  const peakKwh = monthKwh * 0.7;
  const offPeakKwh = monthKwh * 0.3;
  return peakKwh * PEAK_RATE + offPeakKwh * OFF_PEAK_RATE + monthKwh * FT_RATE + SERVICE_CHARGE;
});

// Formatting for last updated time
const lastUpdated = computed(() => {
  if (!sensorData.value.length) return "ไม่มีข้อมูล";
  const date = toZonedTime(
    new Date(sensorData.value[sensorData.value.length - 1].timestamp),
    "Asia/Bangkok"
  );
  return format(date, "d MMMM yyyy HH:mm:ss", { locale: th });
});

// Chart data configuration
const chartData = computed(() => ({
  labels: sensorData.value.map((d) => {
    const date = toZonedTime(new Date(d.timestamp), "Asia/Bangkok");
    return format(date, "d MMM HH:mm"); // Adds date to each label
  }),
  datasets: [
    {
      label: "กำลังไฟฟ้า",
      data: sensorData.value.map((d) => d.power),
      borderColor: "rgb(37, 99, 235)",
      backgroundColor: "rgba(37, 99, 235, 0.1)",
      fill: true,
      tension: 0.4,
    },
  ],
}));

// Chart options
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: "nearest",
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "rgba(255, 255, 255, 0.98)",
      titleColor: "#1e293b",
      bodyColor: "#1e293b",
      borderColor: "#e2e8f0",
      borderWidth: 1,
      padding: 12,
      displayColors: false,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { maxRotation: 45, minRotation: 45, color: "#64748b", maxTicksLimit: 12 },
    },
    y: {
      beginAtZero: true,
      grid: { color: "rgba(0, 0, 0, 0.06)", lineWidth: 1 },
      ticks: { color: "#64748b", callback: (value: number) => `${value}W`, maxTicksLimit: 8 },
    },
  },
  animations: { tension: { duration: 1000, easing: "linear", from: 0.8, to: 0.4 } },
};

// Set date range for quick period selection
const setQuickPeriod = (period: any) => {
  selectedPeriod.value = period;
  const now = new Date();
  let start, end;
  switch (period) {
    case "1D":
      start = startOfDay(now);
      end = addDays(start, 1);
      break;
    case "1W":
      start = addDays(now, -6);
      end = now;
      break;
    case "1M":
      start = startOfMonth(now);
      end = endOfMonth(now);
      break;
    default:
      return;
  }
  startDate.value = start.toISOString().slice(0, 16);
  endDate.value = end.toISOString().slice(0, 16);
  fetchData();
};

// Fetch data based on selected dates
const fetchData = async () => {
  if (!startDate.value || !endDate.value) {
    alert("กรุณาระบุช่วงเวลาที่ต้องการ");
    return;
  }
  isLoading.value = true;

  try {
    const response = await fetch(
      `http://localhost:4000/get-sensor-history?start=${startDate.value}&end=${endDate.value}`
    );

    if (!response.ok) {
      throw new Error("ไม่สามารถดึงข้อมูลได้");
    }

    const data = await response.json();
    if (Array.isArray(data) && data.every((item) => "timestamp" in item && "power" in item)) {
      sensorData.value = data;

      // Get monthly data to calculate current month cost
      const monthStart = startOfMonth(new Date(startDate.value));
      const monthEnd = endOfMonth(new Date(endDate.value));
      const monthResponse = await fetch(
        `http://localhost:4000/get-sensor-history?start=${monthStart.toISOString()}&end=${monthEnd.toISOString()}`
      );

      if (monthResponse.ok) {
        allMonthData.value = await monthResponse.json();
      }
    } else {
      throw new Error("ข้อมูลไม่ถูกต้อง");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("เกิดข้อผิดพลาดในการดึงข้อมูล");
  } finally {
    isLoading.value = false;
  }
};

// Initialize with a 1-day view
onMounted(() => {
  setQuickPeriod("1D");
});
</script>




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
            class="btn btn-primary px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            :class="{ 'opacity-50 cursor-wait': isLoading }"
          >
            {{ isLoading ? 'กำลังโหลด...' : 'อัปเดตข้อมูล' }}
          </button>
        </div>
        <!-- <div class="flex justify-center mt-4 gap-2">
          <button 
            v-for="period in ['1D', '1W', '1M']" 
            :key="period"
            @click="setQuickPeriod(period)"
            class="px-4 py-1 rounded-lg text-sm"
            :class="{
              'bg-blue-600 text-white': selectedPeriod === period,
              'bg-gray-200 text-gray-700 hover:bg-gray-300': selectedPeriod !== period
            }"
          >
            {{ period }}
          </button>
        </div> -->
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
        <!-- <div class="stat bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6">
          <div class="flex justify-between items-start mb-4">
            <div class="text-gray-600 text-sm">กำลังไฟฟ้าเฉลี่ย</div>
            <div class="text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div class="text-2xl font-bold text-gray-900">{{ averagePower.toFixed(1) }} W</div>
          <div class="text-sm text-gray-500">ค่าเฉลี่ยในช่วงเวลา</div>
        </div> -->
        
        <div class="stat bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6">
          <div class="flex justify-between items-start mb-4">
            <div class="text-gray-600 text-sm">การใช้พลังงานในช่วงที่เลือก</div>
            <div class="text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div class="text-2xl font-bold text-gray-900">{{ periodKwh.toFixed(2) }} kWh</div>
          <div class="text-sm text-gray-500">ค่าไฟฟ้า: ฿{{ periodCost.toFixed(2) }}</div>
        </div>
        
        <div class="stat bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6">
          <div class="flex justify-between items-start mb-4">
            <div class="text-gray-600 text-sm">ค่าไฟฟ้าประมาณการรายเดือน</div>
            <div class="text-purple-600">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="text-2xl font-bold text-gray-900">฿{{ currentMonthCost.toFixed(2) }}</div>
          <div class="text-sm text-gray-500">{{ currentMonthLabel }}</div>
        </div>

        <!-- <div class="stat bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-6">
          <div class="flex justify-between items-start mb-4">
            <div class="text-gray-600 text-sm">อัปเดตล่าสุด</div>
            <div class="text-orange-600">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div class="text-lg font-semibold text-gray-900">{{ lastUpdated }}</div>
          <div class="text-sm text-gray-500">เวลาล่าสุดที่บันทึก</div>
        </div> -->
      </div>

      <!-- Power Consumption Graph -->
      <div class="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden mb-8">
        <div class="p-6">
          <h2 class="text-xl font-bold text-gray-800 mb-6">กราฟแสดงการใช้พลังงาน</h2>
          <div class="w-full h-[500px] bg-white/90 rounded-lg p-4">
            <ClientOnly>
              <Line
                v-if="sensorData.length"
                :data="chartData"
                :options="chartOptions"
                class="h-full w-full"
              />
              <div v-else class="flex items-center justify-center h-full">
                <div class="animate-pulse text-gray-400">กำลังโหลดข้อมูล...</div>
              </div>
            </ClientOnly>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>




<style>
.form-control input {
  @apply px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
  width: 250px;
}

@media (max-width: 640px) {
  .form-control input {
    width: 100%;
  }
}

.btn {
  @apply font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200;
}

.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}
</style>