'use strict';

var	resource = require('../resource'),
    api = require('../apiConfig');

var Dataset = function (record) {
    this.record = record;
};

Dataset.prototype.record = {};

Dataset.get = function (key, options) {
    options = options || {};
    var promise = resource.get(api.dataset.url + key).as(Dataset);
    if (typeof options.expand === 'undefined') {
        return promise;
    } else {
        return promise.then(function(dataset) {
            return dataset.expand(options.expand)
        });
    }
};

Dataset.prototype.expand = function (fieldNames) {
    // TODO check whether the process endpoint shows the status in real-time.
    var resources = [],
        resourceLookup = {
            publisher: {
                resource: api.publisher.url + this.record.publishingOrganizationKey,
                extendToField: 'publisher'
            },
            installation: {
                resource: api.installation.url + this.record.installationKey,
                extendToField: 'installation'
            },
            occurrenceCount: {
                resource: api.occurrence.url + 'count?datasetKey=' + this.record.key,
                extendToField: 'occurrenceCount'
            },
            occurrenceGeoRefCount: {
                resource: api.occurrence.url + 'count?isGeoreferenced=true&datasetKey=' + this.record.key,
                extendToField: 'occurrenceGeoRefCount'
            },
            process: {
                resource: api.dataset.url + this.record.key + '/process?limit=1',
                extendToField: 'process'
            }
        };
    fieldNames.forEach(function(e) {
        if (resourceLookup.hasOwnProperty(e)) resources.push(resourceLookup[e]);
    });
    return resource.extend(this).with(resources);
};

module.exports = Dataset;
