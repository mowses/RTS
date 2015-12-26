'use strict';

angular.module('Rts', [])

.filter('join', function() {
    return function(arr, joiner) {
        if (!arr) return;

        return arr.join(joiner);
    }
});