const express = require('express');
const router = express.Router();

// Get system settings
router.get('/', async (req, res) => {
  try {
    const db = global.db;
    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }
    
    const settings = await db.collection('settings').findOne({ type: 'system' });
    
    if (!settings) {
      // Return default settings if none exist
      return res.json({
        success: true,
        settings: {
          sssRate: 4.5,
          philhealthRate: 2.0,
          pagibigRate: 2.0,
          withholdingTaxRate: 15.0,
          overtimeMultiplier: 1.25,
          nightDiffRate: 10.0,
          holidayRate: 200.0,
          workingHoursPerDay: 8,
          workingDaysPerWeek: 5,
          currency: 'PHP',
          dateFormat: 'MM/DD/YYYY',
          timezone: 'Asia/Manila'
        }
      });
    }
    
    res.json({
      success: true,
      settings: settings.data
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
});

// Update system settings
router.put('/', async (req, res) => {
  try {
    const db = global.db;
    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable'
      });
    }
    
    const settingsData = req.body;
    
    const result = await db.collection('settings').updateOne(
      { type: 'system' },
      {
        $set: {
          type: 'system',
          data: settingsData,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
    
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: settingsData
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message
    });
  }
});

module.exports = router;
