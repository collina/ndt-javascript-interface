'use strict';

// Declare app level module which depends on views, and components
angular.module('Measure', [
  'ngRoute',
  'gettext',
  'Measure.measure',
  'Measure.MeasurementLab',
])

.value('ndtServer', {})

.config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
  $locationProvider.hashPrefix('!');

  $routeProvider.otherwise({redirectTo: '/measure'});
}])

.run(function (gettextCatalog) {
  var availableLanguages = ['en'];

  console.log(Modernizr.websockets);
  availableLanguages = availableLanguages.concat(Object.keys(gettextCatalog.strings));
  gettextCatalog.setCurrentLanguage('nl');
})

.run(function (MLabService, ndtServer, $rootScope) {

  MLabService.findServer().then(
    function(foundServer) {
      ndtServer.fqdn = foundServer.fqdn;
      ndtServer.city = foundServer.city;
      ndtServer.country = foundServer.country;
      window.ndtServer = foundServer;
      $rootScope.$emit('foundServer', foundServer);
    },
    function(failureNotification) {console.log(failureNotification)}
  );


});
