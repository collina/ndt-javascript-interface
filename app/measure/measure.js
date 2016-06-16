'use strict';

angular.module('myApp.measure', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/measure', {
    templateUrl: 'measure/measure.html',
    controller: 'MeasureCtrl'
  });
}])

.controller('MeasureCtrl', [function() {
  jQuery.fx.interval = 50;
  if (simulate) {
    setTimeout(initializeTest, 1000);
    return;
  }
  checkInstalledPlugins();
  initializeTest();
}]);
