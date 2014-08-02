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
      minify: {
        src: ['style.css'],
        dest: 'dist/style.min.css',
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
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-htmlrefs');

  grunt.registerTask('default', ['jshint', 'concat', 'uglify', 'cssmin', 'htmlrefs']);
};
