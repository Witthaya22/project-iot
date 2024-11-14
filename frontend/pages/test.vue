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
  power: number;
  energy: number;
  frequency: number;
  pf: number;
}

// Constants
const PEAK_RATE = 5.7982;
const OFF_PEAK_RATE = 2.6369;
const FT_RATE = 0.5;
const SERVICE_CHARGE = 38.22;

// State
const selectedDate = ref(format(new Date(), 'yyyy-MM-dd'));
const isLoading = ref(false);
const sensorData = ref<SensorData[]>([]);
const monthlyData = ref<SensorData[]>([]);
const error = ref<string | null>(null);

// Computed values
const dailyEnergy = computed(() => {
  if (!sensorData.value.length) return 0;
  const totalEnergy = sensorData.value.reduce((sum, reading) => sum + reading.energy, 0);
  return Number((totalEnergy / 1000).toFixed(3));
});

const monthlyEnergy = computed(() => {
  if (!monthlyData.value.length) return 0;
  const totalEnergy = monthlyData.value.reduce((sum, reading) => sum + reading.energy, 0);
  return Number((totalEnergy / 1000).toFixed(3));
});

const dailyCost = computed(() => {
  const energy = dailyEnergy.value;
  if (energy === 0) {
    // ค่าเดิม
    // return SERVICE_CHARGE;
    return Number(SERVICE_CHARGE.toFixed(5));
  }
  const peakEnergy = energy * 0.7;
  const offPeakEnergy = energy * 0.3;
  const cost = (peakEnergy * PEAK_RATE) + (offPeakEnergy * OFF_PEAK_RATE) + (energy * FT_RATE);
  // ค่าเดิม
  // return Number(cost.toFixed(2));
  return Number(cost.toFixed(5));
});

const monthlyCost = computed(() => {
  const energy = monthlyEnergy.value;
  // ค่าเดิม
  // return energy === 0 ? SERVICE_CHARGE : calculateMonthlyCost(energy);
  return energy === 0 ? Number(SERVICE_CHARGE.toFixed(5)) : calculateMonthlyCost(energy);
});

function calculateMonthlyCost(energy: number) {
  const peakEnergy = energy * 0.7;
  const offPeakEnergy = energy * 0.3;
  const cost = (peakEnergy * PEAK_RATE) + (offPeakEnergy * OFF_PEAK_RATE) + (energy * FT_RATE) + SERVICE_CHARGE;
  // ค่าเดิม
  // return Number(cost.toFixed(2));
  return Number(cost.toFixed(5));
}

const chartData = computed(() => ({
  labels: sensorData.value
    .map(d => {
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

// Functions
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
    
    // จัดเรียงข้อมูลตาม timestamp
    data = data.sort((a: SensorData, b: SensorData) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    sensorData.value = data;

    const monthStart = startOfMonth(new Date(selectedDate.value));
    const monthEnd = endOfMonth(new Date(selectedDate.value));
    const monthResponse = await fetch(
      `http://localhost:4000/get-sensor-history?start=${monthStart.toISOString()}&end=${monthEnd.toISOString()}`
    );

    if (monthResponse.ok) {
      let monthData = await monthResponse.json();
      // จัดเรียงข้อมูลตาม timestamp สำหรับข้อมูลรายเดือนด้วย
      monthlyData.value = monthData.sort((a: SensorData, b: SensorData) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงข้อมูล';
  } finally {
    isLoading.value = false;
  }
};


// Watchers and lifecycle hooks
watch(selectedDate, () => {
  fetchData();
});

onMounted(() => {
  fetchData();
  setInterval(fetchData,  30000);
});
</script>


<template>
  <div class="min-h-screen bg-white p-4 text-gray-900">
    <div class="max-w-6xl mx-auto">
      <div class="card bg-white shadow-xl border border-gray-200">
        <div class="card-body">
          <h2 class="card-title text-3xl mb-6 text-gray-800">ระบบติดตามการใช้พลังงาน</h2>
          
          <!-- Date Selection -->
          <div class="form-control w-full max-w-xs mb-8">
            <label class="label">
              <span class="label-text text-lg text-gray-600">เลือกวันที่ต้องการดูข้อมูล</span>
            </label>
            <input
              type="date"
              v-model="selectedDate"
              class="input input-bordered w-full border-gray-300 bg-white"
            >
          </div>

          <!-- Stats Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div class="stats shadow bg-gray-50">
              <div class="stat">
                <div class="stat-title text-gray-600">การใช้พลังงานวันที่เลือก</div>
                <div class="stat-value text-primary">{{ dailyEnergy }} kWh</div>
                <div class="stat-desc text-lg text-gray-500">ค่าไฟฟ้าประมาณ {{ dailyCost }} บาท</div>
              </div>
            </div>
            
            <div class="stats shadow bg-gray-50">
              <div class="stat">
                <div class="stat-title text-gray-600">ประมาณการณ์ค่าไฟฟ้าเดือนนี้</div>
                <div class="stat-value text-secondary">{{ monthlyEnergy }} kWh</div>
                <div class="stat-desc text-lg text-gray-500">ค่าไฟฟ้าประมาณ {{ monthlyCost }} บาท</div>
              </div>
            </div>
          </div>

          <!-- Chart -->
          <div class="h-[400px] relative">
            <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50 z-10">
              <span class="loading loading-spinner loading-lg text-primary"></span>
            </div>
            
            <template v-if="!isLoading">
              <Line
                v-if="sensorData.length && chartData.labels.length"
                :data="chartData"
                :options="chartOptions"
              />
              <div
                v-else
                class="h-full flex items-center justify-center"
              >
                <div class="text-center">
                  <div class="text-2xl mb-2">ไม่พบข้อมูล</div>
                  <p class="text-gray-500">กรุณาเลือกวันที่อื่น หรือตรวจสอบการเชื่อมต่อ</p>
                </div>
              </div>
            </template>
          </div>

                    <!-- Error Alert -->
                    <div v-if="error" class="alert alert-error mt-6">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{{ error }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
  /* สไตล์เพิ่มเติมเพื่อความสวยงาม */
  .stats .stat-value.text-primary {
    color: #3b82f6; /* สีฟ้าอ่อน */
  }
  
  .stats .stat-value.text-secondary {
    color: #ec4899; /* สีชมพูอ่อน */
  }

  .alert-error {
    background-color: #fdecea;
    color: #d32f2f;
  }
</style>
