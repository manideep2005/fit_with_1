// Simple JSON test endpoint
module.exports = async (req, res) => {
  try {
    const testObject = {
      success: true,
      message: "This is a test",
      data: {
        number: 123,
        string: "hello",
        boolean: false,
        array: [1, 2, 3]
      }
    };

    if (req.query.method === 'send') {
      res.setHeader('Content-Type', 'application/json');
      return res.send(JSON.stringify(testObject));
    } else if (req.query.method === 'end') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify(testObject));
    } else {

      return res.json(testObject);
    }
    
  } catch (error) {
    console.error('JSON test error:', error);
    res.status(500).json({
      error: 'Test failed',
      message: error.message
    });
  }
};