<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'vue-chartjs';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';
import { th } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
// const tf = require('@tensorflow/tfjs');
const selectedMonth = ref(new Date().toISOString().substr(0, 7)); //


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
  const availableDates = ref<string[]>([]);

  const predictedEnergy = ref(0);
const predictedCost = ref(0);
const lightStatus = ref(false);

const toggleLight = async () => {
  try {
    // เพิ่มการป้องกันการกดซ้ำ
    if (isLoading.value) return;
    isLoading.value = true;

    const response = await fetch('http://localhost:4000/api/control', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        value: lightStatus.value ? 0 : 1,
        device: 'sw01'
      })
    });

    if (response.ok) {
      const result = await response.json();
      lightStatus.value = result.status === 1;
    }
  } catch (error) {
    console.error('Error toggling light:', error);
  } finally {
    isLoading.value = false;
  }
};
const fetchSwitchStatus = async () => {
  try {
    const response = await fetch('http://localhost:4000/api/switch-status');
    if (response.ok) {
      const { status } = await response.json();
      if (lightStatus.value !== (status === 1)) { // เช็คว่าสถานะเปลี่ยนแปลงจริงๆ
        lightStatus.value = status === 1;
      }
    }
  } catch (error) {
    console.error('Error fetching switch status:', error);
  }
};

console.log('Monthly Data:', monthlyData.value);
const predictNextMonth = async () => {
  if (monthlyData.value.length > 0) {
    const lastMonthData = monthlyData.value[monthlyData.value.length - 1];
    console.log('Last Month Power:', lastMonthData.power); // ตรวจสอบค่ากำลังไฟฟ้าของเดือนล่าสุด

    try {
      const response = await fetch('http://localhost:4000/predict-power', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ power: lastMonthData.power }) // ส่งค่าพลังงานล่าสุด
      });

      if (response.ok) {
        const { energy } = await response.json();
        console.log('Predicted Energy:', energy); // ตรวจสอบค่าพลังงานที่พยากรณ์
        predictedEnergy.value = Number(energy.toFixed(2));
        predictedCost.value = calculateMonthlyCost(predictedEnergy.value);
        console.log('Calculated Cost:', predictedCost.value); // ตรวจสอบค่าที่คำนวณได้
      } else {
        const errorText = await response.text();
        console.error('Error fetching prediction:', response.statusText, errorText);
      }
    } catch (error) {
      console.error('Error in prediction:', error);
    }
  } else {
    console.log('No monthly data available for prediction.');
  }
};
const fetchMonthlyData = async () => {
  try {
    const monthStart = startOfMonth(new Date(selectedMonth.value)); // ใช้ selectedMonth แทน selectedDate
    const monthEnd = endOfMonth(new Date(selectedMonth.value));
    const monthResponse = await fetch(`http://localhost:4000/get-sensor-history?start=${monthStart.toISOString()}&end=${monthEnd.toISOString()}`);

    if (monthResponse.ok) {
      const monthData = await monthResponse.json();
      monthlyData.value = monthData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      // คำนวณพลังงานรวมในเดือนนี้
      const totalEnergy = monthlyData.value.reduce((sum, reading) => sum + (reading.power / 60), 0);
      console.log('Total Energy for the month:', totalEnergy);

      // เรียกใช้ฟังก์ชัน predictNextMonth ที่นี่
      await predictNextMonth(); // เรียกใช้ฟังก์ชันเพื่อทำการทำนาย
    } else {
      console.error('Failed to fetch monthly data:', monthResponse.statusText);
    }
  } catch (error) {
    console.error('Error fetching monthly data:', error);
  }
};
  const fetchAvailableDates = async () => {
  try {
    const response = await fetch('http://localhost:4000/get-available-dates');
    if (response.ok) {
      const dates = await response.json();
      // แปลง timestamps เป็นรูปแบบ yyyy-MM-dd
      availableDates.value = dates.map((date: string) => 
        format(new Date(date), 'yyyy-MM-dd')
      );
    }
  } catch (err) {
    console.error('Error fetching available dates:', err);
  }
};


// คำนวณพลังงานรายวันจากกำลังไฟฟ้าทุก 1 นาที
const dailyEnergy = computed(() => {
  if (!sensorData.value.length) return 0;

  // คำนวณพลังงานในหน่วย Wh จากข้อมูลกำลังไฟฟ้า (กำลัง W * เวลา (1/60 ชั่วโมง))
  const totalEnergy = sensorData.value.reduce((sum, reading) => sum + (reading.power / 60), 0);
  return Number((totalEnergy / 1000).toFixed(4)); // แปลงเป็น kWh
});

// คำนวณพลังงานรายเดือนจากกำลังไฟฟ้าทุก 1 นาที
// คำนวณพลังงานรายเดือนจากกำลังไฟฟ้าทุก 1 นาที
const monthlyEnergy = computed(() => {
  if (!monthlyData.value.length) return 0;

  let totalEnergy = 0;
  const dailyEnergies = new Map<string, number>();

  // คำนวณพลังงานรายวัน
  monthlyData.value.forEach(reading => {
    const day = format(new Date(reading.timestamp), 'yyyy-MM-dd');
    const energy = reading.power / 60; // แปลงเป็น Wh
    
    if (!dailyEnergies.has(day)) {
      dailyEnergies.set(day, 0);
    }
    dailyEnergies.set(day, dailyEnergies.get(day)! + energy);
  });

  // รวมพลังงานทั้งเดือน
  dailyEnergies.forEach(energy => {
    totalEnergy += energy;
  });

  return Number((totalEnergy / 1000).toFixed(4)); // แปลงเป็น kWh
});

// คำนวณค่าใช้จ่ายรายวัน (ไม่รวมค่าบริการรายเดือน)
const dailyCost = computed(() => {
  const energy = dailyEnergy.value;
  return energy > 0 ? calculateDailyCost(energy) : 8.19;
});


// คำนวณค่าใช้จ่ายรายเดือน (รวมค่าบริการรายเดือน)
const monthlyCost = computed(() => {
  // ใช้ค่าพลังงานรวมทั้งเดือน
  const energy = monthlyEnergy.value;
  return calculateMonthlyCost(energy);
});

// ฟังก์ชันคำนวณค่าไฟฟ้าจากพลังงานที่ใช้ (หน่วย kWh) สำหรับรายวัน
function calculateDailyCost(energy: number) {
  if (energy === 0) return 0;

  let cost = 0;

  if (energy <= 15) {
    cost = energy * 2.3488;
  } else if (energy <= 25) {
    cost = (15 * 2.3488) + ((energy - 15) * 2.9882);
  } else if (energy <= 35) {
    cost = (15 * 2.3488) + (10 * 2.9882) + ((energy - 25) * 3.2405);
  } else if (energy <= 100) {
    cost = (15 * 2.3488) + (10 * 2.9882) + (10 * 3.2405) + ((energy - 35) * 3.6237);
  } else if (energy <= 150) {
    cost = (15 * 2.3488) + (10 * 2.9882) + (10 * 3.2405) + (65 * 3.6237) + ((energy - 100) * 3.7171);
  } else if (energy <= 400) {
    cost = (15 * 2.3488) + (10 * 2.9882) + (10 * 3.2405) + (65 * 3.6237) + (50 * 3.7171) + ((energy - 150) * 4.2218);
  } else {
    cost = (15 * 2.3488) + (10 * 2.9882) + (10 * 3.2405) + (65 * 3.6237) + (50 * 3.7171) + (250 * 4.2218) + ((energy - 400) * 4.4217);
  }

  return Number(cost.toFixed(4));
}
  

// ฟังก์ชันคำนวณค่าไฟฟ้ารายเดือน (รวมค่าบริการ)
function calculateMonthlyCost(energy: number): number {
  if (energy === 0) return 8.19; // กรณีใช้พลังงานเป็น 0 หน่วย

  let cost = 0;

  if (energy <= 150) {
    // ใช้พลังงานไม่เกิน 150 หน่วย
    cost = (Math.min(energy, 15) * 2.3488) +
           (Math.max(0, Math.min(energy - 15, 10)) * 2.9882) +
           (Math.max(0, Math.min(energy - 25, 10)) * 3.2405) +
           (Math.max(0, Math.min(energy - 35, 65)) * 3.6237) +
           (Math.max(0, Math.min(energy - 100, 50)) * 3.7171);
    cost += 8.19; // รวมค่าบริการขั้นต่ำ
  } else {
    // ใช้พลังงานเกิน 150 หน่วย
    cost = (150 * 3.2484) +
           (Math.max(0, Math.min(energy - 150, 250)) * 4.2218) +
           (Math.max(0, energy - 400) * 4.4217);
    cost += 24.62; // รวมค่าบริการคงที่
  }

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
// ฟังก์ชันดึงข้อมูล
const fetchData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    // ดึงข้อมูลรายวัน
    const start = startOfDay(new Date(selectedDate.value));
    const end = endOfDay(new Date(selectedDate.value));
    const response = await fetch(
      `http://localhost:4000/get-sensor-history?start=${start.toISOString()}&end=${end.toISOString()}`
    );

    if (!response.ok) throw new Error('ไม่สามารถดึงข้อมูลได้');
    let data = await response.json();
    
    // จัดการข้อมูลรายวัน
    if (data.length === 0) {
      sensorData.value = [];
    } else {
      sensorData.value = data.sort((a: SensorData, b: SensorData) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    }

    // ดึงข้อมูลรายเดือน
    const monthStart = startOfMonth(new Date(selectedDate.value));
    const monthEnd = endOfMonth(new Date(selectedDate.value));
    const monthResponse = await fetch(
      `http://localhost:4000/get-sensor-history?start=${monthStart.toISOString()}&end=${monthEnd.toISOString()}`
    );

    if (monthResponse.ok) {
      const monthData = await monthResponse.json();
      monthlyData.value = monthData.sort((a: SensorData, b: SensorData) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    }

  } catch (err) {
    error.value = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงข้อมูล';
    sensorData.value = [];
    monthlyData.value = [];
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
  fetchAvailableDates();
  fetchMonthlyData();
  fetchSwitchStatus(); // เรียกครั้งแรกเพื่อดึงสถานะเริ่มต้น
  
  // ลดความถี่ของการ fetch ข้อมูล
  const dataInterval = setInterval(fetchData, 60000); // ทุก 1 นาที
  const statusInterval = setInterval(fetchSwitchStatus, 10000); // ทุก 10 วินาที
  
  // Cleanup intervals เมื่อ component ถูกทำลาย
  onUnmounted(() => {
    clearInterval(dataInterval);
    clearInterval(statusInterval);
  });
});
</script>

<template>
  <nav class="bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-lg p-4 md:p-6">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <!-- Logo Section -->
      <div class="flex items-center gap-3">
        <img src="../assets/images/1.png" alt="Logo" class="h-10 w-10" />
        <span class="text-xl md:text-2xl font-bold text-blue-600">
          แพลตฟอร์มแสดงผลและจัดการพลังงานผ่านระบบ IOT
        </span>
      </div>

      <!-- Navigation Links -->
      <div class="hidden md:flex space-x-6">
        <router-link
          to="/"
          class="text-gray-600 font-medium hover:text-blue-600 transition-colors duration-200"
          :class="{ 'text-blue-600 font-bold': $route.path === '/' }"
        >
          หน้าหลัก
        </router-link>
        <router-link
          to="/monthly-summary"
          class="text-gray-600 font-medium hover:text-blue-600 transition-colors duration-200"
          :class="{ 'text-blue-600 font-bold': $route.path === '/monthly-summary' }"
        >
        รายละเอียด
        </router-link>
      </div>

      
    </div>

    
  </nav>


  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
    <div class="max-w-7xl mx-auto">

      <!-- Error Alert -->
      <div v-if="error" class="alert alert-error mb-6 bg-red-100 text-red-800 border border-red-400 rounded-lg p-4">
        <span>{{ error }}</span>
      </div>

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
    <div class="w-full max-w-xs">
      <CustomDatePicker
        v-model="selectedDate"
        :available-dates="availableDates"
        @date-selected="fetchData"
      />
    </div>
    <!-- <button
      @click="fetchData"
      class="btn btn-primary bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all"
    >
      อัปเดตข้อมูล
    </button> -->

    <!-- เพิ่มส่วนควบคุมไฟที่เข้าใจง่าย -->
  <div class="flex justify-between items-center">
    <div class="flex items-center gap-4">
      <!-- ไอคอนไฟ - เปลี่ยนสีตามสถานะ -->
      <div class="p-2 rounded-full" :class="[
        lightStatus 
          ? 'bg-red-100' 
          : 'bg-green-100'
      ]">
        <div class="h-10 w-10 flex items-center justify-center">
          <svg v-if="lightStatus" xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
      </div>
      <!-- ข้อความสถานะ -->
      <div>
        <h3 class="text-lg font-semibold text-gray-700">ควบคุมไฟ</h3>
        <p class="text-lg font-medium" :class="[
          lightStatus 
            ? 'text-red-500' 
            : 'text-green-500'
        ]">
          สถานะ: {{ lightStatus ? '🔴 ปิดการใช้งาน' : '🟢 เปิดใช้งาน' }}
        </p>
      </div>
    </div>

    <!-- ปุ่มควบคุม -->
    <button
      @click="toggleLight"
      :disabled="isLoading"
      class="px-10 ml-4 py-4 rounded-xl font-medium text-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50"
      :class="[
        lightStatus 
          ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500' 
          : 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-500'
      ]"
    >
      <span class="flex items-center gap-2">
        <span v-if="isLoading" class="animate-spin">⌛</span>
        {{ lightStatus ? '🔴 ปิดไฟ' : '🟢 เปิดไฟ' }}
      </span>
    </button>
  </div>

    <!-- <div>
    <label for="month-picker">เลือกเดือน:</label>
    <input type="month" id="month-picker" v-model="selectedMonth" @change="fetchMonthlyData" />
  </div> -->
  </div>

    <!-- Stats Cards Section - แสดงตลอดโดยไม่มีเงื่อนไข -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <!-- Daily Energy Card -->
      <div class="bg-white p-6 rounded-lg shadow-md flex items-center">
        <div class="mr-4">
          <img src="../assets/images/calendar.png" alt="Daily Energy Icon" class="h-12 w-12" />
        </div>
        <div>
          <div class="text-lg font-semibold text-gray-700">การใช้พลังงานในช่วงที่เลือก</div>
          <div class="text-3xl font-bold text-blue-600">{{ dailyEnergy }} kWh</div>
          <div class="text-md text-gray-500 mt-2">ค่าไฟฟ้า: {{ dailyCost }} บาท (ต่อวัน)</div>
        </div>
      </div>

      <!-- Monthly Energy Card -->
      <div class="bg-white p-6 rounded-lg shadow-md flex items-center">
        <div class="mr-4">
          <img src="../assets/images/month (1).png" alt="Monthly Energy Icon" class="h-12 w-12" />
        </div>
        <div>
          <div class="text-lg font-semibold text-gray-700">ค่าไฟฟ้าประมาณการรายเดือน</div>
          <div class="text-3xl font-bold text-pink-600">{{ monthlyEnergy }} kWh</div>
        </div>
      </div>

      <!-- Summary Electricity Cost Card -->
      <div class="bg-white p-6 rounded-lg shadow-md flex items-center">
        <div class="mr-4">
          <img src="../assets/images/eco-house.png" alt="Electricity Summary Icon" class="h-12 w-12" />
        </div>
        <div>
          <div class="text-lg font-semibold text-gray-700">ค่าไฟฟ้าสรุป</div>
          <div class="text-3xl font-bold text-green-600">{{ monthlyCost }} บาท</div>
          <div class="text-md text-gray-500 mt-2">ค่าไฟฟ้า (รวมค่าบริการต่างๆ)</div>
        </div>
      </div>

      <!-- Predicted Energy Card -->
  <div class="bg-white p-6 rounded-lg shadow-md flex items-center">
    <div class="mr-4">
      <img src="../assets/images/bill.png" alt="Prediction Icon" class="h-12 w-12" />
    </div>
    <div>
      <div class="text-lg font-semibold text-gray-700">ค่าไฟฟ้าพยากรณ์เดือนถัดไป</div>
      <div class="text-3xl font-bold text-gray-500 mt-2">ประมาณ {{ predictedCost }} บาท</div>
      <div class="text-md font-bold text-purple-600">{{ predictedEnergy }} kWh</div>
    </div>
  </div>

    </div>
    


    <!-- Chart Section - แสดงเฉพาะเมื่อมีข้อมูล -->
    <div v-if="sensorData.length > 0" class="relative bg-white p-6 rounded-lg shadow-md h-[400px]">
      <Line :data="chartData" :options="chartOptions" />
    </div>
    
    <!-- แสดงข้อความเมื่อไม่มีข้อมูล -->
    <div v-if="!isLoading && !sensorData.length" class="alert alert-info bg-blue-100 text-blue-800 border border-blue-400 rounded-lg p-4">
      <span>ไม่พบข้อมูลสำหรับวันที่เลือก กรุณาเลือกวันที่อื่น</span>
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
