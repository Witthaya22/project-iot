<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'vue-chartjs';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { th } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface SensorData {
  timestamp: string;
  voltage: number;
  current: number;
  power: number; // Power in watts
  energy: number; // Energy in Wh
  frequency: number;
  pf: number;
}

// State
const selectedDate = ref(format(new Date(), 'yyyy-MM-dd'));
const isLoading = ref(false);
const sensorData = ref<SensorData[]>([]);
const monthlyData = ref<SensorData[]>([]);
const error = ref<string | null>(null);

// คำนวณพลังงานรายวันจากกำลังไฟฟ้าทุก 1 นาที
const dailyEnergy = computed(() => {
  if (!sensorData.value.length) return 0;

  // คำนวณพลังงานในหน่วย Wh จากข้อมูลกำลังไฟฟ้า (กำลัง W * เวลา (1/60 ชั่วโมง))
  const totalEnergy = sensorData.value.reduce((sum, reading) => sum + (reading.power / 60), 0);
  return Number((totalEnergy / 1000).toFixed(4)); // แปลงเป็น kWh
});

// คำนวณพลังงานรายเดือนจากกำลังไฟฟ้าทุก 1 นาที
const monthlyEnergy = computed(() => {
  if (!monthlyData.value.length) return 0;

  // คำนวณพลังงานในหน่วย Wh จากข้อมูลกำลังไฟฟ้า (กำลัง W * เวลา (1/60 ชั่วโมง))
  const totalEnergy = monthlyData.value.reduce((sum, reading) => sum + (reading.power / 60), 0);
  return Number((totalEnergy / 1000).toFixed(4)); // แปลงเป็น kWh
});

// คำนวณค่าใช้จ่ายรายวัน (ไม่รวมค่าบริการรายเดือน)
const dailyCost = computed(() => {
  return calculateDailyCost(dailyEnergy.value);
});

// คำนวณค่าใช้จ่ายรายเดือน (รวมค่าบริการรายเดือน)
const monthlyCost = computed(() => {
  return calculateMonthlyCost(monthlyEnergy.value);
});

// ฟังก์ชันคำนวณค่าไฟฟ้าจากพลังงานที่ใช้ (หน่วย kWh) สำหรับรายวัน
function calculateDailyCost(energy: number) {
  if (energy === 0) return 0;

  let cost = 0;

  if (energy <= 150) {
    cost = energy * 3.2484;
  } else if (energy <= 400) {
    cost = (150 * 3.2484) + ((energy - 150) * 4.2218);
  } else {
    cost = (150 * 3.2484) + (250 * 4.2218) + ((energy - 400) * 4.4217);
  }

  return Number(cost.toFixed(4));
}

// ฟังก์ชันคำนวณค่าไฟฟ้ารายเดือน (รวมค่าบริการ)
function calculateMonthlyCost(energy: number) {
  if (energy === 0) return 38.22; // รวมค่าบริการขั้นต่ำ

  let cost = 0;

  if (energy <= 150) {
    cost = energy * 3.2484;
  } else if (energy <= 400) {
    cost = (150 * 3.2484) + ((energy - 150) * 4.2218);
  } else {
    cost = (150 * 3.2484) + (250 * 4.2218) + ((energy - 400) * 4.4217);
  }

  cost += 38.22; // ค่าบริการเพิ่มเติมสำหรับรายเดือน
  return Number(cost.toFixed(4));
}

// กำหนดข้อมูลสำหรับกราฟ
const chartData = computed(() => ({
  labels: sensorData.value.map(d => {
    const date = toZonedTime(new Date(d.timestamp), 'Asia/Bangkok');
    return format(date, 'd MMM yy HH:mm', { locale: th });
  }),
  datasets: [{
    label: 'กำลังไฟฟ้า (W)',
    data: sensorData.value.map(d => d.power),
    borderColor: '#0ea5e9',
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    fill: true,
    tension: 0.4,
    pointRadius: 3,
    pointHoverRadius: 5,
  }]
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index' as const,
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#fff',
      titleColor: '#333',
      bodyColor: '#333',
      borderColor: '#ddd',
      borderWidth: 1,
      padding: 12,
      displayColors: false,
      callbacks: {
        label: (item: any) => `กำลังไฟฟ้า: ${item.raw.toFixed(2)} วัตต์`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        color: '#333',
        maxRotation: 45,
        minRotation: 45,
        maxTicksLimit: 12,
      },
    },
    y: {
      beginAtZero: true,
      grid: { color: '#eee' },
      ticks: {
        color: '#333',
        callback: (value: number) => `${value.toFixed(1)}W`,
      },
    },
  },
};

// ฟังก์ชันดึงข้อมูล
const fetchData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const start = startOfDay(new Date(selectedDate.value));
    const end = endOfDay(new Date(selectedDate.value));
    const response = await fetch(
      `http://localhost:4000/get-sensor-history?start=${start.toISOString()}&end=${end.toISOString()}`
    );

    if (!response.ok) throw new Error('ไม่สามารถดึงข้อมูลได้');
    let data = await response.json();

    data = data.sort((a: SensorData, b: SensorData) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    sensorData.value = data;

    const monthStart = startOfMonth(new Date(selectedDate.value));
    const monthEnd = endOfMonth(new Date(selectedDate.value));
    const monthResponse = await fetch(
      `http://localhost:4000/get-sensor-history?start=${monthStart.toISOString()}&end=${monthEnd.toISOString()}`
    );

    if (monthResponse.ok) {
      let monthData = await monthResponse.json();
      monthlyData.value = monthData.sort((a: SensorData, b: SensorData) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงข้อมูล';
  } finally {
    isLoading.value = false;
  }
};

// Watchers และ Lifecycle hooks
watch(selectedDate, () => {
  fetchData();
});

onMounted(() => {
  fetchData();
  setInterval(fetchData, 20000);
});
</script>


<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header Section -->
      <div class="text-center mb-8">
        <h1 class="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
          ระบบติดตามการใช้พลังงาน
        </h1>
        <p class="text-gray-600">ติดตามและวิเคราะห์การใช้พลังงานไฟฟ้าของคุณ</p>
      </div>

      <!-- Main Card Section -->
      <div class="bg-white/80 backdrop-blur-md shadow-lg rounded-xl p-6 mb-8">
        
        <!-- Date Selection Section -->
        <div class="flex flex-col md:flex-row items-center justify-center gap-4 mb-8">
          <label class="text-gray-600 font-semibold">เลือกวันที่:</label>
          <input
            type="date"
            v-model="selectedDate"
            class="input input-bordered w-full max-w-xs border-gray-300 bg-white/90 rounded-lg focus:ring focus:ring-blue-500"
          />
          <button
            @click="fetchData"
            class="btn btn-primary bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all"
          >
            อัปเดตข้อมูล
          </button>
        </div>

        <!-- Stats Cards Section -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div class="bg-white p-6 rounded-lg shadow-md flex items-center">
            <div class="mr-4">
              <!-- Use image from URL for daily energy icon -->
              <img src="../assets/images/calendar.png" alt="Daily Energy Icon" class="h-12 w-12" />
            </div>
            <div>
              <div class="text-lg font-semibold text-gray-700">การใช้พลังงานในช่วงที่เลือก</div>
              <div class="text-3xl font-bold text-blue-600">{{ dailyEnergy }} kWh</div>
              <div class="text-md text-gray-500 mt-2">ค่าไฟฟ้า: {{ dailyCost }} บาท (ต่อวัน)</div>
            </div>
          </div>
          
          <div class="bg-white p-6 rounded-lg shadow-md flex items-center">
            <div class="mr-4">
              <!-- Use image from URL for monthly energy icon -->
              <img src="../assets/images/month (1).png" alt="Monthly Energy Icon" class="h-12 w-12" />
            </div>
            <div>
              <div class="text-lg font-semibold text-gray-700">ค่าไฟฟ้าประมาณการรายเดือน</div>
              <div class="text-3xl font-bold text-pink-600">{{ monthlyEnergy }} kWh</div>
              <div class="text-md text-gray-500 mt-2">ค่าไฟฟ้า: {{ monthlyCost }} บาท (ต่อเดือน + ค่าบริการต่างๆ)</div>
            </div>
          </div>
        </div>

        <!-- Chart Section -->
        <div class="relative bg-white p-6 rounded-lg shadow-md h-[400px]">
          <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50 z-10">
            <span class="loading loading-spinner loading-lg text-primary"></span>
          </div>
          
          <template v-if="!isLoading">
            <Line
              v-if="sensorData.length && chartData.labels.length"
              :data="chartData"
              :options="chartOptions"
            />
            <div v-else class="h-full flex items-center justify-center">
              <div class="text-center">
                <div class="text-2xl mb-2">ไม่พบข้อมูล</div>
                <p class="text-gray-500">กรุณาเลือกวันที่อื่น หรือตรวจสอบการเชื่อมต่อ</p>
              </div>
            </div>
          </template>
        </div>

        <!-- Error Alert -->
        <div v-if="error" class="alert alert-error mt-6 bg-red-100 text-red-800 border border-red-400 rounded-lg p-4">
          <img src="https://example.com/error_icon.png" alt="Error Icon" class="h-6 w-6 mr-2" />
          <span>{{ error }}</span>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.btn {
  @apply font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all;
}

.btn-primary {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}
</style>
