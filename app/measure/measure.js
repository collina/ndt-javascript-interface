'use strict';

angular.module('Measure.measure', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/measure', {
    templateUrl: 'measure/measure.html',
    controller: 'MeasureCtrl'
  });
}])

.controller('MeasureCtrl', function($scope, $rootScope, $interval, ndtServer) {

  var ndtSemaphore = false;

  jQuery.fx.interval = 50;
  checkInstalledPlugins();
  initializeTest();
  useWebsocketAsBackend();
  $scope.measurementComplete = false;

  var aProgress = document.getElementById('activeProgress');
  // var iProgress = document.getElementById('inactiveProgress');
  // var iProgressCTX = iProgress.getContext('2d');

  // drawInactive(iProgressCTX);


  function drawInactive(iProgressCTX){
    iProgressCTX.lineCap = 'square';

    //outer ring
    // iProgressCTX.beginPath();
    // iProgressCTX.lineWidth = 15;
    // iProgressCTX.strokeStyle = '#e1e1e1';
    // iProgressCTX.arc(137.5,137.5,129,0,2*Math.PI);
    // iProgressCTX.stroke();

    //progress bar
    // iProgressCTX.beginPath();
    // iProgressCTX.lineWidth = 0;
    // iProgressCTX.fillStyle = '#e6e6e6';
    // iProgressCTX.arc(137.5,137.5,121,0,2*Math.PI);
    // iProgressCTX.fill();

    //progressbar caption
    // iProgressCTX.beginPath();
    // iProgressCTX.lineWidth = 0;
    // iProgressCTX.fillStyle = '#fff';
    // iProgressCTX.arc(137.5,137.5,100,0,2*Math.PI);
    // iProgressCTX.fill();

  }
  function drawProgress(bar, percentage, inactive){
    var barCTX = bar.getContext("2d");
    var quarterTurn = Math.PI / 2;
    var endingAngle = ((2*percentage) * Math.PI) - quarterTurn;
    var startingAngle = 0 - quarterTurn;

    if (inactive === true) {
      startingAngle = 0;
      endingAngle = 360;
    }

    bar.width = bar.width;
    barCTX.lineCap = 'square';

    barCTX.beginPath();
    barCTX.lineWidth = 20;
    if (inactive === true) {
      barCTX.strokeStyle = '#ACA3CF';
    } else {
      barCTX.strokeStyle = '#FFFFFF';
    }
    barCTX.arc(137.5,137.5,111,startingAngle, endingAngle);
    barCTX.stroke();
  }

  drawProgress(aProgress, 0, true);
  $scope.currentPhase = 'Download';
  $scope.currentSpeed = '100 Mbps';

  $rootScope.$on('foundServer', function(triggeredEvent, passedServer) {
    $scope.location = passedServer.city + ", " + passedServer.country;
    $scope.address = passedServer.fqdn;
  });

  $scope.startTest = function () {
    var timeStarted,
        timeRunning,
        timeProgress,
        TIME_EXPECTED = 20 * 1000;
    if (ndtSemaphore == true) {
      return;
    }
    ndtSemaphore = true;
    $scope.startButton = 'disabled';
    $scope.measurementComplete = false;


    startTest();

    $interval(function() {
      var downloadSpeedVal = downloadSpeed();
      var uploadSpeedVal = uploadSpeed(false);

      if (currentPhase > 2) {
        if (timeStarted === undefined && currentPhase != undefined) {
          timeStarted = new Date().getTime();
        }
        timeRunning = new Date().getTime() - timeStarted;
        timeProgress = timeRunning / TIME_EXPECTED;
        console.log(currentPhase, timeProgress);
        drawProgress(aProgress, timeProgress, false);
      }

      if (currentPhase == PHASE_UPLOAD) {
        $scope.currentPhase = 'Upload';
        $scope.currentSpeed = getJustfiedSpeed(uploadSpeedVal);
      } else if (currentPhase == PHASE_DOWNLOAD) {
        $scope.currentPhase = 'Download';
        $scope.currentSpeed = getJustfiedSpeed(downloadSpeedVal);
      } else if (currentPhase == PHASE_RESULTS) {
        $scope.currentPhase = 'Complete';
        $scope.currentSpeed = '';
        $scope.measurementComplete = true;
        $scope.measurementResult = {
          's2cRate': downloadSpeed(),
          'c2sRate': uploadSpeed(),
          'latency': readNDTvar('MinRTT'),
          'loss': readNDTvar('loss')
        };
        ndtSemaphore = false;
        $scope.startButton = '';

        $interval.cancel();
      }

    }, 100);
  }
});
