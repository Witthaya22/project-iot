<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6">
    <div class="container mx-auto">
      <!-- ส่วนหัวพร้อมสัญลักษณ์สด -->
      <div class="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div class="flex items-center space-x-4">
          <h1 class="text-4xl font-bold text-gray-900">ระบบติดตามเซ็นเซอร์</h1>
          <div 
            class="flex items-center space-x-2 bg-red-500 text-white px-3 py-1 rounded-full animate-pulse"
          >
            <div class="w-2 h-2 bg-white rounded-full"></div>
            <span class="text-sm font-medium">ถ่ายทอดสด</span>
          </div>
        </div>
        
        <!-- ตัวควบคุมช่วงวันที่ -->
        <div class="flex flex-wrap gap-4 items-center">
          <div class="form-control">
            <label class="label">
              <span class="label-text text-gray-700">วันที่เริ่มต้น</span>
            </label>
            <input 
              type="datetime-local" 
              v-model="startDate"
              class="input input-bordered bg-white hover:border-blue-500 transition-colors" 
            />
          </div>
          <div class="form-control">
            <label class="label">
              <span class="label-text text-gray-700">วันที่สิ้นสุด</span>
            </label>
            <input 
              type="datetime-local" 
              v-model="endDate"
              class="input input-bordered bg-white hover:border-blue-500 transition-colors" 
            />
          </div>
          <button 
  @click="fetchData" 
  class="btn btn-primary mt-6 hover:bg-blue-700 transition-colors flex items-center"
>
  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
    <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
  </svg>
  อัปเดตข้อมูล
</button>
        </div>
      </div>

      <!-- การ์ดกราฟหลัก -->
      <div class="card bg-white shadow-2xl rounded-2xl overflow-hidden mb-6 border-t-4 border-blue-500">
        <div class="card-body p-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="card-title text-2xl font-bold text-gray-800">
              ข้อมูลเซ็นเซอร์รวม
            </h2>
            <div class="badge badge-primary badge-outline">
              การวิเคราะห์แบบเรียลไทม์
            </div>
          </div>
          
          <div class="w-full h-[500px]">
            <client-only>
              <Line
                v-if="sensorData.length"
                :data="chartData"
                :options="chartOptions"
                class="h-full w-full"
              />
              <div v-else class="flex items-center justify-center h-full">
                <span class="loading loading-spinner loading-lg text-blue-500"></span>
              </div>
            </client-only>
          </div>
        </div>
      </div>

      <!-- การ์ดค่าปัจจุบัน -->
      <!-- <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
        <div 
          v-for="(value, key) in latestValues" 
          :key="key" 
          class="card bg-white shadow-md hover:shadow-xl transition-all transform hover:-translate-y-2 rounded-xl border-l-4 border-blue-500"
        >
          <div class="card-body p-4">
            <div class="flex justify-between items-center mb-2">
              <h3 class="text-sm font-medium text-gray-600">
                {{ formatLabel(key) }}
              </h3>
              <div class="badge badge-ghost">ปัจจุบัน</div>
            </div>
            <p class="text-2xl font-bold text-gray-800 flex items-center">
              {{ formatValue(value, key) }}
            </p>
          </div>
        </div>
      </div> -->
    </div>
  </div>


<!-- เพิ่มหลัง card ค่าปัจจุบัน -->
<div v-if="sensorStatistics" class="mt-6 bg-white shadow-md rounded-xl p-6">
  <h2 class="text-2xl font-bold text-gray-800 mb-4">สรุปสถิติและคุณภาพพลังงาน</h2>
  
  <!-- ตารางสรุปสถิติ -->
  <div class="overflow-x-auto">
    <table class="w-full text-sm text-left text-gray-500">
  <thead class="text-xs text-gray-700 uppercase bg-gray-50">
    <tr>
      <th class="px-4 py-3">หมวดหมู่</th>
      <th class="px-4 py-3">ต่ำสุด</th>
      <th class="px-4 py-3">สูงสุด</th>
      <th class="px-4 py-3">เฉลี่ย</th>
      <th class="px-4 py-3">จำนวนค่าผิดปกติ</th>
      <th class="px-4 py-3">อัตราค่าผิดปกติ</th>
      <th class="px-4 py-3">สถานะ</th>
    </tr>
  </thead>
  <tbody>
    <tr 
      v-for="stat in summaryStatistics" 
      :key="stat.category"
      class="border-b hover:bg-gray-50 transition-colors"
    >
      <td class="px-4 py-3 font-medium text-gray-900">
        {{ stat.category }}
      </td>
      <td class="px-4 py-3">{{ stat.min }}</td>
      <td class="px-4 py-3">{{ stat.max }}</td>
      <td class="px-4 py-3">{{ stat.avg }}</td>
      <td class="px-4 py-3">
        <span 
          :class="{
            'text-green-600': stat.anomalies === 0,
            'text-yellow-600': stat.anomalies > 0 && stat.anomalies <= 5,
            'text-red-600': stat.anomalies > 5
          }"
        >
          {{ stat.anomalies }} ค่า
        </span>
      </td>
      <td class="px-4 py-3">
        <span 
          :class="{
            'text-green-600': parseFloat(stat.anomalyRate) <= 10,
            'text-yellow-600': parseFloat(stat.anomalyRate) > 10 && parseFloat(stat.anomalyRate) <= 20,
            'text-red-600': parseFloat(stat.anomalyRate) > 20
          }"
        >
          {{ stat.anomalyRate }}
        </span>
      </td>
      <td class="px-4 py-3">
        <span 
          :class="{
            'text-green-600': stat.stability === 'เสถียร',
            'text-red-600': stat.stability === 'ไม่เสถียร'
          }"
        >
          {{ stat.stability }}
        </span>
      </td>
    </tr>
  </tbody>
</table>
  </div>

  <!-- คุณภาพพลังงาน -->
  <div v-if="sensorStatistics?.energyQuality" class="mt-6">
    
    <h3 class="text-xl font-semibold text-gray-800 mb-4">คุณภาพพลังงาน</h3>
    <div v-if="sensorStatistics?.energyQuality" class="mt-6 bg-gray-50 p-4 rounded-lg">
    <h3 class="text-xl font-semibold text-gray-800 mb-4">คำแนะนำการปรับปรุง</h3>
    <ul class="space-y-2">
      <li v-if="sensorStatistics.energyQuality.powerFactor.status !== 'ดี'" 
          class="text-yellow-600 flex items-center">
        <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        {{ sensorStatistics.energyQuality.powerFactor.recommendation }}
      </li>
      <!-- เพิ่มคำแนะนำสำหรับฮาร์โมนิกและประสิทธิภาพพลังงานในทำนองเดียวกัน -->
    </ul>
  </div>

    <div class="grid grid-cols-3 gap-4 mt-6">
      <div class="bg-gray-50 p-4 rounded-lg">
        <h4 class="font-medium text-gray-700 mb-2">ตัวประกอบกำลัง</h4>
        <p 
          :class="{
            'text-green-600': sensorStatistics.energyQuality.powerFactor.status === 'ดี',
            'text-yellow-600': sensorStatistics.energyQuality.powerFactor.status === 'พอใช้',
            'text-red-600': sensorStatistics.energyQuality.powerFactor.status === 'ต้องปรับปรุง'
          }"
        >
          {{ sensorStatistics.energyQuality.powerFactor.status }}
        </p>
      </div>
      <div class="bg-gray-50 p-4 rounded-lg">
        <h4 class="font-medium text-gray-700 mb-2">ฮาร์โมนิก</h4>
        <p 
          :class="{
            'text-green-600': sensorStatistics.energyQuality.harmonicDistortion.status === 'ต่ำ',
            'text-yellow-600': sensorStatistics.energyQuality.harmonicDistortion.status === 'ปานกลาง',
            'text-red-600': sensorStatistics.energyQuality.harmonicDistortion.status === 'สูง'
          }"
        >
          {{ sensorStatistics.energyQuality.harmonicDistortion.status }}
        </p>
      </div>
      <div class="bg-gray-50 p-4 rounded-lg">
        <h4 class="font-medium text-gray-700 mb-2">ประสิทธิภาพพลังงาน</h4>
        <p 
          :class="{
            'text-green-600': sensorStatistics.energyQuality.energyEfficiency.status === 'ประหยัด',
            'text-yellow-600': sensorStatistics.energyQuality.energyEfficiency.status === 'ปานกลาง',
            'text-red-600': sensorStatistics.energyQuality.energyEfficiency.status === 'สูง'
          }"
        >
          {{ sensorStatistics.energyQuality.energyEfficiency.status }}
        </p>
      </div>
    </div>
  </div>
  
</div>



<div v-if="isLoading" class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
  <span class="loading loading-spinner loading-lg text-white"></span>
</div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Line } from 'vue-chartjs'

// Chart.js Registration
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

// State Variables
const sensorData = ref([])
const startDate = ref('')
const endDate = ref('')
const isLoading = ref(false)
const error = ref(null)

// Chart Options Configuration
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        usePointStyle: true,
        padding: 20,
        font: {
          family: "'Inter', sans-serif",
          size: 12
        }
      }
    },
    tooltip: {
      mode: 'index',
      intersect: false
    }
  },
  scales: {
    y: {
      type: 'linear',
      display: true,
      position: 'left',
      grid: {
        drawOnChartArea: true,
        color: 'rgba(0, 0, 0, 0.05)'
      }
    }
  },
  elements: {
    line: {
      tension: 0.3 
    },
    point: {
      radius: 2 
    }
  }
}
const formatTimestamp = computed(() => {
  if (!sensorData.value.length) return 'ไม่มีข้อมูล'
  const lastTimestamp = sensorData.value[sensorData.value.length - 1].timestamp
  return lastTimestamp 
    ? new Date(lastTimestamp).toLocaleString() 
    : 'ไม่สามารถอ่านค่าได้'
})


// Combined Chart Data
const chartData = computed(() => ({
  labels: sensorData.value.map(d => formatDate(d.timestamp)),
  datasets: [
    {
      label: 'Voltage (V)',
      data: sensorData.value.map(d => d.voltage),
      borderColor: 'rgb(59, 130, 246)', 
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      yAxisID: 'y'
    },
    {
      label: 'Current (A)',
      data: sensorData.value.map(d => d.current),
      borderColor: 'rgb(234, 88, 12)', 
      backgroundColor: 'rgba(234, 88, 12, 0.5)',
      yAxisID: 'y'
    },
    {
      label: 'Power (W)',
      data: sensorData.value.map(d => d.power),
      borderColor: 'rgb(34, 197, 94)', 
      backgroundColor: 'rgba(34, 197, 94, 0.5)',
      yAxisID: 'y'
    },
    {
      label: 'Energy (kWh)',
      data: sensorData.value.map(d => d.energy),
      borderColor: 'rgb(168, 85, 247)', 
      backgroundColor: 'rgba(168, 85, 247, 0.5)',
      yAxisID: 'y'
    },
    {
      label: 'Frequency (Hz)',
      data: sensorData.value.map(d => d.frequency),
      borderColor: 'rgb(236, 72, 153)', 
      backgroundColor: 'rgba(236, 72, 153, 0.5)',
      yAxisID: 'y'
    },
    {
      label: 'Power Factor',
      data: sensorData.value.map(d => d.pf),
      borderColor: 'rgb(45, 212, 191)', 
      backgroundColor: 'rgba(45, 212, 191, 0.5)',
      yAxisID: 'y'
    }
  ]
}))

// Latest values for cards
const latestValues = computed(() => {
  if (!sensorData.value.length) return {}
  const latest = sensorData.value[sensorData.value.length - 1]
  return {
    id: latest.id || 'N/A',
    voltage: `${latest.voltage.toFixed(2)}V`,
    current: `${latest.current.toFixed(2)}A`,
    power: `${latest.power.toFixed(2)}W`,
    energy: `${latest.energy.toFixed(2)}kWh`,
    frequency: `${latest.frequency.toFixed(2)}Hz`,
    pf: latest.pf.toFixed(2),
    timestamp: formatTimestamp.value
  }
})

const validateSensorData = (data) => {
  const requiredFields = [
    'id', 'voltage', 'current', 'power', 
    'energy', 'frequency', 'pf', 'timestamp'
  ]

  return data.map(item => {
    // สร้างออบเจ็กต์ใหม่เพื่อป้องกันการแก้ไขข้อมูลต้นฉบับ
    const validatedItem = {...item}
    
    requiredFields.forEach(field => {
      // ถ้าไม่มีค่าหรือเป็น null ให้ใส่ค่าเริ่มต้น
      if (validatedItem[field] === undefined || validatedItem[field] === null) {
        switch(field) {
          case 'id':
            validatedItem[field] = 'N/A'
            break
          case 'timestamp':
            validatedItem[field] = new Date().toISOString()
            break
          default:
            validatedItem[field] = 0
        }
      }
    })

    return validatedItem
  })
}

// Helper functions
const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString()
}

const formatLabel = (key) => {
  const labels = {
    voltage: 'แรงดันไฟฟ้า',
    current: 'กระแสไฟฟ้า',
    power: 'กำลังไฟฟ้า',
    energy: 'พลังงาน',
    frequency: 'ความถี่',
    pf: 'ตัวประกอบกำลัง'
  }
  return labels[key] || key
}

const formatValue = (value, key) => {
  const units = {
    voltage: 'V',
    current: 'A',
    power: 'W',
    energy: 'kWh',
    frequency: 'Hz',
    pf: ''
  }
  return `${Number(value).toFixed(2)}${units[key] || ''}`
}
const fetchData = async () => {
  // Prevent multiple simultaneous requests
  if (isLoading.value) return

  isLoading.value = true
  error.value = null
  
  try {
    // Add timeout and abort controller
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 seconds timeout

    const response = await fetch(
      `http://localhost:4000/get-sensor-history?start=${startDate.value}&end=${endDate.value}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const validatedData = validateSensorData(data)
    
    sensorData.value = validatedData
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No data received')
    }

    // Update data and statistics
    sensorData.value = validatedData
    sensorStatistics.value = {
      metrics: calculateStatistics(data),
      anomalies: detectAnomalies(data),
      energyQuality: assessEnergyQuality(data)
    }

    // Optional: Add a toast notification for successful data fetch
    if (process.client) {
      const toast = useToast()
      toast.success('Data updated successfully', { 
        position: 'top-right', 
        duration: 2000 
      })
    }
  } catch (err) {
    console.error('Detailed Fetch Error:', {
      message: err.message,
      name: err.name,
      stack: err.stack
    })

    error.value = err.message || 'An unexpected error occurred'
    
    // Show error toast
    if (process.client) {
      const toast = useToast()
      toast.error(error.value, {
        position: 'top-right',
        duration: 3000
      })
    }
  } finally {
    isLoading.value = false
  }
}

// Initialize date range to last hour
onMounted(() => {
  const end = new Date()
  const start = new Date()
  start.setHours(start.getHours() - 1)
  
  startDate.value = start.toISOString().slice(0, 16)
  endDate.value = end.toISOString().slice(0, 16)
  
  fetchData()
})

// Optional: Reactive data refresh
const refreshInterval = ref(null)
const startAutoRefresh = () => {
  refreshInterval.value = setInterval(() => {
    fetchData()
  }, 30000) // Refresh every 30 seconds
}

const stopAutoRefresh = () => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
}

// Lifecycle hooks
onMounted(startAutoRefresh)
onUnmounted(stopAutoRefresh)
// เพิ่ม state สำหรับสถิติ
const sensorStatistics = ref(null)

// เพิ่มฟังก์ชันคำนวณสถิติ
const calculateStatistics = (data) => {
  if (!data || data.length === 0) return null

  const statistics = {
    voltage: calculateMetrics(data, 'voltage'),
    current: calculateMetrics(data, 'current'),
    power: calculateMetrics(data, 'power'),
    energy: calculateMetrics(data, 'energy'),
    frequency: calculateMetrics(data, 'frequency'),
    pf: calculateMetrics(data, 'pf')
  }

  return statistics
}

const calculateMetrics = (data, key) => {
  const values = data.map(item => item[key])
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    total: values.reduce((a, b) => a + b, 0)
  }
}

// เพิ่มการประเมินความผิดปกติ
const detectAnomalies = (data) => {
  const anomalies = {}
  const keys = ['voltage', 'current', 'power', 'energy', 'frequency', 'pf']

  keys.forEach(key => {
    const stats = calculateMetrics(data, key)
    const stdDev = calculateStandardDeviation(data.map(item => item[key]))
    
    anomalies[key] = {
      outliers: data.filter(item => 
        Math.abs(item[key] - stats.avg) > (2 * stdDev)
      ),
      isUnstable: stdDev > (stats.avg * 0.2) // ถ้า std dev เกิน 20% ของค่าเฉลี่ย
    }
  })

  return anomalies
}

const calculateStandardDeviation = (values) => {
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const squareDiffs = values.map(value => Math.pow(value - avg, 2))
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(avgSquareDiff)
}

// เพิ่มการประเมินคุณภาพพลังงาน
const assessEnergyQuality = (data) => {
  if (!data || data.length === 0) return null

  const lastEntry = data[data.length - 1]
  
  return {
    powerFactor: {
      value: lastEntry.pf,
      status: lastEntry.pf >= 0.9 ? 'ดี' : 
              lastEntry.pf >= 0.7 ? 'พอใช้' : 'ต้องปรับปรุง',
      recommendation: lastEntry.pf < 0.7 
        ? 'ควรปรับปรุงระบบไฟฟ้าเพื่อเพิ่มประสิทธิภาพ' 
        : 'คุณภาพตัวประกอบกำลังอยู่ในเกณฑ์ดี'
    },
    harmonicDistortion: {
      value: lastEntry.thd || 'N/A',
      status: lastEntry.thd < 5 ? 'ต่ำ' : 
              lastEntry.thd < 10 ? 'ปานกลาง' : 'สูง',
      recommendation: lastEntry.thd > 10 
        ? 'ตรวจสอบและลดฮาร์โมนิกในระบบ' 
        : 'ระดับฮาร์โมนิกอยู่ในเกณฑ์ปกติ'
    },
    energyEfficiency: {
      consumptionRate: lastEntry.power,
      status: lastEntry.power < 1000 ? 'ประหยัด' : 
              lastEntry.power < 2000 ? 'ปานกลาง' : 'สูง',
      recommendation: lastEntry.power > 2000 
        ? 'ควรตรวจสอบการใช้พลังงาน' 
        : 'การใช้พลังงานมีประสิทธิภาพ'
    }
  }
}

// เพิ่ม computed property สำหรับแสดงผล
const summaryStatistics = computed(() => {
  if (!sensorStatistics.value) return []

  const { metrics, anomalies } = sensorStatistics.value

  // ฟังก์ชันช่วยประเมินความเสถียรภาพ
  const assessStability = (anomalyCount, totalDataPoints) => {
    const anomalyPercentage = (anomalyCount / totalDataPoints) * 100
    
    return {
      status: anomalyPercentage > 20 ? 'ไม่เสถียร' : 'เสถียร',
      anomalyRate: anomalyPercentage.toFixed(2) + '%'
    }
  }

  // คำนวณจำนวนจุดข้อมูลทั้งหมด (สมมติว่าเป็น 100 จุด)
  const totalDataPoints = 100

  return [
    {
      category: 'แรงดันไฟฟ้า',
      min: `${metrics.voltage.min.toFixed(2)} V`,
      max: `${metrics.voltage.max.toFixed(2)} V`,
      avg: `${metrics.voltage.avg.toFixed(2)} V`,
      anomalies: anomalies.voltage.outliers.length,
      stability: assessStability(
        anomalies.voltage.outliers.length, 
        totalDataPoints
      ).status,
      anomalyRate: assessStability(
        anomalies.voltage.outliers.length, 
        totalDataPoints
      ).anomalyRate
    },
    {
      category: 'กระแสไฟฟ้า',
      min: `${metrics.current.min.toFixed(2)} A`,
      max: `${metrics.current.max.toFixed(2)} A`,
      avg: `${metrics.current.avg.toFixed(2)} A`,
      anomalies: anomalies.current.outliers.length,
      stability: assessStability(
        anomalies.current.outliers.length, 
        totalDataPoints
      ).status,
      anomalyRate: assessStability(
        anomalies.current.outliers.length, 
        totalDataPoints
      ).anomalyRate
    },
    {
      category: 'กำลังไฟฟ้า',
      min: `${metrics.power.min.toFixed(2)} W`,
      max: `${metrics.power.max.toFixed(2)} W`,
      avg: `${metrics.power.avg.toFixed(2)} W`,
      anomalies: anomalies.power.outliers.length,
      stability: assessStability(
        anomalies.power.outliers.length, 
        totalDataPoints
      ).status,
      anomalyRate: assessStability(
        anomalies.power.outliers.length, 
        totalDataPoints
      ).anomalyRate
    },
    {
      category: 'พลังงาน',
      min: `${metrics.energy.min.toFixed(2)} kWh`,
      max: `${metrics.energy.max.toFixed(2)} kWh`,
      avg: `${metrics.energy.avg.toFixed(2)} kWh`,
      anomalies: anomalies.energy.outliers.length,
      stability: assessStability(
        anomalies.energy.outliers.length, 
        totalDataPoints
      ).status,
      anomalyRate: assessStability(
        anomalies.energy.outliers.length, 
        totalDataPoints
      ).anomalyRate
    },
    {
      category: 'ความถี่',
      min: `${metrics.frequency.min.toFixed(2)} Hz`,
      max: `${metrics.frequency.max.toFixed(2)} Hz`,
      avg: `${metrics.frequency.avg.toFixed(2)} Hz`,
      anomalies: anomalies.frequency.outliers.length,
      stability: assessStability(
        anomalies.frequency.outliers.length, 
        totalDataPoints
      ).status,
      anomalyRate: assessStability(
        anomalies.frequency.outliers.length, 
        totalDataPoints
      ).anomalyRate
    },
    {
      category: 'ตัวประกอบกำลัง',
      min: `${metrics.pf.min.toFixed(2)}`,
      max: `${metrics.pf.max.toFixed(2)}`,
      avg: `${metrics.pf.avg.toFixed(2)}`,
      anomalies: anomalies.pf.outliers.length,
      stability: assessStability(
        anomalies.pf.outliers.length, 
        totalDataPoints
      ).status,
      anomalyRate: assessStability(
        anomalies.pf.outliers.length, 
        totalDataPoints
      ).anomalyRate
    }
  ]
})
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>