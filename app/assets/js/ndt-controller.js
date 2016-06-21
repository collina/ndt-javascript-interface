if (typeof simulate === 'undefined') {
  var simulate = false;
}

var allowDebug = true;
// CONSTANTS

// Testing phases

var PHASE_LOADING   = 0;
var PHASE_WELCOME   = 1;
var PHASE_PREPARING = 2;
var PHASE_UPLOAD    = 3;
var PHASE_DOWNLOAD  = 4;
var PHASE_RESULTS   = 5;


// STATUS VARIABLES
var use_websocket_client = false;
var websocket_client = null;
var currentPhase = PHASE_LOADING;
var currentPage = 'welcome';
var transitionSpeed = 400;

// A front-end implementation could define some specific server. If not, then
// just use the current server's hostname.

if (typeof window.ndtServer === 'undefined') {
  var ndtServer = location.hostname;
}

// Gauges used for showing download/upload speed
var downloadGauge, uploadGauge;
var gaugeUpdateInterval;
var gaugeMaxValue = 1000;

// PRIMARY METHODS

function initializeTest() {
  // Initialize gauges
  initializeGauges();

  // Initialize start buttons
  $('.start.button').click(startTest);

  $('body').removeClass('initializing');
  $('body').addClass('ready');
  //return showPage('results');
  setPhase(PHASE_WELCOME);
}

function startTest(evt) {
  // evt.stopPropagation();
  // evt.preventDefault();
  createBackend();
  if (!isPluginLoaded()) {
    $('#warning-plugin').show();
    return;
  }
  if (simulate) return simulateTest();
  currentPhase = PHASE_WELCOME;
  testNDT().run_test(ndtServer);
  monitorTest();
}

function simulateTest() {
  setPhase(PHASE_RESULTS);
  return;
  setPhase(PHASE_PREPARING);
  setTimeout(function(){ setPhase(PHASE_UPLOAD) }, 2000);
  setTimeout(function(){ setPhase(PHASE_DOWNLOAD) }, 4000);
  setTimeout(function(){ setPhase(PHASE_RESULTS) }, 6000);
}

function monitorTest() {
  var message = testError();
  var currentStatus = testStatus();

  /*
  var currentStatus = testStatus();
  debug(currentStatus);
  var diagnosis = testDiagnosis();
  debug(diagnosis);
  */

  if (message.match(/not run/) && currentPhase != PHASE_LOADING) {
    setPhase(PHASE_WELCOME);
    return false;
  }
  if (message.match(/completed/) && currentPhase < PHASE_RESULTS) {
    setPhase(PHASE_RESULTS);
    return true;
  }
  if (message.match(/failed/) && currentPhase < PHASE_RESULTS) {
    setPhase(PHASE_RESULTS);
    return false;
  }
  if (currentStatus.match(/Outbound/) && currentPhase < PHASE_UPLOAD) {
    setPhase(PHASE_UPLOAD);
  }
  if (currentStatus.match(/Inbound/) && currentPhase < PHASE_DOWNLOAD) {
    setPhase(PHASE_DOWNLOAD);
  }

  if (!currentStatus.match(/Middleboxes/) && !currentStatus.match(/notStarted/)
        && !remoteServer().match(/ndt/) && currentPhase == PHASE_PREPARING) {
    debug('Remote server is ' + remoteServer());
    setPhase(PHASE_UPLOAD);
  }

  if (remoteServer() !== 'unknown' && currentPhase < PHASE_PREPARING) {
    setPhase(PHASE_PREPARING);
  }

  setTimeout(monitorTest, 1000);
}



// PHASES

function setPhase(phase) {
  switch (phase) {

    case PHASE_WELCOME:
      debug('WELCOME');
      showPage('welcome');
      break;

    case PHASE_PREPARING:
      // uploadGauge.setValue(0);
      // downloadGauge.setValue(0);
      debug('PREPARING TEST');

      $('#loading').show();
      $('#upload').hide();
      $('#download').hide();

      break;

    case PHASE_UPLOAD:
      var pcBuffSpdLimit, rtt, gaugeConfig = [];
      debug('UPLOAD TEST');

      pcBuffSpdLimit = speedLimit();
      rtt = minRoundTrip();

      if (isNaN(rtt)) {
        $('#rttValue').html('n/a');
      } else {
        $('rttValue').html(printNumberValue(Math.round(rtt)) + ' ms');
      }

      if (!isNaN(pcBuffSpdLimit)) {
        if (pcBuffSpdLimit > gaugeMaxValue) {
          pcBuffSpdLimit = gaugeMaxValue;
        }
        // gaugeConfig.push({
        //   from: 0,   to: pcBuffSpdLimit, color: 'rgb(0, 255, 0)'
        // });
        //
        // gaugeConfig.push({
        //   from: pcBuffSpdLimit, to: gaugeMaxValue, color: 'rgb(255, 0, 0)'
        // });
        //
        // uploadGauge.updateConfig({
        //   highlights: gaugeConfig
        // });
        //
        // downloadGauge.updateConfig({
        //   highlights: gaugeConfig
        // });
      }

      $('#loading').hide();
      $('#upload').show();

      break;

    case PHASE_DOWNLOAD:
      debug('DOWNLOAD TEST');

      $('#upload').hide();
      $('#download').show();
      break;

    case PHASE_RESULTS:
      debug('SHOW RESULTS');
      debug('Testing complete');

      printDownloadSpeed();
      printUploadSpeed();
      $('#latency').html(printNumberValue(Math.round(minRoundTrip())));

      showPage('results');
      break;

    default:
      return false;
  }
  currentPhase = phase;
}


// PAGES

function showPage(page, callback) {
  debug('Show page: ' + page);
  if (page == currentPage) {
    if (callback !== undefined) callback();
    return true;
  }
  if (currentPage !== undefined) {
    $('#' + currentPage).fadeOut(transitionSpeed, function(){
      $('#' + page).fadeIn(transitionSpeed, callback);
    });
  }
  else {
    debug('No current page');
    $('#' + page).fadeIn(transitionSpeed, callback);
  }
  currentPage = page;
}


// RESULTS

function showResultsSummary() {
  showResultsPage('summary');
}

// GAUGE

function initializeGauges() {
  var gaugeValues = [];

  for (var i=0; i<=10; i++) {
    gaugeValues.push(0.1 * gaugeMaxValue * i);
  }
  // uploadGauge = new Gauge({
  //   renderTo    : 'uploadGauge',
  //   width       : 270,
  //   height      : 270,
  //   units       : 'Mb/s',
  //   title       : 'Upload',
  //   minValue    : 0,
  //   maxValue    : gaugeMaxValue,
  //   majorTicks  : gaugeValues,
  //   highlights  : [{ from: 0, to: gaugeMaxValue, color: 'rgb(0, 255, 0)' }]
  // });;

  gaugeValues = [];
  for (var i=0; i<=10; i++) {
    gaugeValues.push(0.1 * gaugeMaxValue * i);
  }
  // downloadGauge = new Gauge({
  //   renderTo    : 'downloadGauge',
  //   width       : 270,
  //   height      : 270,
  //   units       : 'Mb/s',
  //   title       : 'Download',
  //   minValue    : 0,
  //   maxValue    : gaugeMaxValue,
  //   majorTicks  : gaugeValues,
  //   highlights  : [{ from: 0, to: gaugeMaxValue, color: 'rgb(0, 255, 0)' }]
  // });;
}

// TESTING JAVA/WEBSOCKET CLIENT

function testNDT() {
  if (websocket_client) {
    return websocket_client;
  }

  return $('#NDT');
}

function testStatus() {
  return testNDT().get_status();
}

function testError() {
  return testNDT().get_errmsg();
}

function remoteServer() {
  if (simulate) return '0.0.0.0';
  return testNDT().get_host();
}

function uploadSpeed(raw) {
  if (simulate) return 0;
  var speed = testNDT().getNDTvar('ClientToServerSpeed');
  return raw ? speed : parseFloat(speed);
}

function downloadSpeed() {
  if (simulate) return 0;
  return parseFloat(testNDT().getNDTvar('ServerToClientSpeed'));
}

function minRoundTrip() {
  if (simulate) return 0;
  return parseFloat(testNDT().getNDTvar('MinRTT'));
}

function jitter() {
  if (simulate) return 0;
  return parseFloat(testNDT().getNDTvar('Jitter'));
}

function speedLimit() {
  if (simulate) return 0;
  return parseFloat(testNDT().get_PcBuffSpdLimit());
}

function printPacketLoss() {
  var packetLoss = parseFloat(testNDT().getNDTvar('loss'));
  packetLoss = (packetLoss*100).toFixed(2);
  return packetLoss;
}

function getSpeedUnit(speedInKB) {
  var unit = ['kb/s', 'Mb/s', 'Gb/s', 'Tb/s', 'Pb/s', 'Eb/s'];
  var e = Math.floor(Math.log(speedInKB*1000) / Math.log(1000));
  return unit[e];
}

function getJustfiedSpeed(speedInKB) {
  var e = Math.floor(Math.log(speedInKB) / Math.log(1000));
  return (speedInKB / Math.pow(1000, e)).toFixed(2);
}

function printDownloadSpeed() {
  var downloadSpeedVal = downloadSpeed();
  $('#download-speed').html(getJustfiedSpeed(downloadSpeedVal));
  $('#download-speed-units').html(getSpeedUnit(downloadSpeedVal));
}

function printUploadSpeed() {
  var uploadSpeedVal = uploadSpeed(false);
  $('#upload-speed').html(getJustfiedSpeed(uploadSpeedVal));
  $('#upload-speed-units').html(getSpeedUnit(uploadSpeedVal));
}

function readNDTvar(variable) {
  var ret = testNDT().getNDTvar(variable);
  return !ret ? '-' : ret;
}

function printNumberValue(value) {
  return isNaN(value) ? '-' : value;
}

// BACKEND METHODS

function useWebsocketAsBackend() {
  $('#rtt').hide();
  $('#rttValue').hide();

  use_websocket_client = true;
}

function createBackend() {
  if (use_websocket_client) {
    websocket_client = new NDTWrapper(window.ndtServer.fqdn);
  }
}

// UTILITIES

function debug(message) {
  if (typeof allowDebug !== 'undefined') {
    if (allowDebug && window.console) console.debug(message);
  }
}

function isPluginLoaded() {
  try {
    testStatus();
    return true;
  } catch(e) {
    return false;
  }
}

function checkInstalledPlugins() {
  var hasWebsockets = false;

  $('#warning-websocket').hide();

  hasWebsockets = false;
  try {
    var ndt_js = new NDTjs();
    if (ndt_js.checkBrowserSupport()) {
      hasWebsockets = true;
    }
  } catch(e) {
    hasWebsockets = false;
  }

  if (hasWebsockets) {
    useWebsocketAsBackend();
  }
}

// Attempts to determine the absolute path of a script, minus the name of the
// script itself.
function getScriptPath() {
  var scripts = document.getElementsByTagName('SCRIPT');
  var fileRegex = new RegExp('\/ndt-wrapper\.js$');
  var path = '';
  if (scripts && scripts.length > 0) {
    for(var i in scripts) {
      if(scripts[i].src && scripts[i].src.match(fileRegex)) {
        path = scripts[i].src.replace(fileRegex, '');
        break;
      }
    }
  }
  return path.substring(location.origin.length);
};
