'use strict';

var gulp = require('gulp'),
    fs = require('fs'),
    config = rootRequire('config/build'),
    g = require('gulp-load-plugins')();

function lintNotify(file) {
    if (file.eslint.errorCount > 0) {
        return {
            title: 'Linting error',
            message: 'See console',
            onLast: true
        };
    }
}

gulp.task('server-lint', ['client-lint'], function() {
    return gulp.src(config.js.server.paths.concat( ['!**/*.spec.js'] ))
        .pipe(g.eslint())
        .pipe(g.eslint.format()) // stdout
        .pipe(g.eslint.format('checkstyle', fs.createWriteStream('reports/checkstyle_server.xml')))
        .pipe(g.if(!config.isProd, g.notify(lintNotify), g.util.noop()));
});

gulp.task('client-lint', function() {
    return gulp.src(config.js.client.paths)
        .pipe(g.eslint())
        .pipe(g.eslint.format()) // stdout
        .pipe(g.eslint.format('checkstyle', fs.createWriteStream('reports/checkstyle_client.xml')))
        .pipe(g.if(!config.isProd, g.notify(lintNotify), g.util.noop()));
});