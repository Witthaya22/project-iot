const db = require('../config')

const getHistoricalData = async (req, res) => {
  const { start, end } = req.query
  
  // Validate input
  if (!start || !end) {
    return res.status(400).json({ 
      error: 'Start and end dates are required' 
    })
  }

  try {
    const data = await db('sensor_data')
      .whereBetween('timestamp', [start, end])
      .orderBy('timestamp', 'asc')
      .limit(1000) // Limit data to prevent overloading

    // Comprehensive CORS handling
    res.header('Access-Control-Allow-Origin', '*') // Or specific origin
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    // Check if data exists
    if (data.length === 0) {
      return res.status(404).json({ 
        message: 'No data found for the specified time range' 
      })
    }

    res.json(data)
  } catch (error) {
    console.error('Error fetching historical data:', error)
    res.status(500).json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? error.message : null 
    })
  }
}

module.exports = getHistoricalData