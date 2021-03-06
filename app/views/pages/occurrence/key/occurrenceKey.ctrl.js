
'use strict';

/*
HEADLINE with batch infos
MAP LOCATION
SUMMARY + FREE?
FREE? COMPOSED? e.g. last seen in area OR estimated temperature OR species traits OR suspicious data
MEDIA
SIMILAR
DETAILS
GBIF SPECIFIC INFO
*/

var angular = require('angular');

angular
    .module('portal')
    .controller('occurrenceKeyCtrl', occurrenceKeyCtrl);

/** @ngInject */
function occurrenceKeyCtrl(Occurrence, leafletData, SimilarOccurrence, OccurrenceVerbatim, env, moment, $http, $anchorScroll, $location, hotkeys) {
    var vm = this;
    vm.mediaExpand = {
        isExpanded: false
    };
    vm.mediaItems = {};
    vm.dataApi = env.dataApi;
    vm.similarities = {
        similarRecords: []
    };
    vm.hideDetails = true;

    vm.SimilarOccurrence = SimilarOccurrence;//.getSimilar({TAXONKEY: 2435146});
    vm.center = {zoom: 9, lat: 0, lng: 0};
    vm.markers = {};
    var accessToken = 'pk.eyJ1IjoiZ2JpZiIsImEiOiJjaWxhZ2oxNWQwMDBxd3FtMjhzNjRuM2lhIn0.g1IE8EfqwzKTkJ4ptv3zNQ';

    vm.highlights = {
        issues: {
            expanded: false
        }
    };
    vm.tiles = {
        "name": "Outdoor",
        "url": "https://api.mapbox.com/v4/mapbox.outdoors/{z}/{x}/{y}.png?access_token=" + accessToken,
        options: {
            attribution: "&copy; <a href='https://www.mapbox.com/'>Mapbox</a> <a href='http://www.openstreetmap.org/copyright' target='_blank'>OpenStreetMap contributors</a>",
            detectRetina: false //TODO can this be fixed? Currently the mapbox retina tiles have such a small text size that I'd prefer blurry maps that I can read
        },
        type: 'xyz',
        layerOptions: {
            "showOnSelector": false,
            palette: 'yellows_reds'
        }
    };
    vm.mapDefaults = {
        zoomControlPosition: 'topleft',
        scrollWheelZoom: false
   };
   vm.mapEvents = {
        map: {
            enable: [], //https://github.com/tombatossals/angular-leaflet-directive/issues/1033
            logic: 'broadcast'
        },
        marker: {
            enable: [],
            logic: 'broadcast'
        }
    };
    vm.controls = {
        scale: true
    };

    vm.paths =  {

    };

    vm.markerMessage = {
        template: '<dl class="occurrenceKey__markerMessage">{{coordinateUncertainty}}{{elevation}}{{weather}}</dl>',
        coordinateUncertaintyTemplate: '<dt>Coordinate uncertainty</dt><dd>{{coordinateUncertainty}}m</dd>',
        weatherTemplate: '<dt>Temperature<span>from Forecast.io</span></dt><dd>{{temperatureMin}}&deg;c to {{temperatureMax}}&deg;c</dd>',
        elevationTemplate: '<dt>Elevation<span>{{elevationSource}}</span></dt><dd>{{elevation}}</dd>',
        weather: undefined,
        elevation: undefined
    };
    vm.updateMarkerMessage = function() {
        var message, weather = '', elevation = '', coordinateUncertainty = '';

        if (vm.data.coordinateUncertaintyInMeters) {
            coordinateUncertainty = vm.markerMessage.coordinateUncertaintyTemplate.replace('{{coordinateUncertainty}}', vm.data.coordinateUncertaintyInMeters);
        }

        if (vm.markerMessage.weather) {
            var dayWeather = vm.markerMessage.weather.daily.data[0];
            var temperatureMin = dayWeather.temperatureMin;
            var temperatureMax = dayWeather.temperatureMax;
            weather = vm.markerMessage.weatherTemplate.replace('{{temperatureMin}}', temperatureMin).replace('{{temperatureMax}}', temperatureMax);
        }

        if (vm.markerMessage.elevation) {
            var e = vm.markerMessage.elevation.elevation + 'm';
            var source = vm.markerMessage.elevation.source || '';
            elevation = vm.markerMessage.elevationTemplate.replace('{{elevation}}', e).replace('{{elevationSource}}', source);
        }

        if (weather || elevation || coordinateUncertainty) {
            message = vm.markerMessage.template.replace('{{weather}}', weather).replace('{{elevation}}', elevation).replace('{{coordinateUncertainty}}', coordinateUncertainty);
            vm.markers.taxon.message = message;
        }
    };

    vm.tilePosStyle = {};
    vm.data;
    vm.table = {
        filter: undefined
    };

    hotkeys.add({
        combo: 'alt+d',
        description: 'Show record details',
        callback: function() {
            vm.hideDetails = !vm.hideDetails;
            vm.expandMore = false;
        }
    });

    vm.setData = function() {
        //TODO find a better way to parse required data to controller from server without seperate calls
        vm.occurrenceCoreTerms = gb.occurrenceCoreTerms;
        vm.verbatim = gb.occurrenceRecordVerbatim;
        vm.data = gb.occurrenceRecord;
        setMap(vm.data);
        if (typeof vm.data.elevation !== 'undefined') {
            vm.markerMessage.elevation = {
                elevation: vm.data.elevation,
                elevationAccuracy: vm.data.elevationAccuracy
            };
            vm.updateMarkerMessage();
        } else {
            getElevation(vm.data.decimalLatitude, vm.data.decimalLongitude);
        }
        getWeather(vm.data.decimalLatitude, vm.data.decimalLongitude, vm.data.eventDate);
    };

    vm.weather = {};
    function getWeather(lat, lng, date) {
        if (lat && lng && date) {
            date = moment(date).unix();
            var weatherUrl = '/api/weather/' + lat + '/' + lng + '/' + date;
            $http.get(weatherUrl).then(
                function(response){
                    vm.markerMessage.weather = response.data;
                    vm.updateMarkerMessage();
                },
                function(){
                    //ignore api errors as this is supplemental data. fail silently
                }
            );
        }
    }

    function getElevation(lat, lng) {
        if (lat && lng) {
            var query = {
                shape: [
                    {
                        lat: lat, lon: lng
                    }
                ],
                range: false
            };

             var elevationApi = 'https://elevation.mapzen.com/height?api_key=elevation-u7RCaXn&json=' + JSON.stringify(query);
             $http.get(elevationApi).then(
                 function(response){
                     vm.markerMessage.elevation = {
                         elevation: response.data.height[0],
                         source: 'from Mapzen.com'
                     };
                     vm.updateMarkerMessage();
                 },
                 function(){
                     //ignore api errors as this is supplemental data. fail silently
                 }
             );
        }
    }

    function setMap(data) {
        if (typeof data.decimalLatitude === 'undefined' || typeof data.decimalLongitude === 'undefined') {
            return
        }

        vm.markers.taxon = {
            //group: 'similar',
            lat: data.decimalLatitude,
            lng: data.decimalLongitude,
            focus: false
        };
        //if (data.verbatimLocality) {
        //    vm.markers.taxon.message = '<p>'+data.verbatimLocality+'</p>';
        //}
        vm.center = {
            zoom: 10,
            lat: data.decimalLatitude,
            lng: data.decimalLongitude
        };

        if (data.coordinateUncertaintyInMeters > 50) {
            vm.paths.c1 = {
                weight: 2,
                color: '#ff612f',
                latlngs: {
                    lat: data.decimalLatitude,
                    lng: data.decimalLongitude
                },
                radius: data.coordinateUncertaintyInMeters,
                type: 'circle'
            };
        }
        //set static marker
        leafletData.getMap('occurrenceMap').then(function(map) {
            //find similar records (same species, same time, same area). This gives context and can tell us whether there are possible duplicates or several people reporting the same individual
            // Useful examples as of april 2016: 195092389
            // vm.SimilarOccurrence.getSimilar(
            //     {
            //         geometry: map.getBounds(),
            //         taxonkey: data.taxonKey,
            //         eventdate: data.eventDate
            //     },
            //     data.key,
            //     function(data) {
            //         vm.similarities.similarRecords = data.results;
            //         var markers = vm.SimilarOccurrence.getMarkers(data, {
            //             key: vm.data.key,
            //             eventDate: vm.data.eventDate,
            //             decimalLatitude: vm.data.decimalLatitude,
            //             decimalLongitude: vm.data.decimalLongitude
            //         });
            //         markers.forEach(function(e, i) {
            //             vm.markers['marker_' + i] = e;
            //         });
            //     }
            // );

            var a= L.latLng(data.decimalLatitude, data.decimalLongitude);
            var projPos = map.project(a, 0);
            vm.tilePosStyle = {
                left: projPos.x/2.56 + '%',
                top: projPos.y/2.56 + '%',
                display: 'block'
            };
            map.once('focus', function() { map.scrollWheelZoom.enable(); });
        });
    }
}

module.exports = occurrenceKeyCtrl;