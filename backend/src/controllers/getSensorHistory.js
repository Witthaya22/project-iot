const db = require("../config");

const getLatestSensorData = async (req, res) => {
  try {
    const [data] = await db("sensor_readings") // เปลี่ยนเป็น sensor_readings
      .orderBy("timestamp", "desc")
      .limit(1);

    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (!data || data.energy === 0) {  // เพิ่มการเช็คเพื่อให้ข้ามกรณีที่ energy เป็น 0
      return res.status(404).json({ message: "No data found" });
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching latest sensor data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getHistoricalData = async (req, res) => {
  const { limit = 1000, start, end } = req.query; // เพิ่ม default limit เพื่อให้ดึงข้อมูลได้เพียงพอ

  try {
    // Prepare query
    let query = db("sensor_readings").orderBy("timestamp", "desc"); // เปลี่ยนเป็น sensor_readings

    // ใช้ช่วงเวลา start และ end กรองข้อมูล
    if (start && end) {
      query = query.whereBetween("timestamp", [new Date(start), new Date(end)]);
    }

    // ตรวจสอบ limit
    if (limit) {
      query = query.limit(Number(limit));
    }

    // ดึงข้อมูลจากฐานข้อมูล
    let data = await query;

    // ตั้งค่าการอนุญาตสำหรับการเข้าถึงจากโดเมนต่าง ๆ
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // กรองข้อมูลที่ energy ไม่เท่ากับ 0
    data = data.filter(reading => reading.energy !== 0);

    // ตรวจสอบว่ามีข้อมูลหรือไม่
    if (data.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }

    // ส่งข้อมูลทั้งหมดกลับไป
    res.json(data);
  } catch (error) {
    console.error("Error fetching historical data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getLatestSensorData,
  getHistoricalData,
};
