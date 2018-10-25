module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    webpack: {
      dist: require('./webpack.config.js'),
    },
    cssmin: {
      dist: {
        src: ['css/style.css'],
        dest: 'dist/style.min.css',
      },
    },
    imagemin: {
      dist: {
        src: ['images/sprites.png'],
        dest: 'dist/sprites.png',
      },
      options: {
        optimizationLevel: 7,
      },
    },
    copy: {
      dist: {
        src: 'index.html',
        dest: 'dist/index.html',
      },
    },
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-imagemin');
  grunt.loadNpmTasks('grunt-webpack');

  grunt.registerTask('default', ['webpack', 'cssmin', 'imagemin', 'copy']);
};
