module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      files: ['src/*.js'],
      options: {
        esnext: true,
      },
    },
    webpack: {
      dist: require('./webpack.config.js'),
    },
    copy: {
      dist: {
        expand: true,
        flatten: true,
        src: ['package.json', 'README.md', '../LICENSE'],
        dest: 'dist/',
      },
    },
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-webpack');

  grunt.registerTask('default', ['jshint', 'webpack', 'copy']);
};
