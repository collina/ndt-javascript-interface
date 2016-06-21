angular.module('gettext').run(['gettextCatalog', function (gettextCatalog) {
/* jshint -W100 */
    gettextCatalog.setStrings('nl', {"Selected plugin was not loaded properly. Make sure that you have proper plugin installed, and that it is not being blocked by your browser.":"BLAH BLAH BLAD","Start Test":"RAWR","Test Again":">:3"});
/* jshint +W100 */
}]);