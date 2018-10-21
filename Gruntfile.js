module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      files: ['*.js', 'lib/*.js', 'app/js/*.js'],
      options: {
        esnext: true,
      },
    },
    webpack: {
      dist: require('./app/webpack.config.js'),
    },
    cssmin: {
      dist: {
        src: ['app/css/style.css'],
        dest: 'app/dist/style.min.css',
      },
    },
    imagemin: {
      dist: {
        src: ['app/images/sprites.png'],
        dest: 'app/dist/sprites.png',
      },
      options: {
        optimizationLevel: 7,
      },
    },
    copy: {
      dist: {
        src: 'app/index.html',
        dest: 'app/dist/index.html',
      },
    },
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-imagemin');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-webpack');

  grunt.registerTask('default', ['jshint', 'webpack', 'cssmin', 'imagemin', 'copy']);
};
