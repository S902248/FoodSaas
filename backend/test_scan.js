require('dotenv').config();
const mockMongoose = require('./mockMongoose');
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'mongoose') {
    return mockMongoose;
  }
  return originalRequire.apply(this, arguments);
};

const QRCode = require('./models/QRCode');
const { trackScan } = require('./controllers/qrController');

async function test() {
  const req = {
    params: {
      id: '543dead4825b06ad9dd2de1b'
    }
  };
  const res = {
    json: (data) => {
      console.log('Response JSON:', data);
    },
    status: (code) => {
      console.log('Response Status:', code);
      return res;
    }
  };
  
  try {
    await trackScan(req, res);
  } catch (err) {
    console.error('Caught error:', err);
  }
}

test();

