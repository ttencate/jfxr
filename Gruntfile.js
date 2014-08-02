module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      files: ['Gruntfile.js', 'src/**/*.js', 'test/**/*.js'],
      options: {
      },
    },
    concat: {
      options: {
        nonull: true,
        separator: ';',
        sourceMap: true,
      },
      dist: {
        src: ['src/**/*.js'],
        dest: 'dist/jfxr.js'
      },
    },
    uglify: {
      options: {
        sourceMap: true,
      },
      dist: {
        files: {
          'dist/jfxr.min.js': ['<%= concat.dist.dest %>']
        },
      },
    },
    cssmin: {
      dist: {
        src: ['style.css'],
        dest: 'dist/style.min.css',
      },
    },
    imagemin: {
      dist: {
        src: ['sprites.png'],
        dest: 'dist/sprites.png',
      },
      options: {
        optimizationLevel: 7,
      },
    },
    htmlrefs: {
      dist: {
        src: 'index.html',
        dest: 'dist/index.html',
      },
    },
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-imagemin');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-htmlrefs');

  grunt.registerTask('default', ['jshint', 'concat', 'uglify', 'cssmin', 'imagemin', 'htmlrefs']);
};
