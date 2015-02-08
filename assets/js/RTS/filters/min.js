'use strict';

angular.module('Rts', [])

.filter('min', function() {
    return function(number, max) {
        return Math.min(number, max);
    }
});